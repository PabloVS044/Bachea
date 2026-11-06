import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { MAX_UPLOAD_BYTES, PHOTO_BUCKET } from "@/lib/config";
import { serviceClient } from "@/lib/supabase/service";

export class ImageError extends Error {}

/** Valida el contenido real y reescribe la imagen: esto elimina EXIF (incluido GPS de la foto). */
export async function normalizeImage(file: File) {
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new ImageError("Cada foto debe pesar menos de 5 MB.");
  }
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const image = sharp(input, { limitInputPixels: 50_000_000 });
    const { format } = await image.metadata();
    if (!format || !["jpeg", "png", "webp"].includes(format)) {
      throw new ImageError("Usa fotos JPG, PNG o WebP.");
    }
    return await image
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (e) {
    if (e instanceof ImageError) throw e;
    throw new ImageError("Una de las fotos no se pudo leer. Prueba con otra.");
  }
}

export async function storePhoto(reportId: string, data: Buffer) {
  const path = `${reportId}/${randomUUID()}.webp`;
  const { error } = await serviceClient().storage.from(PHOTO_BUCKET).upload(path, data, {
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) throw new Error(`storage: ${error.message}`);
  return path;
}

export async function signPhotos(paths: string[]) {
  const urls = new Map<string, string>();
  if (!paths.length) return urls;
  const { data, error } = await serviceClient().storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
  if (error) {
    console.error("signPhotos", error.message);
    return urls;
  }
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
