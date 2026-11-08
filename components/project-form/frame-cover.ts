import { MAX_IMAGE_BYTES } from "@/lib/media-standard";

/** Center-crop a fetched image into a 16:9 cover. */
export async function frameCover(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth < 120 || image.naturalHeight < 80) return null;
    const width = 1920;
    const height = 1080;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob || blob.size > MAX_IMAGE_BYTES) return null;
    return new File([blob], "cover.webp", { type: "image/webp" });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = url;
  });
}
