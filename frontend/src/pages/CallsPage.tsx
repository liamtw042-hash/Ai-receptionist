import { useEffect, useState } from 'react';
import {
  Phone, ChevronDown, Search, Filter, PhoneIncoming, PhoneOutgoing,
  PhoneMissed, Clock, User, MessageSquare, RefreshCw, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { OutcomeBadge } from '../components/ui/Badge';
import { SkeletonRow } from '../components/ui/Skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import { clsx } from 'clsx';

interface Message { role: 'assistant' | 'user'; content: string; }
interface Call {
  id: string;
  callerNumber: string;
  outcome: string;
  summary: string;
  createdAt: string;
  durationSeconds?: number;
  transcript?: Message[];
  turns?: number;
}

const OUTCOME_CONFIG: Record<string, {
  bar: string; icon: typeof Phone; iconColor: string; label: string;
}> = {
  booked:     { bar: '#22c55e', icon: PhoneIncoming,  iconColor: 'text-green-400',  label: 'Booked' },
  emergency:  { bar: '#ef4444', icon: PhoneIncoming,  iconColor: 'text-red-400',    label: 'Emergency' },
  lead:       { bar: '#3b82f6', icon: PhoneIncoming,  iconColor: 'text-blue-400',   label: 'Lead' },
  'no-action':{ bar: '#6b7280', icon: PhoneMissed,    iconColor: 'text-gray-500',   label: 'No Action' },
  transferred:{ bar: '#a78bfa', icon: PhoneOutgoing,  iconColor: 'text-purple-400', label: 'Transferred' },
  callback:   { bar: '#fb923c', icon: PhoneIncoming,  iconColor: 'text-orange-400', label: 'Callback' },
};

function getOutcomeConfig(outcome: string) {
  return OUTCOME_CONFIG[outcome?.toLowerCase()] ?? {
    bar: '#6b7280', icon: Phone, iconColor: 'text-gray-400', label: outcome || 'Unknown',
  };
}

function fmtPhone(num: string): string {
  if (!num) return 'Unknown';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  if (clean.length === 10 && clean.startsWith('0')) return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  return num;
}

function fmtDuration(secs?: number): string {
  if (!secs) return '';
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const FILTERS = ['All', 'Booked', 'Emergency', 'Lead', 'No Action', 'Transferred'];

function TranscriptBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === 'assistant';
  return (
    <div className={clsx('flex gap-2.5', isAI ? 'justify-start' : 'justify-end')}>
      {isAI && (
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Phone size={10} className="text-blue-400" />
        </div>
      )}
      <div className={clsx(
        'max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
        isAI
          ? 'bg-white/8 text-gray-200 rounded-tl-sm border border-white/6'
          : 'bg-blue-600/80 text-white rounded-tr-sm'
      )}>
        {msg.content}
      </div>
      {!isAI && (
        <div className="w-6 h-6 rounded-full bg-gray-600/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={10} className="text-gray-400" />
        </div>
      )}
    </div>
  );
}

export function CallsPage() {
  useEffect(() => { document.title = 'Calls | TradeDesk'; }, []);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.get<Call[]>('/calls');
      setCalls(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = calls.filter(c => {
    if (filter !== 'All' && c.outcome?.toLowerCase() !== filter.toLowerCase()) return false;
    if (search && !c.callerNumber?.includes(search) && !c.summary?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggle = (id: string) => setExpanded(e => e === id ? null : id);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white tracking-tight">Calls</h1>
          <p className="text-xs text-gray-600 mt-0.5">{calls.length} total · AI-handled</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-white bg-white/4 hover:bg-white/8 border border-white/7 transition-all min-h-[38px]">
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search number or summary…"
            className="w-full bg-white/4 border border-white/7 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-colors min-h-[42px]" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap sm:flex-nowrap">
          <Filter size={13} className="self-center text-gray-600 flex-shrink-0 ml-1 hidden sm:block" />
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-2 rounded-xl text-xs font-medium transition-all border min-h-[38px] whitespace-nowrap',
                filter === f
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                  : 'bg-white/3 border-white/7 text-gray-500 hover:text-gray-200 hover:border-white/15'
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Calls list */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/7 py-14 text-center" style={{ background: 'rgba(13,20,38,0.5)' }}>
          <div className="w-14 h-14 bg-blue-500/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Phone size={24} className="text-blue-400/30" />
          </div>
          <p className="text-sm font-semibold text-gray-400 mb-1">No calls found</p>
          <p className="text-xs text-gray-600">
            {search || filter !== 'All' ? 'Try adjusting your filters.' : 'Calls will appear here once your AI starts answering.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/7 overflow-hidden" style={{ background: 'rgba(13,20,38,0.5)' }}>
          {filtered.map((call, idx) => {
            const cfg = getOutcomeConfig(call.outcome);
            const isOpen = expanded === call.id;
            const CallIcon = cfg.icon;

            return (
              <div key={call.id} className={clsx('border-white/5', idx > 0 && 'border-t')}>
                {/* Row */}
                <button
                  onClick={() => toggle(call.id)}
                  className="w-full flex items-center gap-0 hover:bg-white/3 transition-colors text-left group">
                  {/* Coloured outcome bar */}
                  <div className="w-[3px] self-stretch flex-shrink-0 rounded-r"
                    style={{ background: cfg.bar, boxShadow: `0 0 8px ${cfg.bar}60` }} />

                  <div className="flex items-center gap-3 flex-1 px-4 py-3.5 min-w-0">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cfg.bar}18`, border: `1px solid ${cfg.bar}30` }}>
                      <CallIcon size={15} className={cfg.iconColor} />
                    </div>

                    {/* Number + summary */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-white">{fmtPhone(call.callerNumber)}</span>
                        <OutcomeBadge outcome={call.outcome} />
                        {call.durationSeconds && (
                          <span className="text-xs text-gray-700 flex items-center gap-1">
                            <Clock size={10} />
                            {fmtDuration(call.durationSeconds)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{call.summary || 'No summary available'}</p>
                    </div>

                    {/* Time + chevron */}
                    <div className="flex-shrink-0 flex items-center gap-2.5 ml-2">
                      <span className="hidden sm:block text-xs text-gray-700 whitespace-nowrap">
                        {call.createdAt ? formatDistanceToNow(new Date(call.createdAt), { addSuffix: true }) : ''}
                      </span>
                      <ChevronDown size={14} className={clsx(
                        'text-gray-600 transition-transform duration-200',
                        isOpen && 'rotate-180 text-blue-400'
                      )} />
                    </div>
                  </div>
                </button>

                {/* Expanded transcript */}
                {isOpen && (
                  <div className="border-t border-white/5 px-4 pb-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="pt-3 mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      {call.createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(call.createdAt), 'dd MMM yyyy · HH:mm')}
                        </span>
                      )}
                      {call.durationSeconds && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} />
                          Duration: {fmtDuration(call.durationSeconds)}
                        </span>
                      )}
                      {call.turns && (
                        <span className="flex items-center gap-1">
                          <MessageSquare size={10} />
                          {call.turns} turns
                        </span>
                      )}
                    </div>

                    {/* Summary pill */}
                    {call.summary && (
                      <div className="mb-3 px-3.5 py-2.5 rounded-xl text-xs text-gray-300 border border-white/6"
                        style={{ background: 'rgba(59,130,246,0.06)' }}>
                        <span className="text-blue-400 font-semibold text-[10px] uppercase tracking-wider">AI Summary · </span>
                        {call.summary}
                      </div>
                    )}

                    {/* Transcript */}
                    {call.transcript && call.transcript.length > 0 ? (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {call.transcript.map((msg, i) => <TranscriptBubble key={i} msg={msg} />)}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-700 italic">No transcript available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-gray-700 pb-2">
          Showing {filtered.length} of {calls.length} calls
        </p>
      )}
    </div>
  );
}
