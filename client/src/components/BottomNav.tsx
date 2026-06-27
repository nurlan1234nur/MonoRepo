import { NavLink } from 'react-router-dom';
import { CalendarDays, Home, Images, MessageCircle, Sparkles, type LucideIcon } from 'lucide-react';

const tabs: Array<{ to: string; icon: LucideIcon; label: string; big?: boolean }> = [
  { to: '/', icon: Home, label: 'Нүүр' },
  { to: '/timeline', icon: CalendarDays, label: 'Түүх' },
  { to: '/memories', icon: Images, label: 'Дурсамж', big: true },
  { to: '/chat', icon: MessageCircle, label: 'Чат' },
  { to: '/more', icon: Sparkles, label: 'Илүү' },
];

export default function BottomNav() {
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-10 flex h-[74px] items-center justify-around border-t border-rose/10 bg-cream/95 pb-2 backdrop-blur-xl">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex min-w-[54px] flex-col items-center gap-1 rounded-2xl px-2.5 py-1.5 transition-all ${
              isActive ? 'bg-rose/10' : ''
            }`
          }
        >
          {({ isActive }) => (
            <>
              <t.icon
                size={t.big ? 29 : 23}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-transform ${isActive ? 'scale-110 text-rose' : 'text-muted'}`}
                aria-hidden="true"
              />
              <span
                className={`font-medium ${t.big ? 'text-[11px]' : 'text-[10px]'} ${
                  isActive ? 'font-bold text-rose' : 'text-muted'
                }`}
              >
                {t.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
