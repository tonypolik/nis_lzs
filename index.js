'use strict';
const fs = require('fs');

function decompressBuffer(buf) {
    let dSize = buf.readUInt32LE(4);
    let zSize = buf.readUInt32LE(8);
    let flag  = buf.readUInt32LE(12);

    let out = Buffer.allocUnsafe(dSize);
    let z = 16;
    let d = 0;

    let jump, recover;

    while (z < zSize - 4) {
        let byte = buf.readUInt8(z);
        if (byte === flag) {
            if (buf.readUInt8(z + 1) === flag) {
                out.writeUInt8(flag, d);
                d += 1;
                z += 2;
            } else {
                jump = buf.readUInt8(z + 1);
                if (jump > flag) jump--;
                recover = buf.readUInt8(z + 2);
                out.slice(-jump, -jump +recover).copy(out, d);
                z += 3;
                d += recover;
            }
        } else {
            out.writeUInt8(byte, d);
            d++;
            z++;
        }
    }

    return out;
}

function decompress(inFileName, outFileName) {
    fs.readFile(inFileName, (err, buf) => {
        let out = decompressBuffer(buf);
        fs.writeFile(outFileName, out, function(err) {
            if (err) console.error(err);
            else console.log('File decompressed');
        });
    });
}

function compressBuffer(buf, ext = 'dat') {

    let dSize = buf.byteLength;
    let flag = 0xE1;

    let d = 0;
    let z = 0;

    // * 2 ? So lazy
    let temp = Buffer.allocUnsafe(dSize * 2);

    while (d < dSize) {

        let start = (d < 255) ? 0 : d - 254;
        let jump = 0;
        let recover = 3;
        while (start < d - 3) {
            if (buf[start] === buf[d]) {
                let r = 1;
                while (buf[start + r] === buf[d + r] && start + r < d) r++;
                if (r >= recover) {
                    jump = d - start;
                    recover = r;
                }
            }
            start++;
        }

        if (recover < 4) {

            let byte = buf.readUInt8(d++);
            if (byte === flag) {
                temp.writeUInt8(byte, z++);
            }
            temp.writeUInt8(byte, z++);

        } else {

            temp.writeUInt8(flag, z++);
            temp.writeUInt8((jump >= flag) ? jump + 1 : jump, z++);
            temp.writeUInt8(recover, z++);
            d += recover;

        }

    }

    let header = Buffer.alloc(16);
    header.write(ext, 0);
    header.writeUInt32LE(dSize, 4);
    header.writeUInt32LE(z + 12, 8);
    header.writeUInt32LE(flag, 12);

    let lzs = Buffer.alloc(z);
    temp.copy(lzs, 0, 0, z);

    return Buffer.concat([header, lzs]);
}

function compress(inFileName, outFileName) {
    fs.readFile(inFileName, (err, buf) => {
        let out = compressBuffer(buf);
        fs.writeFile(outFileName, out, function(err) {
            if (err) console.error(err);
            else console.log('File compressed');
        });
    });
}

module.exports = {
    decompressBuffer,
    decompress,
    compressBuffer,
    compress
};

const program = require('commander');
program
    .arguments('<command> <infile> <outfile>')
    .action((command, infile, outfile) => {
        if (command === 'compress') {
            compress(infile, outfile);
        } else if (command === 'decompress') {
            decompress(infile, outfile);
        }
    })
    .parse(process.argv);

