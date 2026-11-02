import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/** Replace linked local image URLs (including H5P's ./index/file:/ prefix) with exported media. */
export default async function exportLinkedImages(
  html: string,
  outputPath: string,
  externalDirectory?: string,
  externalPrefix?: string
): Promise<string> {
  const pattern = /(?:\.\/[A-Za-z0-9_-]+\/)?file:\/?\/?\/?[A-Za-z]:\/[^"'<>\\]+?\.(?:jpe?g|png|gif|webp|svg)/gi;
  const references = Array.from(new Set(html.match(pattern) || []));
  const mime: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'
  };
  for (const reference of references) {
    const url = reference.slice(reference.indexOf('file:'));
    const file = fileURLToPath(url);
    const extension = path.extname(file).toLowerCase();
    if (!mime[extension]) continue;
    const bytes = await fs.readFile(file);
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    let replacement: string;
    if (externalDirectory) {
      const name = `${hash}${extension}`;
      await fs.mkdir(externalDirectory, { recursive: true });
      await fs.writeFile(path.join(externalDirectory, name), bytes);
      replacement = `${externalPrefix || ''}${name}`;
    } else {
      replacement = `data:${mime[extension]};base64,${bytes.toString('base64')}`;
    }
    html = html.split(reference).join(replacement);
  }
  return html;
}
