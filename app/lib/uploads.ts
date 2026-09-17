import path from "node:path";

/** Directory where admin uploads are stored on disk. */
export function getUploadsDir() {
  return path.join(process.cwd(), "public", "uploads");
}

/** Public URL for an uploaded photo (served at runtime, not via Next public map). */
export function uploadedImageUrl(filename: string) {
  return `/api/uploads/${encodeURIComponent(filename)}`;
}

/** Resolve a safe absolute path inside the uploads dir (blocks path traversal). */
export function resolveUploadPath(filename: string) {
  const safeName = path.basename(filename);
  if (!safeName || safeName === "." || safeName === "..") {
    return null;
  }

  const uploadsDir = getUploadsDir();
  const fullPath = path.join(uploadsDir, safeName);
  if (!fullPath.startsWith(uploadsDir + path.sep) && fullPath !== uploadsDir) {
    return null;
  }

  return fullPath;
}
