import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft, Search } from 'lucide-react';
import { api } from '../lib/api';
import { Skeleton } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';

interface Message { id: string; body: string; direction: 'inbound' | 'outbound'; timestamp: string; }
type Conversations = Record<string, Message[]>;

export function SMSPage() {
  useEffect(() => { document.title = 'SMS | TradeDesk'; }, []);
  const [conversations, setConversations] = useState<Conversations>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<Conversations>('/sms/conversations').then(setConversations).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) {
      api.get<Message[]>(`/sms/messages/${encodeURIComponent(selected)}`).then(setMessages).catch(console.error);
    }
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api.post('/sms/send', { to: selected, body: reply.trim() });
      setReply('');
      const updated = await api.get<Message[]>(`/sms/messages/${encodeURIComponent(selected)}`);
      setMessages(updated);
    } catch (err) { console.error(err); } finally { setSending(false); }
  };

  const sortedConversations = Object.entries(conversations)
    .filter(([num]) => !search || num.includes(search) || formatPhone(num).includes(search))
    .sort(([, a], [, b]) => (b[0]?.timestamp ?? '').localeCompare(a[0]?.timestamp ?? ''));

  if (loading) return (
    <div className="h-[calc(100dvh-9rem)] lg:h-[calc(100vh-7rem)] flex gap-4 animate-fade-in">
      <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-10 w-full rounded-xl" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-xl px-4 py-3 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-9rem)] lg:h-[calc(100vh-7rem)] flex gap-3 animate-slide-up">
      {/* Conversation list */}
      <div className={`w-full lg:w-72 flex-shrink-0 flex flex-col gap-2 ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div>
          <h1 className="text-2xl font-bold text-white mb-3">SMS Inbox</h1>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="glass w-full rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all" />
          </div>
        </div>

        {sortedConversations.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center border border-white/8 flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={20} className="text-green-400/60" />
            </div>
            <p className="text-sm font-medium text-gray-400 mb-1">No messages yet</p>
            <p className="text-xs text-gray-600">SMS summaries from calls will appear here.</p>
          </div>
        ) : (
          <div className="space-y-1.5 overflow-y-auto flex-1">
            {sortedConversations.map(([num, msgs]) => {
              const last = msgs[0];
              const isActive = selected === num;
              return (
                <button key={num} onClick={() => setSelected(num)}
                  className={`w-full text-left glass rounded-xl px-4 py-3 transition-all duration-200 border ${
                    isActive ? 'border-blue-500/40 bg-blue-500/10' : 'border-transparent hover:border-white/10 hover:bg-white/4'
                  }`}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {(formatPhone(num)[0] || '#').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold text-white text-sm truncate">{formatPhone(num)}</p>
                        <p className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
                          {last?.timestamp ? format(new Date(last.timestamp), 'h:mm a') : ''}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{last?.body || ''}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Message thread */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="flex items-center gap-3 mb-3 glass rounded-xl px-4 py-3 border border-white/8">
            <button onClick={() => setSelected(null)} className="lg:hidden text-gray-400 hover:text-white transition-colors p-1">
              <ArrowLeft size={18} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {(formatPhone(selected)[0] || '#').toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{formatPhone(selected)}</p>
              <p className="text-xs text-gray-500">{selected}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 glass rounded-xl p-4 overflow-y-auto space-y-2 mb-3 border border-white/8">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-600 text-sm">No messages in this thread yet</div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 text-sm leading-relaxed ${
                  msg.direction === 'outbound'
                    ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm shadow-md shadow-blue-500/20'
                    : 'bg-white/10 text-gray-100 rounded-2xl rounded-bl-sm border border-white/8'
                }`}>
                  <p>{msg.body}</p>
                  <p className="text-[10px] opacity-50 mt-1 text-right">
                    {msg.timestamp ? format(new Date(msg.timestamp), 'h:mm a') : ''}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <div className="flex gap-2">
            <input value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message…"
              className="flex-1 glass rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all min-h-[48px]"
            />
            <Button onClick={handleSend} loading={sending} disabled={!reply.trim()} className="px-4 py-3 flex-shrink-0">
              <Send size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center glass rounded-xl border border-white/8">
          <div className="text-center text-gray-700">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Select a conversation to read messages</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatPhone(num: string): string {
  if (!num) return 'Unknown';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  return num;
}
