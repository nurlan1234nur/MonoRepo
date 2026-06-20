import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className="w-full rounded-xl border border-blush/60 bg-white py-3 pl-4 pr-12 text-deep outline-none transition-colors focus:border-rose"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted transition-colors hover:text-deep"
        aria-label={visible ? 'Нууц үг нуух' : 'Нууц үг харуулах'}
        title={visible ? 'Нууц үг нуух' : 'Нууц үг харуулах'}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
