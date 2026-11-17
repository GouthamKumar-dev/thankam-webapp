import { existsSync, promises as fsPromises } from 'fs';
import { basename, isAbsolute, join, resolve } from 'path';

export function resolveUploadDirectory(uploadLocalDir: string): string {
  if (isAbsolute(uploadLocalDir)) {
    return uploadLocalDir;
  }

  const cwdDir = resolve(process.cwd(), uploadLocalDir);
  const apiDir = resolve(process.cwd(), 'apps', 'api', uploadLocalDir);

  if (existsSync(cwdDir)) {
    return cwdDir;
  }

  if (existsSync(apiDir)) {
    return apiDir;
  }

  if (existsSync(resolve(process.cwd(), 'apps', 'api'))) {
    return apiDir;
  }

  return join(process.cwd(), uploadLocalDir);
}

/**
 * Safely extracts the base filename from an upload URL or relative path.
 * Strips domain, query params, hashes, and '/uploads/' prefix.
 * Rejects path traversal attempts.
 */
export function extractUploadFilename(fileUrlOrName?: string | null): string | null {
  if (!fileUrlOrName || typeof fileUrlOrName !== 'string') return null;

  let cleaned = fileUrlOrName.trim();
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      cleaned = new URL(cleaned).pathname;
    } catch {
      // ignore
    }
  }

  if (cleaned.includes('/uploads/')) {
    cleaned = cleaned.substring(cleaned.indexOf('/uploads/') + '/uploads/'.length);
  } else if (cleaned.startsWith('/')) {
    cleaned = cleaned.replace(/^\/+/, '');
  }

  // Strip query string or hash if present
  cleaned = cleaned.split('?')[0].split('#')[0];

  const fileName = basename(cleaned);
  if (
    !fileName ||
    fileName === '.' ||
    fileName === '..' ||
    fileName.includes('/') ||
    fileName.includes('\\')
  ) {
    return null;
  }

  return fileName;
}

/**
 * Safely deletes a file from the uploads directory if it exists.
 * Returns true if deleted, false if file did not exist or was invalid.
 */
export async function deleteUploadedFile(fileUrlOrName?: string | null): Promise<boolean> {
  const fileName = extractUploadFilename(fileUrlOrName);
  if (!fileName) return false;

  try {
    const uploadDir = resolveUploadDirectory(process.env.UPLOAD_LOCAL_DIR ?? 'uploads');
    const fullPath = resolve(uploadDir, fileName);

    // Prevent directory traversal outside uploadDir
    if (!fullPath.startsWith(resolve(uploadDir))) {
      return false;
    }

    if (existsSync(fullPath)) {
      await fsPromises.unlink(fullPath);
      return true;
    }
  } catch (error) {
    console.warn(`[Upload] Failed to delete file "${fileUrlOrName}":`, error);
  }
  return false;
}


