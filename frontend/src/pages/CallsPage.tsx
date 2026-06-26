import { useEffect, useState } from 'react';
import { Phone, ChevronDown, PhoneIncoming, Search, Table2 } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { OutcomeBadge } from '../components/ui/Badge';
import { SkeletonRow } from '../components/ui/Skeleton';
import { formatDistanceToNow, format } from 'date-fns';

interface Call { id: string; callerNumber: string; outcome: string; summary: string; createdAt: string; turns: number; googleSheetLogged?: boolean; }
interface CallDetail { id: string; callerNumber: string; outcome: string; summary: string; createdAt: string; turns: Array<{ role: string; content: string; timestamp: string }>; }

const OUTCOME_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'job_booked', label: 'Job Booked' },
  { key: 'quote_given', label: 'Quote Given' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'callback_needed', label: 'Callback Needed' },
];

export function CallsPage() {
  useEffect(() => { document.title = 'Calls | TradeDesk'; }, []);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<Call[]>('/calls').then(setCalls).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    setExpanded(id);
    setLoadingDetail(true);
    try {
      const d = await api.get<CallDetail>(`/calls/${id}`);
      setDetail(d);
    } catch { /* ignore */ } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = calls
    .filter(c => filter === 'all' || c.outcome === filter)
    .filter(c => !search || c.callerNumber?.includes(search) || c.summary?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <div className="h-7 w-24 skeleton rounded-lg" />
      <div className="flex gap-2 flex-wrap">
        {[...Array(5)].map((_, i) => <div key={i} className="h-8 w-24 skeleton rounded-lg" />)}
      </div>
      <div className="space-y-2">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Calls</h1>
        <p className="text-gray-500 text-sm mt-0.5">{calls.length} total</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search calls by number or transcript…"
          className="glass w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {OUTCOME_FILTERS.map(f => {
          const count = f.key === 'all' ? calls.length : calls.filter(c => c.outcome === f.key).length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                filter === f.key
                  ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'glass text-gray-400 hover:text-white hover:border-white/20 border-transparent'
              }`}>
              {f.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  filter === f.key ? 'bg-white/25 text-white' : 'bg-white/8 text-gray-500'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl border border-white/8 text-center py-16">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl" />
            <div className="relative w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <PhoneIncoming size={26} className="text-blue-400/50" />
            </div>
          </div>
          <p className="font-semibold text-gray-300 mb-1">
            {filter === 'all' && !search ? 'No calls yet' : 'No matching calls'}
          </p>
          <p className="text-sm text-gray-600 max-w-xs mx-auto">
            {filter === 'all' && !search
              ? "Once your AI answers its first call, you'll see the full transcript here."
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(call => (
            <div key={call.id} className="animate-fade-in">
              <div
                onClick={() => toggleExpand(call.id)}
                className={`glass rounded-xl p-4 cursor-pointer transition-all duration-200 hover:border-white/15 hover:bg-white/[0.04] ${
                  expanded === call.id ? 'rounded-b-none border-b-0' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Phone size={15} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-white text-sm">{formatPhone(call.callerNumber)}</span>
                      <OutcomeBadge outcome={call.outcome} />
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{call.summary || 'No summary available'}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-600">{call.createdAt ? format(new Date(call.createdAt), 'dd MMM, h:mm a') : '—'}</span>
                      {call.turns > 0 && <span className="text-xs text-gray-700">{call.turns} exchanges</span>}
                      {call.googleSheetLogged && (
                        <span title="Logged to Google Sheets" className="flex items-center gap-1 text-xs text-emerald-500">
                          <Table2 size={11} /> Sheet
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-gray-600 flex-shrink-0 transition-transform duration-200 ${expanded === call.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {expanded === call.id && (
                <div className="glass rounded-t-none rounded-b-xl border-t border-white/5 px-5 pb-5 pt-4 space-y-4 animate-fade-in">
                  {loadingDetail ? (
                    <div className="space-y-2">
                      <div className="h-3 w-20 skeleton rounded" />
                      {[...Array(3)].map((_, i) => <div key={i} className="h-4 skeleton rounded" />)}
                    </div>
                  ) : detail ? (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Summary</p>
                        <p className="text-sm text-gray-300 leading-relaxed">{detail.summary}</p>
                      </div>
                      {detail.turns?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Transcript</p>
                          <div className="space-y-2">
                            {detail.turns.map((t, i) => (
                              <div key={i} className={`flex ${t.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-xs lg:max-w-md px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                  t.role === 'assistant'
                                    ? 'bg-blue-500/20 text-blue-100 rounded-tl-sm border border-blue-500/15'
                                    : 'bg-white/8 text-gray-200 rounded-tr-sm'
                                }`}>
                                  <p className="text-[10px] font-semibold opacity-50 mb-0.5">{t.role === 'assistant' ? 'TradeDesk AI' : 'Caller'}</p>
                                  {t.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}
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
