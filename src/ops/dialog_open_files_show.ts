import { dialog, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';

export default async function dialog_open_files_show(): Promise<string[]> {
  const historyFile = path.join(app.getPath('userData'), 'open-directory.json');
  const lastDir = await fs.readJSON(historyFile).catch(() => undefined);
  const result = await dialog.showOpenDialog({
    defaultPath: lastDir || undefined,
    properties: ['openFile', 'multiSelections']
  });

  if (result.filePaths.length) await fs.writeJSON(historyFile, path.dirname(result.filePaths[0]));
  return result.filePaths;
}
