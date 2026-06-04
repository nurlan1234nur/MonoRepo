import { assetUrl } from '../lib/api';

// avatar утга нь зургийн зам (/uploads/... эсвэл http) эсвэл emoji байж болно.
export function isImageAvatar(v?: string): boolean {
  return !!v && (v.startsWith('/') || v.startsWith('http'));
}

interface AvatarProps {
  value?: string;
  fallback?: string;
  // Хэмжээ + нэмэлт класс (жнь "h-11 w-11 shadow-md").
  className?: string;
  // Emoji-н текстийн хэмжээ (жнь "text-xl").
  emojiClassName?: string;
}

// Дугуй avatar — зураг бол <img>, эс бөгөөс gradient дээр emoji.
export default function Avatar({
  value,
  fallback = '🥰',
  className = 'h-11 w-11',
  emojiClassName = 'text-xl',
}: AvatarProps) {
  const v = value || fallback;
  if (isImageAvatar(v)) {
    return <img src={assetUrl(v)} alt="" className={`${className} rounded-full object-cover`} />;
  }
  return (
    <span
      className={`${className} flex items-center justify-center rounded-full bg-gradient-to-br from-blush to-rose ${emojiClassName}`}
    >
      {v}
    </span>
  );
}
