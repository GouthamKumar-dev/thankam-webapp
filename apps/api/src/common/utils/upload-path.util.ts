import { existsSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

export function resolveUploadDirectory(uploadLocalDir: string) {
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

