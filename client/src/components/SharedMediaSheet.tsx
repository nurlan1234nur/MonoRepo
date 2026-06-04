import { useState } from 'react';
import Sheet from './Sheet';
import { assetUrl } from '../lib/api';
import type { Message } from '../types';

export default function SharedMediaSheet({
  open,
  onClose,
  messages,
}: {
  open: boolean;
  onClose: () => void;
  messages: Message[];
}) {
  const [zoom, setZoom] = useState<string | null>(null);
  const images = messages.filter((m) => m.imageUrl && !m.deleted).reverse();

  return (
    <Sheet open={open} onClose={onClose} title={`Илгээсэн зургууд (${images.length})`}>
      {images.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Одоохондоо зураг алга 🖼️</p>
      ) : (
        <div className="no-scrollbar grid max-h-[60vh] grid-cols-3 gap-1.5 overflow-y-auto">
          {images.map((m) => (
            <button
              key={m._id}
              onClick={() => setZoom(m.imageUrl!)}
              className="aspect-square overflow-hidden rounded-lg transition-transform active:scale-95"
            >
              <img src={assetUrl(m.imageUrl!)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-deep/85 p-4"
        >
          <img src={assetUrl(zoom)} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </Sheet>
  );
}
