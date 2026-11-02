import { Context } from '../boot';
import dialog_export_save_as_show from './dialog_export_save_as_show';
import content_export_as_html from './content_export_as_html';
import content_export_as_html_external from './content_export_as_html_external';
import { rememberExport } from './publication';
import window_backdrop_show from './window_backdrop_show';
import window_backdrop_hide from './window_backdrop_hide';
import window_snackbar_show from './window_snackbar_show';

/** Protected export is handled directly in the main process; browser export events discard menu options. */
export default async function exportProtectedHtml(context: Context, contentId: string, external: boolean): Promise<void> {
  const { file_path } = await dialog_export_save_as_show('Export HTML (require visitor key)', '.html', ['.html']);
  if (!file_path) return;
  const options = { requireVisitorKey: true } as any;
  await window_backdrop_show(context, contentId);
  try {
    if (external) await content_export_as_html_external(context, contentId, file_path, options);
    else await content_export_as_html(context, contentId, file_path, options);
    await rememberExport(file_path, external ? 'external' : 'html', options);
    await window_snackbar_show(context, contentId, `Content exported to ${file_path}`, 'success');
  } finally {
    await window_backdrop_hide(context, contentId);
  }
}
