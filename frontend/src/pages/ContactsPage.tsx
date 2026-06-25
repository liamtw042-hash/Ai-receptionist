import { useEffect, useState } from 'react';
import { Users, Search, Phone, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Contact {
  id: string;
  phoneNumber: string;
  name: string;
  notes: string;
  lastInteraction: string;
  createdAt: string;
}

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Contact[]>('/contacts').then(setContacts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phoneNumber?.includes(search)
  );

  const saveName = async () => {
    if (!editing) return;
    await api.patch(`/contacts/${editing.id}`, { name: editing.name });
    setContacts(cs => cs.map(c => c.id === editing.id ? { ...c, name: editing.name } : c));
    setEditing(null);
  };

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-1">
        <div className="h-7 w-28 skeleton rounded-lg" />
        <div className="h-4 w-40 skeleton rounded-md" />
      </div>
      <div className="h-10 w-full skeleton rounded-xl" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{contacts.length} callers on record</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or number…"
          className="w-full glass rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
        />
      </div>

      {contacts.length === 0 ? (
        <Card>
          <div className="text-center py-14 text-gray-600">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-purple-400 opacity-60" />
            </div>
            <p className="font-medium text-gray-400 mb-1">No contacts yet</p>
            <p className="text-sm text-gray-600">Callers are automatically saved here after their first call.</p>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-gray-600">
            <Search size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No contacts match "{search}"</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(contact => (
            <Card key={contact.id} hover className="animate-fade-in">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
                  {(contact.name || contact.phoneNumber || '?')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {editing?.id === contact.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                        onBlur={saveName}
                        onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(null); }}
                        className="glass rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500/60 w-full max-w-[180px]"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing({ id: contact.id, name: contact.name || '' })}
                      className="font-medium text-white text-sm hover:text-blue-400 transition-colors text-left"
                    >
                      {contact.name || <span className="text-gray-500 italic">Unnamed caller</span>}
                    </button>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{formatPhone(contact.phoneNumber)}</p>
                  {contact.lastInteraction && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Last contact {formatDistanceToNow(new Date(contact.lastInteraction), { addSuffix: true })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/dashboard/calls`)}
                    className="w-8 h-8 glass rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all duration-200"
                    title="View calls"
                  >
                    <Phone size={14} />
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/sms`)}
                    className="w-8 h-8 glass rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all duration-200"
                    title="Send SMS"
                  >
                    <MessageSquare size={14} />
                  </button>
                </div>
              </div>
            </Card>
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
