// Танилцсан өдөр + төрсөн өдрөөс чухал огнуудын жагсаалт автоматаар үүсгэнэ.

const DAY = 24 * 60 * 60 * 1000;

export interface MilestoneItem {
  key: string;
  title: string;
  date: Date;
  icon: string;
  upcoming: boolean;
  badge: string;
  id?: string; // зөвхөн custom баярт байна — устгах боломжтой гэсэн дохио
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function generateMilestones(
  anniversary: string | null,
  members: { name: string; birthday?: string | null }[],
): MilestoneItem[] {
  if (!anniversary) return [];
  const start = startOfDay(new Date(anniversary));
  const now = startOfDay(new Date());
  const daysTogether = Math.floor((now.getTime() - start.getTime()) / DAY);
  const items: MilestoneItem[] = [];

  const add = (key: string, title: string, rawDate: Date, icon: string) => {
    const date = startOfDay(rawDate);
    const upcoming = date.getTime() > now.getTime();
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / DAY);
    items.push({ key, title, date, icon, upcoming, badge: upcoming ? `${daysLeft} хоног үлдлээ` : '✓' });
  };

  // Танилцсан өдөр
  add('start', 'Анх танилцсан өдөр', start, '💑');

  // Хоногийн босгууд: 100→1000 (100 алхамтай) + 1111 + 1500-аас цааш 500 алхамтай
  const cap = daysTogether + 500; // day-mark үүсгэх дээд хязгаар
  const dayMarks = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1111];
  for (let n = 1500; n <= cap; n += 500) dayMarks.push(n);
  for (const n of dayMarks) {
    if (n > cap) continue;
    add(`d${n}`, `${n} хоног`, new Date(start.getTime() + n * DAY), n === 1111 ? '✨' : '💫');
  }

  // Сарын ой: 1, 2, 3, 6, 9 сар
  for (const m of [1, 2, 3, 6, 9]) {
    add(`m${m}`, `${m} сарын ой`, new Date(start.getFullYear(), start.getMonth() + m, start.getDate()), '🌙');
  }

  // Жилийн ой: 1 → (хамт байсан жил + 3)
  const yearsTogether = now.getFullYear() - start.getFullYear();
  for (let y = 1; y <= yearsTogether + 3; y += 1) {
    add(`y${y}`, `${y} жилийн ой`, new Date(start.getFullYear() + y, start.getMonth(), start.getDate()), '🎂');
  }

  // Anniversary-аас үүсэх зүйлсийг ирээдүйн цонхоор (≈13 сар) шүүнэ.
  const horizon = now.getTime() + 400 * DAY;
  const kept = items.filter((i) => !i.upcoming || i.date.getTime() <= horizon);

  // Төрсөн өдрүүд — танилцсанаас хойш болсон БҮХ төрсөн өдөр + дараагийн нэг
  // (жилийн зааг дээр алдаа гарахгүй, цонхоор шүүхгүй).
  members.forEach((mem, idx) => {
    if (!mem.birthday) return;
    const b = new Date(mem.birthday);
    const m = b.getMonth();
    const day = b.getDate();
    const thisYear = startOfDay(new Date(now.getFullYear(), m, day));
    const nextOcc =
      thisYear.getTime() >= now.getTime()
        ? thisYear
        : startOfDay(new Date(now.getFullYear() + 1, m, day));
    for (let y = start.getFullYear(); y <= now.getFullYear() + 1; y += 1) {
      const d = startOfDay(new Date(y, m, day));
      if (d.getTime() < start.getTime()) continue; // танилцахаас өмнөх төрсөн өдрийг алгасна
      if (d.getTime() > nextOcc.getTime()) break; // дараагийн төрсөн өдрөөс цааш үгүй
      const upcoming = d.getTime() > now.getTime();
      const daysLeft = Math.ceil((d.getTime() - now.getTime()) / DAY);
      kept.push({
        key: `b-${idx}-${y}`,
        title: `${mem.name} төрсөн өдөр`,
        date: d,
        icon: '🎁',
        upcoming,
        badge: upcoming ? `${daysLeft} хоног үлдлээ` : '✓',
      });
    }
  });

  return kept.sort((a, b) => a.date.getTime() - b.date.getTime());
}
