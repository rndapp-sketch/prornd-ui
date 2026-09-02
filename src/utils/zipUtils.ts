// -----------------------------------------------------------------------
// Pure TypeScript Zip Utility (Zero external dependencies)
// Creates standard uncompressed (STORE) ZIP archives containing folder structures.
// -----------------------------------------------------------------------

function buildCrcTable(): Uint32Array {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c;
    }
    return table;
}

const crcTable = buildCrcTable();

function calculateCrc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileEntry {
    path: string; // e.g. "Rahul_Sharma_28-08-2026/ID_Card_Front.png"
    data: Uint8Array;
}

export function createZipArchive(files: ZipFileEntry[]): Blob {
    const localHeaders: Uint8Array[] = [];
    const centralDirectoryHeaders: Uint8Array[] = [];

    let offset = 0;
    const encoder = new TextEncoder();

    for (const file of files) {
        const pathBytes = encoder.encode(file.path);
        const dataBytes = file.data;
        const crc = calculateCrc32(dataBytes);
        const size = dataBytes.length;

        // Local File Header (30 bytes + path length + data length)
        const localHeader = new Uint8Array(30 + pathBytes.length + size);
        const localView = new DataView(localHeader.buffer);

        localView.setUint32(0, 0x04034b50, true); // Signature
        localView.setUint16(4, 20, true); // Version needed (2.0)
        localView.setUint16(6, 0, true); // General bit flag
        localView.setUint16(8, 0, true); // Compression method (0 = Store)
        localView.setUint16(10, 0, true); // Last mod time
        localView.setUint16(12, 0, true); // Last mod date
        localView.setUint32(14, crc, true); // CRC32
        localView.setUint32(18, size, true); // Compressed size
        localView.setUint32(22, size, true); // Uncompressed size
        localView.setUint16(26, pathBytes.length, true); // Filename length
        localView.setUint16(28, 0, true); // Extra field length

        localHeader.set(pathBytes, 30);
        localHeader.set(dataBytes, 30 + pathBytes.length);
        localHeaders.push(localHeader);

        // Central Directory Header (46 bytes + path length)
        const cdHeader = new Uint8Array(46 + pathBytes.length);
        const cdView = new DataView(cdHeader.buffer);

        cdView.setUint32(0, 0x02014b50, true); // Signature
        cdView.setUint16(4, 20, true); // Version made by
        cdView.setUint16(6, 20, true); // Version needed
        cdView.setUint16(8, 0, true); // Bit flag
        cdView.setUint16(10, 0, true); // Compression method
        cdView.setUint16(12, 0, true); // Last mod time
        cdView.setUint16(14, 0, true); // Last mod date
        cdView.setUint32(16, crc, true); // CRC32
        cdView.setUint32(20, size, true); // Compressed size
        cdView.setUint32(24, size, true); // Uncompressed size
        cdView.setUint16(28, pathBytes.length, true); // Filename length
        cdView.setUint16(30, 0, true); // Extra field length
        cdView.setUint16(32, 0, true); // Comment length
        cdView.setUint16(34, 0, true); // Disk number start
        cdView.setUint16(36, 0, true); // Internal file attributes
        cdView.setUint32(38, 0, true); // External file attributes
        cdView.setUint32(42, offset, true); // Relative offset of local header

        cdHeader.set(pathBytes, 46);
        centralDirectoryHeaders.push(cdHeader);

        offset += localHeader.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const cd of centralDirectoryHeaders) {
        cdSize += cd.length;
    }

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);

    eocdView.setUint32(0, 0x06054b50, true); // Signature
    eocdView.setUint16(4, 0, true); // Disk number
    eocdView.setUint16(6, 0, true); // Disk with central dir
    eocdView.setUint16(8, files.length, true); // Entries on this disk
    eocdView.setUint16(10, files.length, true); // Total entries
    eocdView.setUint32(12, cdSize, true); // Central dir size
    eocdView.setUint32(16, cdOffset, true); // Central dir offset
    eocdView.setUint16(20, 0, true); // Comment length

    const totalParts = [...localHeaders, ...centralDirectoryHeaders, eocd];
    return new Blob(totalParts as BlobPart[], { type: 'application/zip' });
}
