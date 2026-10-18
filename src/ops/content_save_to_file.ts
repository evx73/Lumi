import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import fsPromises from 'fs/promises';
import { finished } from 'stream/promises';
import * as H5P from '@lumieducation/h5p-server';

import { Context } from '../boot';
import User from '../models/User';

export default async function content_save_to_file(
  ctx: Context,
  content_id: string,
  filePath: string
): Promise<void> {
  ctx.log.debug(`ops:content_save_to_file`, {
    content_id,
    path: filePath
  });

  const parsed = path.parse(filePath);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp =
    now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' +
    pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '-' +
    String(now.getMilliseconds()).padStart(3, '0');
  const baseName = parsed.name.replace(/(?:-\d{8}-\d{6}-\d{3})+$/, '');
  const versionPath = path.join(parsed.dir, `${baseName}-${timestamp}${parsed.ext || '.h5p'}`);
  const tempPath = versionPath + '.tmp';
  const stream = fs.createWriteStream(tempPath, { flags: 'wx' });
  const streamFinished = finished(stream);
  const packageExporter = new H5P.PackageExporter(
    ctx.h5pEditor.libraryManager,
    ctx.h5pEditor.contentStorage,
    ctx.h5pEditor.config
  );

  try {
    await packageExporter.createPackage(content_id, stream, new User());

    // We wait for the writable stream and surface stream errors before replacing
    // the existing file.
    await streamFinished;
    // Verify the H5P ZIP before keeping the timestamped version.
    execFileSync('C:\\Program Files\\7-Zip\\7z.exe', ['t', tempPath], { stdio: 'pipe' });
    await fsPromises.rename(tempPath, versionPath);
  } catch (error) {
    stream.destroy();
    try {
      await streamFinished;
    } catch {
      // Silently ignore errors from the stream, as we're already handling the main error
    }
    await fsPromises.rm(tempPath, { force: true });
    throw error;
  }
}
