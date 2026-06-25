import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';

interface Message {
  id: string;
  body: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
}

type Conversations = Record<string, Message[]>;

export function SMSPage() {
  const [conversations, setConversations] = useState<Conversations>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const sortedConversations = Object.entries(conversations).sort(([, a], [, b]) => {
    const aLast = a[0]?.timestamp ?? '';
    const bLast = b[0]?.timestamp ?? '';
    return bLast.localeCompare(aLast);
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-slide-up">
      {/* Conversation list */}
      <div className={`w-full lg:w-72 flex-shrink-0 flex flex-col ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <h1 className="text-2xl font-bold text-white mb-4">SMS Inbox</h1>
        {sortedConversations.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-gray-500">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages yet</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {sortedConversations.map(([num, msgs]) => {
              const last = msgs[0];
              return (
                <button key={num} onClick={() => setSelected(num)} className={`w-full text-left glass rounded-xl px-4 py-3 transition-all hover:border-blue-500/30 ${selected === num ? 'border-blue-500/40 bg-blue-500/10' : ''}`}>
                  <div className="font-medium text-white text-sm mb-0.5">{formatPhone(num)}</div>
                  <div className="text-xs text-gray-400 truncate">{last?.body || ''}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{last?.timestamp ? format(new Date(last.timestamp), 'dd MMM, h:mm a') : ''}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Message thread */}
      {selected ? (
        <div className={`flex-1 flex flex-col ${selected ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSelected(null)} className="lg:hidden text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="font-semibold text-white">{formatPhone(selected)}</h2>
              <p className="text-xs text-gray-500">{selected}</p>
            </div>
          </div>

          <div className="flex-1 glass rounded-xl p-4 overflow-y-auto space-y-3 mb-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.direction === 'outbound'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-white/10 text-gray-200 rounded-bl-sm'
                }`}>
                  <p>{msg.body}</p>
                  <p className="text-xs opacity-60 mt-1 text-right">
                    {msg.timestamp ? format(new Date(msg.timestamp), 'h:mm a') : ''}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-3">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              className="flex-1 glass rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40"
            />
            <Button onClick={handleSend} loading={sending} disabled={!reply.trim()} className="px-4">
              <Send size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="text-center text-gray-600">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
            <p>Select a conversation</p>
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
