import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import type { Message } from '../types';

export default function Home() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Эхний ачаалал + real-time subscription.
  useEffect(() => {
    void api<{ messages: Message[] }>('/messages').then(({ messages }) => setMessages(messages));

    const socket = getSocket();
    socket.on('message:new', (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
    });
    socket.on('partner:typing', (isTyping: boolean) => setPartnerTyping(isTyping));

    return () => {
      socket.off('message:new');
      socket.off('partner:typing');
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText('');
    const { message } = await api<{ message: Message }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ text: value }),
    });
    setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-cream">
      <header className="flex items-center justify-between px-5 py-4 bg-card border-b border-blush/40">
        <h1 className="font-serif italic text-rose text-xl">nous</h1>
        <button onClick={logout} className="text-muted text-xs">
          Гарах
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m) => {
          const mine = m.sender._id === user?.id;
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  mine ? 'bg-rose text-white rounded-br-sm' : 'bg-white text-deep rounded-bl-sm shadow-sm'
                } ${m.special ? 'ring-2 ring-amber-300' : ''}`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        {partnerTyping && <p className="text-muted text-xs italic">бичиж байна…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 p-3 bg-card border-t border-blush/40">
        <input
          className="flex-1 rounded-full border border-blush/60 px-4 py-2 outline-none focus:border-rose"
          placeholder="Зурвас бичих…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            getSocket().emit('typing', e.target.value.length > 0);
          }}
          onBlur={() => getSocket().emit('typing', false)}
        />
        <button type="submit" className="bg-rose text-white rounded-full w-11 h-11 flex items-center justify-center">
          ➤
        </button>
      </form>
    </div>
  );
}
