import { useEffect, useState } from 'react';
import { Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { OutcomeBadge } from '../components/ui/Badge';
import { formatDistanceToNow, format } from 'date-fns';

interface Call {
  id: string;
  callerNumber: string;
  outcome: string;
  summary: string;
  createdAt: string;
  turns: number;
}

interface CallDetail {
  id: string;
  callerNumber: string;
  outcome: string;
  summary: string;
  createdAt: string;
  turns: Array<{ role: string; content: string; timestamp: string }>;
}

export function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const OUTCOME_FILTERS = ['all', 'job_booked', 'quote_given', 'callback_needed', 'emergency'];
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? calls : calls.filter(c => c.outcome === filter);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Calls</h1>
          <p className="text-gray-500 text-sm mt-0.5">{calls.length} total</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {OUTCOME_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f ? 'bg-blue-500 text-white' : 'glass text-gray-400 hover:text-white'
            }`}>
            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <Phone size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No calls yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(call => (
            <div key={call.id} className="animate-fade-in">
              <Card hover onClick={() => toggleExpand(call.id)} className="cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Phone size={16} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-white text-sm">{formatPhone(call.callerNumber)}</span>
                      <OutcomeBadge outcome={call.outcome} />
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{call.summary || 'No summary'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600">
                        {call.createdAt ? format(new Date(call.createdAt), 'dd MMM, h:mm a') : '—'}
                      </span>
                      <span className="text-xs text-gray-600">{call.turns} turns</span>
                    </div>
                  </div>
                  <div className="text-gray-600 flex-shrink-0">
                    {expanded === call.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </Card>

              {expanded === call.id && (
                <div className="glass rounded-b-xl border-t-0 -mt-1 px-5 pb-5 pt-4 space-y-4 animate-fade-in">
                  {loadingDetail ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : detail ? (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Summary</p>
                        <p className="text-sm text-gray-300 whitespace-pre-line">{detail.summary}</p>
                      </div>
                      {detail.turns?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Transcript</p>
                          <div className="space-y-2">
                            {detail.turns.map((t, i) => (
                              <div key={i} className={`flex ${t.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm ${
                                  t.role === 'assistant'
                                    ? 'bg-blue-500/20 text-blue-100 rounded-tl-sm'
                                    : 'bg-white/10 text-gray-200 rounded-tr-sm'
                                }`}>
                                  <p className="text-xs font-medium mb-0.5 opacity-60">{t.role === 'assistant' ? 'AI' : 'Caller'}</p>
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
