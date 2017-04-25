'use strict';
const fs = require('fs');

function decompress(inFileName, outFileName) {
    fs.readFile(inFileName, (err, buf) => {
        let dSize = buf.readUInt32LE(4);
        let zSize = buf.readUInt32LE(8);
        let flag  = buf.readUInt32LE(12);

        let out = new Buffer(dSize);
        let z = 12;
        let d = 0;

        let jump, recover;

        while (z < zSize) {
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

        fs.writeFile(outFileName, out, function(err) {
            if (err) console.error(err);
            else console.log('File decompressed');
        });
    });
}

decompress('start.lzs', 'start.dat');
