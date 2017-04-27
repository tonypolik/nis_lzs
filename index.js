'use strict';
const fs = require('fs');
const path = require('path');

function decompressBuffer(buf) {
    let extension = buf.toString('utf8', 0, 3);
    let dSize = buf.readUInt32LE(4);
    let zSize = buf.readUInt32LE(8);
    let flag  = buf.readUInt32LE(12);

    let out = Buffer.allocUnsafe(dSize);
    let z = 16;
    let d = 0;

    let jump, r, recover;

    while (z < zSize - 4) {
        let byte = buf[z];
        if (byte === flag) {
            if (buf[z + 1] === flag) {
                out[d] = flag;
                d += 1;
                z += 2;
            } else {
                jump = buf[z + 1];
                if (jump > flag) jump--;
                recover = buf[z + 2];
                for (r = 0; r < recover; r++) {
                    out[d + r] = out[d - jump + r];
                }
                z += 3;
                d += recover;
            }
        } else {
            out[d] = byte;
            d++;
            z++;
        }
    }

    return {
        buffer: out,
        extension: extension
    };
}

function decompress(inFileName, outFileName) {
    fs.readFile(inFileName, (err, buf) => {
        let {buffer, extension} = decompressBuffer(buf);

        if (!outFileName) {
            let lzsExtension = path.extname(inFileName);
            let baseName = path.basename(inFileName, lzsExtension);
            outFileName = `${baseName}.${extension}`;
        }

        fs.writeFile(outFileName, buffer, function(err) {
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

            let byte = buf[d++];
            if (byte === flag) {
                temp[z++] = byte;
            }
            temp[z++] = byte;

        } else {

            temp[z++] = flag;
            temp[z++] = (jump >= flag) ? jump + 1 : jump;
            temp[z++] = recover;
            d += recover;

        }

    }

    let header = Buffer.alloc(16);
    header.write(ext, 0, 4);
    header.writeUInt32LE(dSize, 4);
    header.writeUInt32LE(z + 12, 8);
    header.writeUInt32LE(flag, 12);

    let lzs = Buffer.alloc(z);
    temp.copy(lzs, 0, 0, z);

    return Buffer.concat([header, lzs]);
}

function compress(inFileName, outFileName) {
    fs.readFile(inFileName, (err, buf) => {
        let extension = path.extname(inFileName);
        if (!outFileName) {
            let baseName = path.basename(inFileName, extension);
            outFileName = `${baseName}.lzs`;
        }
        let out = compressBuffer(buf, extension.replace('.', ''));
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



