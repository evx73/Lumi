import fs from 'fs/promises';
import { fileURLToPath } from 'url';

/** Restore local references stripped by H5P's package import validation. */
export default async function restoreLinkedImages(
  packagePath: string,
  parameters: any
): Promise<void> {
  const yauzl = require('yauzl');
  const original: any = await new Promise((resolve, reject) => {
    yauzl.open(packagePath, { lazyEntries: true }, (openError: Error, zip: any) => {
      if (openError) { reject(openError); return; }
      zip.readEntry();
      zip.on('entry', (entry: any) => {
        if (entry.fileName !== 'content/content.json') { zip.readEntry(); return; }
        zip.openReadStream(entry, (streamError: Error, stream: any) => {
          if (streamError) { zip.close(); reject(streamError); return; }
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => {
            zip.close();
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
            catch (error) { reject(error); }
          });
          stream.on('error', reject);
        });
      });
      zip.on('end', () => reject(new Error('Missing content/content.json')));
      zip.on('error', reject);
    });
  });

  async function restore(source: any, target: any): Promise<void> {
    if (!source || !target || typeof source !== 'object' || typeof target !== 'object') return;
    if (typeof source.path === 'string' && source.path.startsWith('file:///') &&
        typeof target.path === 'string' && target.path === '') {
      try {
        await fs.access(fileURLToPath(source.path));
        target.path = source.path;
      } catch { /* Keep H5P's sanitized path if original file is missing. */ }
    }
    if (Array.isArray(source) && Array.isArray(target)) {
      await Promise.all(source.map((item, index) => restore(item, target[index])));
    } else {
      await Promise.all(Object.keys(source).map((key) => restore(source[key], target[key])));
    }
  }
  await restore(original, parameters);
}
