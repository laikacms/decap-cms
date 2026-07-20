import { CalendarIcon } from '@/ui/icons/index';
import { INSERT_DATETIME_COMMAND } from '@/ui/editor/extensions/DateTimeExtension';
import { ComponentPickerOption } from '@/ui/editor/plugins/picker/ComponentPickerOption';

export function DateTimePickerPlugin() {
  return new ComponentPickerOption('Date', {
    icon: <CalendarIcon className="size-4" />,
    keywords: ['date', 'calendar', 'time', 'today'],
    onSelect: (_, editor) => {
      const dateTime = new Date();
      dateTime.setHours(0, 0, 0, 0); // Set time to midnight
      editor.dispatchCommand(INSERT_DATETIME_COMMAND, { dateTime });
    },
  });
}
