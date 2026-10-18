import { app, dialog } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import { Context } from '../boot';
import content_export_as_html from './content_export_as_html';
import content_export_as_html_external from './content_export_as_html_external';
import content_export_as_scorm from './content_export_as_scorm';
import window_backdrop_show from './window_backdrop_show';
import window_backdrop_hide from './window_backdrop_hide';
import window_snackbar_show from './window_snackbar_show';

type Format = 'html' | 'external' | 'scorm';
type LastExport = { filePath: string; format: Format; options: any };
const configFile = () => path.join(app.getPath('userData'), 'last-export.json');
export async function readLastExport(): Promise<LastExport | undefined> {
  try { return await fs.readJSON(configFile()); } catch { return undefined; }
}
export async function rememberExport(filePath: string, format: Format, options: any): Promise<void> {
  await fs.writeJSON(configFile(), { filePath, format, options }, { spaces: 2 });
}
export async function runExport(context: Context, contentId: string, settings: LastExport): Promise<void> {
  await window_backdrop_show(context, contentId);
  try {
    if (settings.format === 'html') await content_export_as_html(context, contentId, settings.filePath, settings.options);
    else if (settings.format === 'external') await content_export_as_html_external(context, contentId, settings.filePath, settings.options);
    else await content_export_as_scorm(context, contentId, settings.filePath, settings.options);
    await window_snackbar_show(context, contentId, 'Export completed: ' + settings.filePath, 'success');
  } finally {
    await window_backdrop_hide(context, contentId);
  }
}
function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, windowsHide: true, shell: false });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error('git ' + args.join(' ') + ': ' + stderr.trim())));
  });
}
export async function publish(context: Context, contentId: string): Promise<void> {
  const last = await readLastExport();
  if (!last) { dialog.showErrorBox('Publish', 'Export a presentation first.'); return; }
  const dir = path.dirname(last.filePath);
  try {
    if (!(await fs.pathExists(path.join(dir, '.git')))) throw new Error('Export folder is not a Git repository root: ' + dir);
    await git(dir, ['add', '.']);
    const changes = await git(dir, ['diff', '--cached', '--name-only']);
    if (!changes) {
      await dialog.showMessageBox({ type: 'info', title: 'Publish', message: 'Nothing to publish', detail: dir });
      return;
    }
    const commit = await git(dir, ['commit', '-m', 'Update presentation']);
    await git(dir, ['push']);
    await dialog.showMessageBox({ type: 'info', title: 'Publish', message: 'Published successfully', detail: dir + '\n\n' + commit });
  } catch (error) {
    dialog.showErrorBox('Publish failed', String(error));
    return;
  }
}
export async function exportLast(context: Context, contentId: string): Promise<boolean> {
  const last = await readLastExport();
  if (!last) { dialog.showErrorBox('Export', 'Use Export... once to select format, options and destination.'); return false; }
  try { await runExport(context, contentId, last); return true; }
  catch (error) { dialog.showErrorBox('Export failed', String(error)); return false; }
}
