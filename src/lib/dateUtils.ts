import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';

dayjs.extend(buddhistEra);
dayjs.locale('th');

export const formatDateTH = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  return dayjs(dateString).format('DD MMMM BBBB');
};

export const formatDateTimeTH = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  return dayjs(dateString).format('DD MMMM BBBB HH:mm');
};
