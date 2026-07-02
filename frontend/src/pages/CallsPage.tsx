import { useEffect, useState } from 'react';
import {
  Phone, ChevronDown, Search, PhoneIncoming, PhoneOutgoing,
  PhoneMissed, Clock, User, MessageSquare, RefreshCw, X, Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api';
import { OutcomeBadge } from '../components/ui/Badge';
import { SkeletonRow } from '../components/ui/Skeleton';
import { staggerContainer, staggerItem, instantContainer, instantItem } from '../lib/motion';
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

// Transcript line — clear speaker distinction. The AI (orange = your product
// working) sits left with an attributed label; the caller sits right, quieter.
// Real typographic hierarchy: a small speaker label above a comfortable-width
// message bubble, not monospace dumped in a box.
function TranscriptLine({ msg }: { msg: Message }) {
  const isAI = msg.role === 'assistant';
  return (
    <div className={clsx('flex gap-2.5', isAI ? 'justify-start' : 'justify-end')}>
      {isAI && (
        <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0 mt-4">
          <Sparkles size={12} className="text-orange-400" />
        </div>
      )}
      <div className={clsx('max-w-[80%] min-w-0', isAI ? 'items-start' : 'items-end flex flex-col')}>
        <span className={clsx(
          'text-[10px] font-bold uppercase tracking-[0.12em] mb-1 block',
          isAI ? 'text-orange-400/90' : 'text-gray-500 text-right'
        )}>
          {isAI ? 'Your AI' : 'Caller'}
        </span>
        <div className={clsx(
          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
          isAI
            ? 'bg-orange-500/[0.08] text-gray-100 rounded-tl-sm border border-orange-500/15'
            : 'bg-white/[0.06] text-gray-200 rounded-tr-sm border border-white/10'
        )}>
          {msg.content}
        </div>
      </div>
      {!isAI && (
        <div className="w-7 h-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0 mt-4">
          <User size={12} className="text-gray-400" />
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
  const reduceMotion = useReducedMotion();

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

  // Real, honest counts derived from the actual call list — no fabricated series.
  const bookedCount = calls.filter(c => c.outcome?.toLowerCase() === 'booked').length;
  const emergencyCount = calls.filter(c => c.outcome?.toLowerCase() === 'emergency').length;

  const toggle = (id: string) => setExpanded(e => e === id ? null : id);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* ── Header: dominant "answered by your AI" count, real supporting tallies ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-white tracking-tight leading-none">Call log</h1>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              <Sparkles size={12} className="text-orange-400" />
              <strong className="text-white font-semibold tabular-nums">{calls.length}</strong> answered by your AI
            </span>
            {bookedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <strong className="text-green-400 font-semibold tabular-nums">{bookedCount}</strong> booked
              </span>
            )}
            {emergencyCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <strong className="text-red-400 font-semibold tabular-nums">{emergencyCount}</strong> emergency
              </span>
            )}
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-white bg-white/4 hover:bg-white/8 border border-white/7 transition-all min-h-[38px] flex-shrink-0">
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Search + filter — one bar, TradeDesk-specific: orange focus, pill filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search a number or what the call was about…"
            className="w-full bg-white/4 border border-white/7 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all min-h-[42px]" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0 pb-1 sm:pb-0 sm:flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[38px] whitespace-nowrap flex-shrink-0',
                filter === f
                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                  : 'bg-white/3 border-white/7 text-gray-500 hover:text-gray-200 hover:border-white/15'
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calls list ── */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/7 py-14 px-6 text-center" style={{ background: 'rgba(13,20,38,0.5)' }}>
          <div className="w-14 h-14 bg-orange-500/8 border border-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {search || filter !== 'All'
              ? <Search size={22} className="text-orange-400/50" />
              : <Sparkles size={22} className="text-orange-400/60" />}
          </div>
          <p className="text-sm font-bold text-white mb-1.5">
            {search || filter !== 'All' ? 'Nothing matches that yet' : 'Your first call will land right here'}
          </p>
          <p className="text-xs text-gray-500 max-w-[280px] mx-auto leading-relaxed">
            {search || filter !== 'All'
              ? 'Try clearing the search or picking a different outcome.'
              : "The next time you can't pick up, your AI answers, sorts out what the caller needs, and drops the full transcript and outcome here — so you never lose a job to a missed call again."}
          </p>
        </div>
      ) : (
        <motion.div className="rounded-2xl border border-white/7 overflow-hidden" style={{ background: 'rgba(13,20,38,0.5)' }}
          variants={reduceMotion ? instantContainer : staggerContainer(0.04)}
          initial="hidden" animate="show">
          {filtered.map((call, idx) => {
            const cfg = getOutcomeConfig(call.outcome);
            const isOpen = expanded === call.id;
            const CallIcon = cfg.icon;

            return (
              <motion.div key={call.id} variants={reduceMotion ? instantItem : staggerItem}
                className={clsx('border-white/5', idx > 0 && 'border-t', isOpen && 'bg-white/[0.015]')}>
                {/* Row */}
                <button
                  onClick={() => toggle(call.id)}
                  className="w-full flex items-center gap-0 hover:bg-white/3 transition-colors text-left group">
                  {/* Coloured outcome rail — semantic status, glows like the sidebar active rail */}
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
                        isOpen && 'rotate-180 text-orange-400'
                      )} />
                    </div>
                  </div>
                </button>

                {/* Expanded transcript */}
                {isOpen && (
                  <div className="border-t border-white/5 px-4 pb-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="pt-3 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                      {call.createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(call.createdAt), 'dd MMM yyyy · HH:mm')}
                        </span>
                      )}
                      {call.durationSeconds && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} />
                          {fmtDuration(call.durationSeconds)} on the line
                        </span>
                      )}
                      {call.turns && (
                        <span className="flex items-center gap-1">
                          <MessageSquare size={10} />
                          {call.turns} turns
                        </span>
                      )}
                    </div>

                    {/* AI summary — orange = your AI's own read on the call */}
                    {call.summary && (
                      <div className="mb-4 px-3.5 py-3 rounded-xl border border-orange-500/15"
                        style={{ background: 'rgba(249,115,22,0.06)' }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles size={11} className="text-orange-400" />
                          <span className="text-orange-400 font-bold text-[10px] uppercase tracking-[0.12em]">AI summary</span>
                        </div>
                        <p className="text-sm text-gray-200 leading-relaxed">{call.summary}</p>
                      </div>
                    )}

                    {/* Transcript */}
                    {call.transcript && call.transcript.length > 0 ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 mb-3">Full transcript</p>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                          {call.transcript.map((msg, i) => <TranscriptLine key={i} msg={msg} />)}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No transcript was captured for this call.</p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-gray-700 pb-2">
          Showing {filtered.length} of {calls.length} call{calls.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
