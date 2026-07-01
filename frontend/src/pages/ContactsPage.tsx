import { useEffect, useState } from 'react';
import {
  Phone, MessageSquare, Users, Search, ChevronUp, ChevronDown,
  ArrowUpRight, MoreHorizontal, Mail, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { SkeletonRow } from '../components/ui/Skeleton';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface Contact {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  trade?: string;
  callCount?: number;
  lastContact?: string;
  totalCalls?: number;
  tags?: string[];
}

const TRADE_COLORS: Record<string, { bg: string; text: string }> = {
  plumber:      { bg: 'bg-blue-500/15 border-blue-500/25',     text: 'text-blue-400' },
  electrician:  { bg: 'bg-yellow-500/15 border-yellow-500/25', text: 'text-yellow-400' },
  builder:      { bg: 'bg-orange-500/15 border-orange-500/25', text: 'text-orange-400' },
  hvac:         { bg: 'bg-cyan-500/15 border-cyan-500/25',     text: 'text-cyan-400' },
  locksmith:    { bg: 'bg-purple-500/15 border-purple-500/25', text: 'text-purple-400' },
  cleaner:      { bg: 'bg-green-500/15 border-green-500/25',   text: 'text-green-400' },
};
const defaultTrade = { bg: 'bg-white/8 border-white/12', text: 'text-gray-400' };

function getTradeColors(trade?: string) {
  if (!trade) return defaultTrade;
  return TRADE_COLORS[trade.toLowerCase()] ?? defaultTrade;
}

function avatarInitials(contact: Contact): string {
  if (contact.name) {
    return contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  const clean = contact.phone.replace(/\D/g, '');
  return clean.slice(-2);
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-purple-500',
  'from-green-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-blue-500',
  'from-emerald-500 to-green-500',
];

function fmtPhone(num: string): string {
  if (!num) return '—';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  if (clean.length === 10 && clean.startsWith('0')) return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  return num;
}

type SortKey = 'name' | 'lastContact' | 'totalCalls';
type SortDir = 'asc' | 'desc';

export function ContactsPage() {
  useEffect(() => { document.title = 'Contacts | TradeDesk'; }, []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastContact');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Contact[]>('/contacts')
      .then(setContacts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...contacts]
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.name?.toLowerCase().includes(q) || c.phone.includes(q) || c.trade?.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      let va: string | number = '', vb: string | number = '';
      if (sortKey === 'name') { va = a.name ?? a.phone; vb = b.name ?? b.phone; }
      if (sortKey === 'lastContact') { va = a.lastContact ?? ''; vb = b.lastContact ?? ''; }
      if (sortKey === 'totalCalls') { va = a.totalCalls ?? a.callCount ?? 0; vb = b.totalCalls ?? b.callCount ?? 0; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button onClick={() => toggleSort(col)}
      className={clsx(
        'flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors',
        sortKey === col ? 'text-blue-400' : 'text-gray-600 hover:text-gray-300'
      )}>
      {label}
      {sortKey === col ? (
        sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
      ) : (
        <span className="w-2" />
      )}
    </button>
  );

  return (
    <div className="space-y-4 animate-slide-up" onClick={() => setActiveMenu(null)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white tracking-tight">Contacts</h1>
          <p className="text-xs text-gray-600 mt-0.5">{contacts.length} callers in your CRM</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, or trade…"
          className="w-full bg-white/4 border border-white/7 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-colors min-h-[42px]" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/7 py-14 text-center" style={{ background: 'rgba(13,20,38,0.5)' }}>
          <div className="w-14 h-14 bg-blue-500/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-blue-400/30" />
          </div>
          <p className="text-sm font-semibold text-gray-400 mb-1">No contacts yet</p>
          <p className="text-xs text-gray-600 max-w-[200px] mx-auto">Callers are automatically added when your AI handles a call.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/7 overflow-hidden" style={{ background: 'rgba(13,20,38,0.5)' }}>
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-4 py-3 border-b border-white/6"
            style={{ background: 'rgba(0,0,0,0.25)' }}>
            <SortBtn col="name" label="Name / Number" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Trade</span>
            <SortBtn col="lastContact" label="Last call" />
            <SortBtn col="totalCalls" label="Total calls" />
            <span className="w-8" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {sorted.map((contact, idx) => {
              const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
              const tc = getTradeColors(contact.trade);
              const calls = contact.totalCalls ?? contact.callCount ?? 0;
              const isMenuOpen = activeMenu === contact.id;

              return (
                <div key={contact.id}
                  className="flex sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 items-center px-4 py-3.5 hover:bg-white/3 transition-colors group">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm`}>
                      {avatarInitials(contact)}
                    </div>
                    <div className="min-w-0">
                      {contact.name && <p className="text-sm font-semibold text-white truncate">{contact.name}</p>}
                      <p className={clsx('text-xs truncate', contact.name ? 'text-gray-500' : 'text-sm font-semibold text-white')}>
                        {fmtPhone(contact.phone)}
                      </p>
                    </div>
                  </div>

                  {/* Trade */}
                  <div className="hidden sm:flex">
                    {contact.trade ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg border capitalize ${tc.bg} ${tc.text}`}>
                        {contact.trade}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-700">—</span>
                    )}
                  </div>

                  {/* Last call */}
                  <div className="hidden sm:block text-xs text-gray-500">
                    {contact.lastContact
                      ? formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true })
                      : '—'}
                  </div>

                  {/* Call count */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[...Array(Math.min(calls, 5))].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500/60" />
                      ))}
                      {calls > 5 && <span className="text-[10px] text-gray-600 ml-1">+{calls - 5}</span>}
                    </div>
                    <span className="text-sm font-semibold text-white tabular-nums">{calls}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto sm:ml-0">
                    {/* Mobile quick stats */}
                    <span className="sm:hidden text-xs text-gray-600">{calls} calls</span>

                    <button
                      onClick={e => { e.stopPropagation(); navigate('/dashboard/calls'); }}
                      title="View calls"
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-blue-500/15 flex items-center justify-center text-gray-500 hover:text-blue-400 transition-all border border-white/5 hover:border-blue-500/25">
                      <Phone size={12} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate('/dashboard/sms'); }}
                      title="Send SMS"
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-green-500/15 flex items-center justify-center text-gray-500 hover:text-green-400 transition-all border border-white/5 hover:border-green-500/25">
                      <MessageSquare size={12} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setActiveMenu(isMenuOpen ? null : contact.id); }}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-all border border-white/5">
                        <MoreHorizontal size={12} />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-9 w-40 rounded-xl border border-white/10 shadow-2xl shadow-black/60 z-20 overflow-hidden"
                          style={{ background: '#0d1426' }}
                          onClick={e => e.stopPropagation()}>
                          {contact.email && (
                            <button className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-gray-300 hover:bg-white/8 hover:text-white transition-colors text-left">
                              <Mail size={12} className="text-gray-600" />Email
                            </button>
                          )}
                          <button className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-gray-300 hover:bg-white/8 hover:text-white transition-colors text-left">
                            <ArrowUpRight size={12} className="text-gray-600" />View history
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <p className="text-center text-xs text-gray-700 pb-2">
          {sorted.length} contact{sorted.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
