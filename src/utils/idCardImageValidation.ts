// Client-side checks for the ID card photo and signature uploads. They back the
// guidelines shown on the ID Card Request form: file type, size, resolution,
// plain light background, and (for the signature) visible ink.

export type IdCardImageField = "photo_path__" | "sign_path__";

const RULES = {
    photo_path__: {
        name: "Photo",
        maxBytes: 2 * 1024 * 1024,
        maxLabel: "2MB",
        minWidth: 200,
        minHeight: 236,
    },
    sign_path__: {
        name: "Signature",
        maxBytes: 1024 * 1024,
        maxLabel: "1MB",
        minWidth: 300,
        minHeight: 60,
    },
} as const;

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXT = /\.(jpe?g|png)$/i;

const loadImage = (file: File): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("decode"));
        };
        img.src = url;
    });

const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Checks that can be made on the file the user picked, before cropping. */
export async function validatePickedImage(field: IdCardImageField, file: File): Promise<string[]> {
    const rule = RULES[field];
    const errors: string[] = [];

    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.test(file.name)) {
        errors.push(`${rule.name} must be a JPEG or PNG image.`);
        return errors;
    }
    if (file.size > rule.maxBytes) {
        errors.push(
            `${rule.name} must be ${rule.maxLabel} or smaller. The selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
        );
    }
    try {
        const img = await loadImage(file);
        if (img.naturalWidth < rule.minWidth || img.naturalHeight < rule.minHeight) {
            errors.push(
                `${rule.name} resolution is too low (${img.naturalWidth}×${img.naturalHeight}px). It must be at least ${rule.minWidth}×${rule.minHeight}px.`,
            );
        }
    } catch {
        errors.push(`${rule.name} could not be read. Please choose a valid JPEG or PNG image.`);
    }
    return errors;
}

/** Checks on the final cropped image: background, brightness and (signature) ink. */
export async function validateCroppedImage(field: IdCardImageField, file: File): Promise<string[]> {
    const rule = RULES[field];
    const errors: string[] = [];

    if (file.size > rule.maxBytes) {
        errors.push(`${rule.name} must be ${rule.maxLabel} or smaller after cropping.`);
    }

    let img: HTMLImageElement;
    try {
        img = await loadImage(file);
    } catch {
        return [...errors, `${rule.name} could not be read after cropping.`];
    }

    // Analyse a downscaled copy; the checks don't need full resolution.
    const scale = Math.min(1, 240 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return errors;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const band = Math.max(2, Math.round(Math.min(w, h) * 0.06));
    // Photo: ignore the bottom edge (shoulders / clothing); signature: all four edges.
    const isBorder = (x: number, y: number) =>
        x < band || x >= w - band || y < band || (field === "sign_path__" && y >= h - band);

    let borderSum = 0;
    let borderSpread = 0;
    let borderCount = 0;
    let lumSum = 0;
    let inkCount = 0;
    const total = w * h;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            // Treat transparent pixels as white.
            const r = a < 255 ? 255 : data[i];
            const g = a < 255 ? 255 : data[i + 1];
            const b = a < 255 ? 255 : data[i + 2];
            const l = luminance(r, g, b);
            lumSum += l;
            if (l < 110) inkCount++;
            if (isBorder(x, y)) {
                borderSum += l;
                borderSpread += Math.max(r, g, b) - Math.min(r, g, b);
                borderCount++;
            }
        }
    }

    const borderLum = borderCount ? borderSum / borderCount : 255;
    const borderColour = borderCount ? borderSpread / borderCount : 0;
    const meanLum = lumSum / total;
    const inkRatio = inkCount / total;

    if (field === "photo_path__") {
        if (borderLum < 170 || borderColour > 45) {
            errors.push("Photo background must be plain white (or very light). Please use a photo taken against a white wall or backdrop.");
        }
        if (meanLum < 55) errors.push("Photo is too dark. Please use a well-lit photo.");
        else if (meanLum > 238) errors.push("Photo looks washed out or blank. Please use a clear photo of your face.");
    } else {
        if (borderLum < 200 || borderColour > 40) {
            errors.push("Signature must be on a plain white background, with no shadows or coloured paper.");
        }
        if (inkRatio < 0.003) errors.push("No signature was detected. Please sign with a dark pen and crop closer to the signature.");
        else if (inkRatio > 0.35) errors.push("The signature area is mostly dark. Please sign on white paper and crop closer to the signature.");
    }
    return errors;
}
