import { formatDate } from '../../../lib/format';

export const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function utcDateString(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function getToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${v.year}-${v.month}-${v.day}`;
}

export function shiftDate(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateString(date);
}

export function getPresetRange(preset) {
  const today = getToday();
  const [year, month] = today.split('-').map(Number);
  if (preset === 'today') return { fromDate: today, toDate: today };
  if (preset === 'week') {
    const weekday = new Date(Date.UTC(year, month - 1, Number(today.slice(8, 10)))).getUTCDay();
    const daysFromMonday = (weekday + 6) % 7;
    return { fromDate: shiftDate(today, -daysFromMonday), toDate: today };
  }
  if (preset === 'lastMonth') {
    const start = new Date(Date.UTC(year, month - 2, 1));
    const end = new Date(Date.UTC(year, month - 1, 0));
    return { fromDate: utcDateString(start), toDate: utcDateString(end) };
  }
  return { fromDate: `${year}-${String(month).padStart(2, '0')}-01`, toDate: today };
}

export function inclusiveDays(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  return Math.max(0, (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000 + 1);
}

export function getPreviousPeriod(fromDate, toDate) {
  const days = inclusiveDays(fromDate, toDate);
  if (days <= 0) return null;
  const prevTo = shiftDate(fromDate, -1);
  const prevFrom = shiftDate(fromDate, -days);
  return { fromDate: prevFrom, toDate: prevTo, days };
}

export function displayPeriod(fromDate, toDate) {
  if (!fromDate || !toDate) return '';
  if (fromDate === toDate) return formatDate(fromDate);
  return `${formatDate(fromDate)} – ${formatDate(toDate)}`;
}
