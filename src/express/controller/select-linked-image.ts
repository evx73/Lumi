import * as Express from 'express';
import { dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

import { selectedLinkedImages } from './linked-selection';

const router = Express.Router();
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp'
};

router.post('/api/v1/linked-image/select', async (req: any, res: any) => {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
    res.sendStatus(403);
    return;
  }
  try {
    const selection = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    });
    if (selection.canceled || !selection.filePaths[0]) { res.json({ canceled: true }); return; }
    const file = selection.filePaths[0];
    const mime = mimeTypes[path.extname(file).toLowerCase()];
    if (!mime) { res.sendStatus(415); return; }
    const bytes = await fs.readFile(file);
    const size = imageSize(bytes, mime);
    if (!size) { res.status(415).json({ error: 'Unsupported image format' }); return; }
    const source = pathToFileURL(file).href;
    selectedLinkedImages.add(source);
    res.json({ path: source, mime, width: size.width, height: size.height });
  } catch (error) { res.status(500).json({ error: String(error) }); }
});

function imageSize(bytes: Buffer, mime: string): { width: number; height: number } | null {
  if (mime === 'image/png' && bytes.length >= 24) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (mime === 'image/gif' && bytes.length >= 10) return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (mime === 'image/jpeg') {
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += length + 2;
    }
  }
  if (mime === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii', 12, 16) === 'VP8X') {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  return null;
}

export default router;
