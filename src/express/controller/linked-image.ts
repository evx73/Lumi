import * as Express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { selectedLinkedImages } from './linked-selection';

const router = Express.Router();

router.get('/api/v1/content/:contentId/linked-image', async (req: any, res: any) => {
  const { contentId } = req.params;
  const source = req.query.source;
  if (!(/^\d+$/.test(contentId) || contentId === 'new') || typeof source !== 'string' || !source.startsWith('file:///')) {
    res.sendStatus(400);
    return;
  }
  try {
    const contentFile = path.join(req.ctx.paths.content, contentId, 'content.json');
    const params = contentId === 'new' ? null : await fs.readFile(contentFile, 'utf8').then(JSON.parse).catch(() => null);
    const references = (value: any): boolean => {
      if (!value || typeof value !== 'object') return false;
      if (typeof value.path === 'string' && value.path === source) return true;
      return Object.values(value).some(references);
    };
    if (!references(params) && !selectedLinkedImages.has(source)) { res.sendStatus(404); return; }
    const file = fileURLToPath(source);
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) { res.sendStatus(415); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(file, (error: any) => {
      if (error && !res.headersSent) res.sendStatus(error.status || 404);
    });
  } catch (error) {
    if (!res.headersSent) res.sendStatus(404);
  }
});

export default router;
