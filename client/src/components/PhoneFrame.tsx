import type { ReactNode } from 'react';

// Full-screen PWA shell. Mobile дээр бүтэн дэлгэц; өргөн дэлгэцэд төвлөрсөн багана.
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-cream">
      {children}
    </div>
  );
}
