// Чатын дэвсгэр — хэрэглэгчийн төхөөрөмжид localStorage-д хадгална (хувийн сонголт).
const KEY = 'nous-wallpaper';

export const WALLPAPERS: { id: string; name: string; css: string }[] = [
  { id: 'default', name: 'Үндсэн', css: '' },
  { id: 'sunset', name: 'Нар', css: 'linear-gradient(160deg,#fde7d4,#f9d2dd)' },
  { id: 'sky', name: 'Тэнгэр', css: 'linear-gradient(160deg,#e3f0fb,#eae3f8)' },
  { id: 'mint', name: 'Мята', css: 'linear-gradient(160deg,#e2f5ea,#e9f6f3)' },
  { id: 'dusk', name: 'Бүрэнхий', css: 'linear-gradient(160deg,#efe2f5,#f6e2ec)' },
];

export function getWallpaper(): string {
  return localStorage.getItem(KEY) || 'default';
}

export function setWallpaper(id: string): void {
  localStorage.setItem(KEY, id);
}

export function wallpaperCss(id: string): string {
  return WALLPAPERS.find((w) => w.id === id)?.css ?? '';
}
