import { useEffect, useState } from 'react';
import { Users, Search, Phone, MessageSquare, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { SkeletonRow } from '../components/ui/Skeleton';
import { formatDistanceToNow } from 'date-fns';

interface Contact {
  id: string;
  name: string;
  phone: string;
  tradeType?: string;
  lastContact?: string;
  totalCalls?: number;
  notes?: string;
}

const TRADE_COLORS: Record<string, { bg: string; text: string }> = {
  plumber:       { bg: 'bg-blue-500/15',   text: 'text-blue-400' },
  electrician:   { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  carpenter:     { bg: 'bg-amber-500/15',  text: 'text-amber-400' },
  roofer:        { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  landscaper:    { bg: 'bg-green-500/15',  text: 'text-green-400' },
  hvac:          { bg: 'bg-cyan-500/15',   text: 'text-cyan-400' },
  locksmith:     { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  concreter:     { bg: 'bg-stone-500/15',  text: 'text-stone-400' },
  default:       { bg: 'bg-gray-500/15',   text: 'text-gray-400' },
};

const AVATAR_COLORS = [
  'from-blue-500 to-purple-500',
  'from-green-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-purple-500 to-pink-500',
  'from-cyan-500 to-blue-500',
  'from-yellow-500 to-orange-500',
];

export function ContactsPage() {
  useEffect(() => { document.title = 'Contacts | TradeDesk'; }, []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<Contact[]>('/contacts').then(setContacts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.tradeType?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <div className="h-7 w-28 skeleton rounded-lg" />
      <div className="h-10 w-full skeleton rounded-xl" />
      <div className="space-y-2">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Contacts</h1>
        <p className="text-gray-500 text-sm mt-0.5">{contacts.length} callers in your CRM</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or trade…"
          className="glass w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl border border-white/8 text-center py-16">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl" />
            <div className="relative w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Users size={26} className="text-blue-400/50" />
            </div>
          </div>
          <p className="font-semibold text-gray-300 mb-1">
            {search ? 'No matching contacts' : 'No contacts yet'}
          </p>
          <p className="text-sm text-gray-600 max-w-xs mx-auto">
            {search ? 'Try a different search term.' : 'Contacts are automatically created from incoming calls.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((contact, i) => {
            const tradeKey = contact.tradeType?.toLowerCase() ?? 'default';
            const tradeStyle = TRADE_COLORS[tradeKey] ?? TRADE_COLORS.default;
            const avatarGrad = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const initials = contact.name
              ? contact.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              : contact.phone?.[0] ?? '?';

            return (
              <div key={contact.id} className="glass rounded-xl p-4 border border-white/8 hover:border-white/15 hover:bg-white/[0.03] transition-all duration-200 flex flex-col gap-3 animate-fade-in">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white text-sm truncate">{contact.name || formatPhone(contact.phone)}</p>
                    <p className="text-xs text-gray-500 truncate">{formatPhone(contact.phone)}</p>
                  </div>
                  {contact.tradeType && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${tradeStyle.bg} ${tradeStyle.text}`}>
                      {contact.tradeType}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  {(contact.totalCalls ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <Phone size={11} className="text-blue-400/60" />
                      <span>{contact.totalCalls} call{contact.totalCalls !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {contact.lastContact && (
                    <div className="flex items-center gap-1">
                      <Clock size={11} className="text-gray-600" />
                      <span>{formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>

                {contact.notes && (
                  <p className="text-xs text-gray-500 line-clamp-2 border-t border-white/5 pt-2">{contact.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-1">
                  <a href={`tel:${contact.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium py-1.5 rounded-lg transition-all duration-200">
                    <Phone size={12} /> Call
                  </a>
                  <a href={`sms:${contact.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium py-1.5 rounded-lg transition-all duration-200">
                    <MessageSquare size={12} /> SMS
                  </a>
                </div>
              </div>
            );
          })}
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
