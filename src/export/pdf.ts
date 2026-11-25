// A minimal single-page PDF writer: one full-bleed JPEG on a page.
//
// The app cannot open the system print dialog, so "print / save as PDF" builds
// a PDF from the same rendered paper image as the PNG and shares that file.
// Printing then goes through the iOS share sheet ("Print" / "Save to Files").

const A4_WIDTH_PT = 595.28;

const encoder = new TextEncoder();

function ascii(text: string): Uint8Array {
  return encoder.encode(text);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const fixed = (value: number) => value.toFixed(2).replace(/\.?0+$/, "");

/** Builds a one-page PDF whose page is `A4 width` wide and keeps the image's aspect ratio. */
export function buildImagePdf(jpeg: Uint8Array, pixelWidth: number, pixelHeight: number): Uint8Array {
  if (!(pixelWidth > 0 && pixelHeight > 0)) throw new Error("PDFの寸法が正しくありません。");
  const pageWidth = A4_WIDTH_PT;
  const pageHeight = (pageWidth * pixelHeight) / pixelWidth;
  const content = `q\n${fixed(pageWidth)} 0 0 ${fixed(pageHeight)} 0 0 cm\n/Im0 Do\nQ\n`;
  const objects: Uint8Array[] = [
    ascii("<< /Type /Catalog /Pages 2 0 R >>"),
    ascii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    ascii(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fixed(pageWidth)} ${fixed(pageHeight)}] ` +
        "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
    ),
    concat([
      ascii(
        `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      ascii("\nendstream"),
    ]),
    ascii(`<< /Length ${content.length} >>\nstream\n${content}endstream`),
  ];
  const parts: Uint8Array[] = [ascii("%PDF-1.4\n")];
  const offsets: number[] = [];
  let length = parts[0].length;
  objects.forEach((body, index) => {
    offsets.push(length);
    const chunk = concat([ascii(`${index + 1} 0 obj\n`), body, ascii("\nendobj\n")]);
    parts.push(chunk);
    length += chunk.length;
  });
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  parts.push(
    ascii(xref + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`),
  );
  return concat(parts);
}

/** Re-encodes a rendered PNG as JPEG on white (the paper has no transparency). */
export async function pngToJpeg(png: Blob, quality = 0.92): Promise<{ jpeg: Uint8Array; width: number; height: number }> {
  const bitmap = await createImageBitmap(png);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PDFを作成できませんでした。軽量版をお試しください。");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("PDFを作成できませんでした。軽量版をお試しください。"))),
        "image/jpeg",
        quality,
      ),
    );
    return { jpeg: new Uint8Array(await blob.arrayBuffer()), width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export async function pngBlobToPdf(png: Blob): Promise<Blob> {
  const { jpeg, width, height } = await pngToJpeg(png);
  return new Blob([buildImagePdf(jpeg, width, height) as BlobPart], { type: "application/pdf" });
}
