import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Send, ChevronLeft, Phone, MessageSquare, Search, MoreHorizontal,
  CheckCheck, Check, Clock, X, Plus,
} from 'lucide-react';
import { api } from '../lib/api';
import { SkeletonRow } from '../components/ui/Skeleton';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface SMSMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  createdAt: string;
  status?: 'sending' | 'delivered' | 'read' | 'failed';
}

interface Conversation {
  id: string;
  phoneNumber: string;
  contactName?: string;
  messages: SMSMessage[];
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
}

function fmtPhone(num: string): string {
  if (!num) return 'Unknown';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  if (clean.length === 10 && clean.startsWith('0')) return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  return num;
}

function fmtConvoTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMM');
}

function fmtMsgTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm');
}

function avatarInitials(convo: Conversation): string {
  if (convo.contactName) return convo.contactName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const clean = convo.phoneNumber.replace(/\D/g, '');
  return clean.slice(-2);
}

const GRADIENTS = [
  'from-blue-500 to-indigo-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-red-500',
  'from-purple-500 to-pink-500',
  'from-cyan-500 to-blue-500',
];

/* Shows a timestamp divider if there's a large gap between messages */
function shouldShowTimestamp(msgs: SMSMessage[], idx: number): boolean {
  if (idx === 0) return true;
  const prev = new Date(msgs[idx - 1].createdAt);
  const curr = new Date(msgs[idx].createdAt);
  return differenceInMinutes(curr, prev) > 15;
}

function MsgStatusIcon({ status }: { status?: string }) {
  if (status === 'delivered') return <CheckCheck size={10} className="text-blue-300" />;
  if (status === 'read')      return <CheckCheck size={10} className="text-blue-400" />;
  if (status === 'failed')    return <X size={10} className="text-red-400" />;
  if (status === 'sending')   return <Clock size={10} className="text-white/40 animate-pulse" />;
  return <Check size={10} className="text-white/40" />;
}

export function SMSPage() {
  useEffect(() => { document.title = 'SMS | TradeDesk'; }, []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Conversation[]>('/sms/conversations')
      .then(data => { setConversations(data); if (data.length > 0) setSelected(data[0]); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  const selectConvo = (c: Conversation) => {
    setSelected(c);
    setMobileView('thread');
  };

  const sendMessage = useCallback(async () => {
    if (!draft.trim() || !selected || sending) return;
    const body = draft.trim();
    setDraft('');
    setSending(true);
    const optimistic: SMSMessage = {
      id: `opt-${Date.now()}`, direction: 'outbound', body, createdAt: new Date().toISOString(), status: 'sending',
    };
    setSelected(s => s ? { ...s, messages: [...s.messages, optimistic] } : s);
    setConversations(cs => cs.map(c =>
      c.id === selected.id ? { ...c, lastMessage: body, lastMessageAt: optimistic.createdAt } : c
    ));
    try {
      await api.post(`/sms/send`, { to: selected.phoneNumber, body });
      setSelected(s => s ? {
        ...s, messages: s.messages.map(m => m.id === optimistic.id ? { ...m, status: 'delivered' } : m),
      } : s);
    } catch { /* optimistic stays */ }
    setSending(false);
    inputRef.current?.focus();
  }, [draft, selected, sending]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.contactName?.toLowerCase().includes(q) || c.phoneNumber.includes(q);
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-white/7 overflow-hidden animate-slide-up"
      style={{ background: 'rgba(13,20,38,0.5)' }}>

      {/* ── Conversation list ── */}
      <aside className={clsx(
        'flex-shrink-0 border-r border-white/6 flex flex-col',
        'w-full sm:w-72 lg:w-80',
        mobileView === 'thread' && 'hidden sm:flex',
        mobileView === 'list' && 'flex'
      )}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/6 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Messages</h2>
            <button className="w-7 h-7 rounded-lg bg-white/5 hover:bg-blue-500/15 flex items-center justify-center text-gray-500 hover:text-blue-400 transition-all border border-white/5 hover:border-blue-500/25">
              <Plus size={13} />
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/40 transition-colors" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-600">No conversations yet</p>
            </div>
          ) : filtered.map((c, idx) => {
            const isActive = selected?.id === c.id;
            const grad = GRADIENTS[idx % GRADIENTS.length];
            return (
              <button key={c.id} onClick={() => selectConvo(c)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-white/4',
                  isActive ? 'bg-blue-500/12 border-l-2 border-l-blue-500/60' : 'hover:bg-white/4'
                )}>
                <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                  {avatarInitials(c)}
                  {(c.unread ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center">{c.unread}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">
                      {c.contactName ?? fmtPhone(c.phoneNumber)}
                    </span>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">{fmtConvoTime(c.lastMessageAt)}</span>
                  </div>
                  <p className={clsx('text-xs truncate mt-0.5', (c.unread ?? 0) > 0 ? 'text-gray-300 font-medium' : 'text-gray-600')}>
                    {c.lastMessage ?? 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Thread ── */}
      <main className={clsx(
        'flex-1 flex flex-col min-w-0',
        mobileView === 'list' && 'hidden sm:flex',
        mobileView === 'thread' && 'flex'
      )}>
        {selected ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/6 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <button onClick={() => setMobileView('list')}
                className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-all -ml-1">
                <ChevronLeft size={18} />
              </button>
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${GRADIENTS[conversations.findIndex(c => c.id === selected.id) % GRADIENTS.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                {avatarInitials(selected)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{selected.contactName ?? fmtPhone(selected.phoneNumber)}</p>
                {selected.contactName && <p className="text-xs text-gray-600">{fmtPhone(selected.phoneNumber)}</p>}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => navigate('/dashboard/calls')} title="View call history"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-500/15 flex items-center justify-center text-gray-500 hover:text-blue-400 transition-all border border-white/6">
                  <Phone size={13} />
                </button>
                <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all border border-white/6">
                  <MoreHorizontal size={13} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
              {selected.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <MessageSquare size={32} className="text-gray-700 mb-3" />
                  <p className="text-sm text-gray-600">No messages yet</p>
                  <p className="text-xs text-gray-700 mt-1">Send a message to start the conversation.</p>
                </div>
              ) : selected.messages.map((msg, i) => {
                const isOut = msg.direction === 'outbound';
                const showTime = shouldShowTimestamp(selected.messages, i);
                const showDate = i === 0;
                return (
                  <div key={msg.id}>
                    {(showDate || showTime) && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] text-gray-600 bg-white/4 px-3 py-1 rounded-full border border-white/5">
                          {isToday(new Date(msg.createdAt)) ? `Today ${fmtMsgTime(msg.createdAt)}`
                            : isYesterday(new Date(msg.createdAt)) ? `Yesterday ${fmtMsgTime(msg.createdAt)}`
                            : format(new Date(msg.createdAt), 'd MMM · HH:mm')}
                        </span>
                      </div>
                    )}
                    <div className={clsx('flex items-end gap-1.5 mb-0.5', isOut ? 'justify-end' : 'justify-start')}>
                      <div className={clsx(
                        'max-w-[72%] px-3.5 py-2.5 text-sm leading-relaxed',
                        isOut
                          ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                          : 'text-gray-100 rounded-2xl rounded-bl-md border border-white/8'
                      )} style={!isOut ? { background: 'rgba(255,255,255,0.08)' } : undefined}>
                        {msg.body}
                      </div>
                    </div>
                    {isOut && (
                      <div className="flex justify-end items-center gap-1 pr-1">
                        <span className="text-[10px] text-gray-700">{fmtMsgTime(msg.createdAt)}</span>
                        <MsgStatusIcon status={msg.status} />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-white/6" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <div className="flex items-end gap-2 bg-white/6 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-blue-500/40 transition-colors">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Message…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none resize-none max-h-32 overflow-y-auto py-1 leading-relaxed"
                  style={{ minHeight: '22px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className={clsx(
                    'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                    draft.trim() && !sending
                      ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white/8 text-gray-600 cursor-not-allowed'
                  )}>
                  <Send size={13} className={draft.trim() ? 'translate-x-px -translate-y-px' : ''} />
                </button>
              </div>
              <p className="text-[10px] text-gray-700 text-center mt-2">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-16 h-16 bg-blue-500/8 rounded-2xl flex items-center justify-center">
              <MessageSquare size={28} className="text-blue-400/30" />
            </div>
            <p className="text-sm font-semibold text-gray-400">Select a conversation</p>
            <p className="text-xs text-gray-700 max-w-[200px]">Choose from the list to view messages.</p>
          </div>
        )}
      </main>
    </div>
  );
}
