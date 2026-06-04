import { useState } from 'react';
import Sheet from './Sheet';
import Avatar, { isImageAvatar } from './Avatar';
import { useCouple } from '../context/CoupleContext';
import { assetUrl } from '../lib/api';
import { daysSince, formatDate, timeAgo } from '../lib/date';
import type { Member } from '../types';

export default function PartnerProfileSheet({
  open,
  onClose,
  partner,
  online,
  seenIso,
}: {
  open: boolean;
  onClose: () => void;
  partner: Member | null;
  online: boolean;
  seenIso: string | null;
}) {
  const { couple } = useCouple();
  const days = daysSince(couple?.anniversary ?? null);
  const [zoom, setZoom] = useState(false);
  const canZoom = isImageAvatar(partner?.avatar);

  return (
    <Sheet open={open} onClose={onClose} title="Хайрын профайл">
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => canZoom && setZoom(true)}
          className={canZoom ? 'transition-transform active:scale-95' : 'cursor-default'}
          aria-label="Зураг томоор харах"
        >
          <Avatar value={partner?.avatar} className="h-24 w-24 shadow-md" emojiClassName="text-5xl" />
        </button>
        <div className="text-xl font-bold text-deep">{partner?.name ?? 'Хайрт'}</div>
        <div className={`text-[13px] ${online ? 'text-green-600' : 'text-muted'}`}>
          {online ? '🟢 Одоо онлайн' : seenIso ? `${timeAgo(seenIso)} онлайн байсан` : 'Офлайн'}
        </div>
        {partner?.status && (
          <div className="mt-1 rounded-2xl bg-warm px-4 py-2 text-center text-[14px] text-deep">
            {partner.status}
          </div>
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        <InfoRow icon="🌙" label="Хамтдаа" value={`${days} хоног`} />
        {partner?.birthday && (
          <InfoRow icon="🎂" label="Төрсөн өдөр" value={formatDate(partner.birthday)} />
        )}
        {couple?.anniversary && (
          <InfoRow icon="💞" label="Ойн өдөр" value={formatDate(couple.anniversary)} />
        )}
      </div>

      {zoom && partner?.avatar && (
        <div
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-deep/85 p-4"
        >
          <img
            src={assetUrl(partner.avatar)}
            alt={partner.name}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </Sheet>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-[0_2px_12px_rgba(45,31,46,0.06)]">
      <span className="text-xl">{icon}</span>
      <span className="flex-1 text-[13px] text-muted">{label}</span>
      <span className="text-[14px] font-semibold text-deep">{value}</span>
    </div>
  );
}
