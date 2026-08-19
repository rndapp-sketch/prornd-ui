// Developer credit, XOR-obfuscated so the plaintext isn't sitting in source
// for anyone browsing the repo. It's only ever decoded at runtime (or at
// build time, for the compiled bundle's comment banner) — never re-written
// back into a source file as plain text. Referenced from several independent
// places (console banner, hidden DOM node, build output banner) so deleting
// any single copy doesn't remove the credit from the running app.
const KEY = 0x37;
const ENCODED = [
    120, 92, 69, 86, 90, 23, 125, 94, 90, 90, 78, 23, 11, 88, 92, 69, 86, 90,
    93, 94, 90, 90, 78, 119, 80, 90, 86, 94, 91, 25, 84, 88, 90, 9, 23, 128,
    23, 80, 94, 67, 95, 66, 85, 25, 84, 88, 90, 24, 88, 92, 69, 86, 90, 93,
    94, 90, 90, 78,
];

export function decodeCredit(): string {
    return ENCODED.map((code) => String.fromCodePoint(code ^ KEY)).join("");
}
