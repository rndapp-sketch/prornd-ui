// Fonts for the ID card PNG/PDF export. html-to-image rasterises through an
// SVG foreignObject, which can't use the page's fonts unless they are inlined,
// and it can't read the cross-origin Google Fonts CSS. Windows/macOS have no
// Noto Sans installed, so the export fell back to a wider font than the live
// preview and the text got clipped. We bundle the files and inline them as
// data URLs so every OS rasterises the same glyph widths.

const FACES = [
  { family: "Noto Sans", weight: 400, file: "NotoSans-Regular.ttf" },
  { family: "Noto Sans", weight: 700, file: "NotoSans-Bold.ttf" },
  { family: "Noto Sans", weight: 800, file: "NotoSans-ExtraBold.ttf" },
  { family: "Noto Sans Devanagari", weight: 400, file: "NotoSansDevanagari-Regular.ttf" },
  { family: "Noto Sans Devanagari", weight: 700, file: "NotoSansDevanagari-Bold.ttf" },
  { family: "Noto Sans Devanagari", weight: 800, file: "NotoSansDevanagari-ExtraBold.ttf" },
];

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

let cached: Promise<string> | null = null;

export const getIdCardFontEmbedCSS = (): Promise<string> => {
  if (!cached) {
    const base = `${import.meta.env.BASE_URL}fonts/noto/`;
    cached = Promise.all(
      FACES.map(async ({ family, weight, file }) => {
        const res = await fetch(base + file);
        if (!res.ok) throw new Error(`Font ${file} failed to load`);
        const url = await toDataUrl(await res.blob());
        return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url(${url}) format('truetype');}`;
      })
    ).then((rules) => rules.join("\n"));
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
};

// Make sure the document itself uses the same files, so the live preview, the
// fit-to-width measurement and the export all agree.
let docFonts: Promise<void> | null = null;

export const loadIdCardFontsInDocument = (): Promise<void> =>
  (docFonts ??= loadFontsOnce());

const loadFontsOnce = async (): Promise<void> => {
  if (typeof document === "undefined" || !document.fonts) return;
  const base = `${import.meta.env.BASE_URL}fonts/noto/`;
  await Promise.all(
    FACES.map(async ({ family, weight, file }) => {
      const face = new FontFace(family, `url(${base}${file})`, {
        weight: String(weight),
      });
      try {
        document.fonts.add(await face.load());
      } catch {
        /* fall back to whatever is installed */
      }
    })
  );
};
