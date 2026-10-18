import { dialog, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';

export default async function dialog_export_save_as_show(
  title: string,
  name: string,
  extensions: string[]
): Promise<{
  file_path: string | undefined;
  canceled: boolean;
}> {
  const historyFile = path.join(app.getPath('userData'), 'export-directory.json');
  const lastDir = await fs.readJSON(historyFile).catch(() => undefined);
  const result = await dialog.showSaveDialog({
    defaultPath: lastDir ? path.join(lastDir, 'index' + (extensions[0].startsWith('.') ? extensions[0] : '.' + extensions[0])) : undefined,
    title,
    filters: [{ name, extensions }],
    properties: ['showOverwriteConfirmation']
  });

  if (!result.canceled && result.filePath) await fs.writeJSON(historyFile, path.dirname(result.filePath));
  return {
    file_path: result.filePath,
    canceled: result.canceled
  };
}
