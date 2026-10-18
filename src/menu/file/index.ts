import file_new from './file_new';
import window_get_active from '../../ops/window_get_active';
import window_get_content_id from '../../ops/window_get_content_id';
import { exportLast, publish } from '../../ops/publication';
import file_open from './file_open';
import file_save from './file_save';
import { Context } from '../../boot';
import file_close from './file_close';
import file_export from './file_export';
import file_save_as from './file_save_as';

export default function file_menu(ctx: Context): any[] {
  const menu = [
    {
      label: ctx.translate('File'),
      submenu: [
        file_new(ctx),
        { type: 'separator' } as any,
        file_open(ctx),
        { type: 'separator' } as any,
        file_save(ctx),
        file_save_as(ctx),
        { type: 'separator' } as any,
        file_export(ctx),
        {
          label: 'Export (last settings)',
          enabled: ctx.menu === 'content',
          click: async () => {
            const id = await window_get_content_id(window_get_active());
            await exportLast(ctx, id);
          }
        },
        {
          label: 'Publish',
          enabled: ctx.menu === 'content',
          click: async () => {
            const id = await window_get_content_id(window_get_active());
            await publish(ctx, id);
          }
        },
        {
          label: 'Export and Publish',
          enabled: ctx.menu === 'content',
          click: async () => {
            const id = await window_get_content_id(window_get_active());
            if (await exportLast(ctx, id)) await publish(ctx, id);
          }
        },
        { type: 'separator' } as any,
        file_close(ctx)
      ]
    }
  ];

  return menu;
}
