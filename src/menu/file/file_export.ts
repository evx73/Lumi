import { Context } from '../../boot';
import MenuItem from '../../types/MenuItem';
import window_get_active from '../../ops/window_get_active';
import window_get_content_id from '../../ops/window_get_content_id';
import exportProtectedHtml from '../../ops/export_protected_html';

export default function file_close(ctx: Context): MenuItem {
  return {
    label: ctx.translate('Export..'),
    enabled: ctx.menu === 'content',
    submenu: [
      {
        label: ctx.translate('SCORM package'),
        click: async () => {
          const active_window = window_get_active();
          const content_id = await window_get_content_id(active_window);
          ctx.ws.emit(content_id, { type: 'export_as_scorm' });
        }
      },
      {
        label: ctx.translate('All-in-one HTML file'),

        click: async () => {
          const active_window = window_get_active();
          const content_id = await window_get_content_id(active_window);
          ctx.ws.emit(content_id, { type: 'export_as_html' });
        }
      },
      {
        label: 'All-in-one HTML file (require visitor key)',
        click: async () => {
          const active_window = window_get_active();
          const content_id = await window_get_content_id(active_window);
          await exportProtectedHtml(ctx, content_id, false);
        }
      },
      {
        label: ctx.translate('One HTML file and several media files'),
        click: async () => {
          const active_window = window_get_active();
          const content_id = await window_get_content_id(active_window);
          ctx.ws.emit(content_id, { type: 'export_as_html_external' });
        }
      },
      {
        label: 'HTML with external media (require visitor key)',
        click: async () => {
          const active_window = window_get_active();
          const content_id = await window_get_content_id(active_window);
          await exportProtectedHtml(ctx, content_id, true);
        }
      }
    ]
  };
}
