import type { Theme } from '../types';

interface Palette {
  rose: string;
  blush: string;
  warm: string;
}

export const THEMES: { id: Theme; name: string; palette: Palette }[] = [
  { id: 'rose', name: 'Сарнай', palette: { rose: '#e8607a', blush: '#f5c6ce', warm: '#f9ede6' } },
  { id: 'sunset', name: 'Нар жаргах', palette: { rose: '#f0833e', blush: '#f8d3b0', warm: '#fbeede' } },
  { id: 'ocean', name: 'Далай', palette: { rose: '#3e8ed0', blush: '#bcdcf0', warm: '#e6f1f9' } },
  { id: 'violet', name: 'Ягаан', palette: { rose: '#9b6eb5', blush: '#ddc9ea', warm: '#f0e9f5' } },
  { id: 'forest', name: 'Ой', palette: { rose: '#4fae7a', blush: '#c2e6d2', warm: '#e6f3ec' } },
];

// Tailwind v4 нь өнгийг var(--color-*)-аар ашигладаг тул эдгээрийг root дээр дарж бичихэд апп бүхэлдээ өнгөө солино.
export function applyTheme(theme: Theme | undefined): void {
  const t = THEMES.find((x) => x.id === theme) ?? THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--color-rose', t.palette.rose);
  root.style.setProperty('--color-blush', t.palette.blush);
  root.style.setProperty('--color-warm', t.palette.warm);
}
