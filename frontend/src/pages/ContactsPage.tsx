import { useEffect, useState } from 'react';
import { Users, Search, Phone, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
          placeholder="Search by name or number..."
          className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? 'No contacts match your search' : 'No contacts yet — they appear automatically after calls'}</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(contact => (
            <Card key={contact.id} className="animate-fade-in">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold">
                  {(contact.name || contact.phoneNumber)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  {editing?.id === contact.id ? (
                    <input
                      value={editing.name}
                      onChange={e => setEditing({ id: contact.id, name: e.target.value })}
                      onBlur={saveName}
                      onKeyDown={e => e.key === 'Enter' && saveName()}
                      className="bg-transparent border-b border-blue-500 text-white text-sm font-medium focus:outline-none w-full"
                      autoFocus
                    />
                  ) : (
                    <button onClick={() => setEditing({ id: contact.id, name: contact.name || '' })}
                      className="text-sm font-medium text-white hover:text-blue-400 transition-colors text-left">
                      {contact.name || <span className="text-gray-500 italic">Add name</span>}
                    </button>
                  )}
                  <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                </div>
              </div>

              {contact.notes && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{contact.notes}</p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {contact.lastInteraction ? formatDistanceToNow(new Date(contact.lastInteraction), { addSuffix: true }) : 'Never'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/dashboard/sms?contact=${encodeURIComponent(contact.phoneNumber)}`)}
                    className="w-7 h-7 glass rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-400 transition-colors">
                    <MessageSquare size={13} />
                  </button>
                  <a href={`tel:${contact.phoneNumber}`}
                    className="w-7 h-7 glass rounded-lg flex items-center justify-center text-gray-400 hover:text-green-400 transition-colors">
                    <Phone size={13} />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
