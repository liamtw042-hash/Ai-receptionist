import { useEffect, useState } from 'react';
import {
  Phone, MessageSquare, Users, Search, ChevronUp, ChevronDown,
  Mail, X, Sparkles, Wrench, Clock, ArrowRight,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api';
import { SkeletonRow } from '../components/ui/Skeleton';
import { staggerContainer, staggerItem, instantContainer, instantItem } from '../lib/motion';
import { formatDistanceToNow, format } from 'date-fns';
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

function avatarInitials(contact: Contact): string {
  if (contact.name) {
    return contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  const clean = contact.phone.replace(/\D/g, '');
  return clean.slice(-2);
}

function fmtPhone(num: string): string {
  if (!num) return '—';
  const clean = num.replace(/\D/g, '');
  if (clean.startsWith('61') && clean.length === 11) return `0${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  if (clean.length === 10 && clean.startsWith('0')) return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  return num;
}

function callCountOf(c: Contact): number {
  return c.totalCalls ?? c.callCount ?? 0;
}

type SortKey = 'name' | 'lastContact' | 'totalCalls';
type SortDir = 'asc' | 'desc';

// ── Contact detail — a premium slide-in panel, not a plain data dump ──────────
function ContactDetail({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const calls = callCountOf(contact);

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end" onClick={onClose}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md h-full flex flex-col overflow-y-auto border-l border-white/10"
        style={{ background: 'linear-gradient(160deg,#17191e 0%,#0a0f1d 100%)', boxShadow: '-24px 0 64px rgba(0,0,0,0.5)' }}
        initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
        animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/6 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">Contact</span>
          <button onClick={onClose} className="text-gray-600 hover:text-white p-1.5 -mr-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Identity block */}
        <div className="px-5 pt-6 pb-5 border-b border-white/6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/12 flex items-center justify-center text-xl font-black text-gray-200 flex-shrink-0">
              {avatarInitials(contact)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white tracking-tight truncate">
                {contact.name || fmtPhone(contact.phone)}
              </h2>
              {contact.name && <p className="text-sm text-gray-500 mt-0.5">{fmtPhone(contact.phone)}</p>}
              {contact.trade && (
                <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-orange-500/25 bg-orange-500/10 text-orange-400 capitalize">
                  <Wrench size={9} /> {contact.trade}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-white/6 border-b border-white/6">
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Calls handled</p>
            <p className="text-2xl font-black text-white tabular-nums mt-1">{calls}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Last spoke</p>
            <p className="text-sm font-semibold text-white mt-1.5">
              {contact.lastContact ? formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true }) : 'No calls yet'}
            </p>
            {contact.lastContact && (
              <p className="text-[11px] text-gray-600 mt-0.5">{format(new Date(contact.lastContact), 'd MMM yyyy')}</p>
            )}
          </div>
        </div>

        {/* Contact details */}
        <div className="px-5 py-4 space-y-2.5 border-b border-white/6">
          <div className="flex items-center gap-3 text-sm">
            <Phone size={14} className="text-gray-600 flex-shrink-0" />
            <span className="text-gray-300">{fmtPhone(contact.phone)}</span>
          </div>
          {contact.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail size={14} className="text-gray-600 flex-shrink-0" />
              <span className="text-gray-300 truncate">{contact.email}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-5 mt-auto space-y-2">
          <button onClick={() => navigate('/dashboard/sms')}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold px-4 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20">
            <MessageSquare size={15} /> Send an SMS
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('/dashboard/calls')}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/8 border border-white/8 px-4 py-2.5 rounded-xl transition-all">
              <Phone size={13} /> Call history
            </button>
            {contact.email ? (
              <a href={`mailto:${contact.email}`}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/8 border border-white/8 px-4 py-2.5 rounded-xl transition-all">
                <Mail size={13} /> Email
              </a>
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-xl cursor-not-allowed">
                <Mail size={13} /> No email
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ContactsPage() {
  useEffect(() => { document.title = 'Contacts | TradeDesk'; }, []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastContact');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [detail, setDetail] = useState<Contact | null>(null);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

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
      if (sortKey === 'totalCalls') { va = callCountOf(a); vb = callCountOf(b); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortChip = ({ col, label }: { col: SortKey; label: string }) => {
    const active = sortKey === col;
    return (
      <button onClick={() => toggleSort(col)}
        className={clsx(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
          active
            ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
            : 'bg-white/3 border-white/7 text-gray-500 hover:text-gray-200 hover:border-white/15'
        )}>
        {label}
        {active && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
      </button>
    );
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-white tracking-tight leading-none">Contacts</h1>
          <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-1.5">
            <Sparkles size={12} className="text-orange-400" />
            <strong className="text-white font-semibold tabular-nums">{contacts.length}</strong> caller{contacts.length !== 1 ? 's' : ''} your AI has saved for you
          </p>
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, or trade…"
            className="w-full bg-white/4 border border-white/7 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all min-h-[42px]" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider hidden sm:block mr-0.5">Sort</span>
          <SortChip col="lastContact" label="Recent" />
          <SortChip col="totalCalls" label="Calls" />
          <SortChip col="name" label="Name" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/7 py-14 px-6 text-center" style={{ background: 'rgba(15,17,20,0.5)' }}>
          <div className="w-14 h-14 bg-orange-500/8 border border-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {search ? <Search size={22} className="text-orange-400/50" /> : <Users size={22} className="text-orange-400/60" />}
          </div>
          <p className="text-sm font-bold text-white mb-1.5">
            {search ? 'No one matches that' : 'Your address book fills itself'}
          </p>
          <p className="text-xs text-gray-500 max-w-[280px] mx-auto leading-relaxed">
            {search
              ? 'Try a different name, number or trade.'
              : "Every caller your AI speaks to gets saved right here — name, trade and call history included. You'll never have to jot a number on a scrap of paper again."}
          </p>
        </div>
      ) : (
        <motion.div className="space-y-2"
          variants={reduceMotion ? instantContainer : staggerContainer(0.035)}
          initial="hidden" animate="show">
          {sorted.map((contact) => {
            const calls = callCountOf(contact);
            return (
              <motion.div
                key={contact.id}
                variants={reduceMotion ? instantItem : staggerItem}
                role="button"
                tabIndex={0}
                onClick={() => setDetail(contact)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetail(contact); } }}
                className="w-full text-left rounded-2xl border border-white/7 hover:border-orange-500/25 px-4 py-3.5 flex items-center gap-3.5 transition-all group hover:bg-white/[0.02] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
                style={{ background: 'rgba(15,17,20,0.5)' }}>
                {/* Avatar — solid tile, consistent with sidebar/Overview (no rainbow) */}
                <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 group-hover:border-orange-500/30 flex items-center justify-center text-sm font-black text-gray-200 flex-shrink-0 transition-colors">
                  {avatarInitials(contact)}
                </div>

                {/* Primary identity — most-relevant info prominent */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">
                      {contact.name || fmtPhone(contact.phone)}
                    </span>
                    {contact.trade && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-orange-500/20 bg-orange-500/8 text-orange-400/90 capitalize">
                        {contact.trade}
                      </span>
                    )}
                  </div>
                  {/* Secondary info — quieter */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {contact.name && <span className="truncate">{fmtPhone(contact.phone)}</span>}
                    {contact.name && contact.lastContact && <span className="text-gray-700">·</span>}
                    {contact.lastContact && (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Clock size={10} className="flex-shrink-0" />
                        {formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Call count + quick actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-white tabular-nums">{calls}</span>
                    <span className="text-[11px] text-gray-600 ml-1">{calls === 1 ? 'call' : 'calls'}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); navigate('/dashboard/calls'); }}
                      title="View call history"
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-orange-500/15 flex items-center justify-center text-gray-500 hover:text-orange-400 transition-all border border-white/5 hover:border-orange-500/25">
                      <Phone size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate('/dashboard/sms'); }}
                      title="Send SMS"
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-green-500/15 flex items-center justify-center text-gray-500 hover:text-green-400 transition-all border border-white/5 hover:border-green-500/25">
                      <MessageSquare size={13} />
                    </button>
                  </div>
                  <ArrowRight size={15} className="text-gray-700 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {!loading && sorted.length > 0 && (
        <p className="text-center text-xs text-gray-700 pb-2">
          {sorted.length} contact{sorted.length !== 1 ? 's' : ''}
        </p>
      )}

      <AnimatePresence>
        {detail && <ContactDetail contact={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </div>
  );
}
