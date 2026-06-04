const DAY = 24 * 60 * 60 * 1000;

export function daysSince(date: string | null): number {
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / DAY));
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// Зурвас дээр дарахад: "6-р сарын 4, 14:32"
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}, ${formatTime(iso)}`;
}

// "Сая", "5 минутын өмнө", "2 цаг 10 минутын өмнө", "3 өдрийн өмнө"
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'сая';
  if (min < 60) return `${min} минутын өмнө`;
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    const rem = min % 60;
    return rem ? `${hours} цаг ${rem} минутын өмнө` : `${hours} цагийн өмнө`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} өдрийн өмнө`;
  return formatDate(iso);
}

export function monthLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()} оны ${d.getMonth() + 1} сар`;
}

// Дараагийн ой хүртэлх хоног (anniversary-ийн сар/өдрөөр).
export function daysToNextAnniversary(date: string | null): { years: number; days: number } | null {
  if (!date) return null;
  const ann = new Date(date);
  const now = new Date();
  let next = new Date(now.getFullYear(), ann.getMonth(), ann.getDate());
  if (next.getTime() < now.setHours(0, 0, 0, 0)) {
    next = new Date(new Date().getFullYear() + 1, ann.getMonth(), ann.getDate());
  }
  const years = next.getFullYear() - ann.getFullYear();
  const days = Math.ceil((next.getTime() - Date.now()) / DAY);
  return { years, days };
}
