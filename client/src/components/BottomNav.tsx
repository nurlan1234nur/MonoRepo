import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', icon: '🏠', label: 'Нүүр' },
  { to: '/timeline', icon: '📅', label: 'Түүх' },
  { to: '/memories', icon: '📸', label: 'Дурсамж', big: true },
  { to: '/chat', icon: '💬', label: 'Чат' },
  { to: '/more', icon: '✨', label: 'Илүү' },
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
              <span
                className={`transition-transform ${t.big ? 'text-[30px]' : 'text-[22px]'} ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                {t.icon}
              </span>
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
