import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Phone, MessageSquare, Users, Settings,
  Menu, X, LogOut, Zap, Bell, Search,
  CheckCircle, PhoneIncoming, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/dashboard/calls', icon: Phone, label: 'Calls' },
  { to: '/dashboard/sms', icon: MessageSquare, label: 'SMS' },
  { to: '/dashboard/contacts', icon: Users, label: 'Contacts' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/calls': 'Calls',
  '/dashboard/sms': 'SMS Inbox',
  '/dashboard/contacts': 'Contacts',
  '/dashboard/settings': 'Settings',
};

const MOCK_NOTIFS = [
  { id: 1, icon: PhoneIncoming, color: 'text-blue-400', bg: 'bg-blue-500/15', title: 'New call â 0412 345 678', desc: 'Burst pipe emergency Â· urgent', time: '2m ago' },
  { id: 2, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/15', title: 'Job booked!', desc: 'Hot water replacement â Tue 9am', time: '18m ago' },
  { id: 3, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15', title: 'Emergency call flagged', desc: '0438 123 456 â gas leak suspected', time: '1h ago' },
  { id: 4, icon: PhoneIncoming, color: 'text-blue-400', bg: 'bg-blue-500/15', title: 'New call â 0421 987 654', desc: 'Quote request â hot water system', time: '2h ago' },
];

// ââ Command Palette ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function CommandSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const ITEMS = [
    { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Calls', icon: Phone, href: '/dashboard/calls', hint: 'View call transcripts' },
    { label: 'SMS Inbox', icon: MessageSquare, href: '/dashboard/sms', hint: 'Two-way messaging' },
    { label: 'Contacts', icon: Users, href: '/dashboard/contacts', hint: 'Caller CRM' },
    { label: 'Settings', icon: Settings, href: '/dashboard/settings', hint: 'AI & account settings' },
  ];

  const filtered = ITEMS.filter(i =>
    !q || i.label.toLowerCase().includes(q.toLowerCase()) || i.hint?.toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1426] rounded-2xl border border-white/12 shadow-2xl shadow-black/60 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search size={15} className="text-gray-500 flex-shrink-0" />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && filtered[0]) { navigate(filtered[0].href); onClose(); } }}
            placeholder="Search pages and actionsâ¦"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none" />
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors"><X size={14} /></button>
        </div>
        <div className="p-1.5">
          {filtered.map(item => (
            <button key={item.href}
              onClick={() => { navigate(item.href); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/6 transition-colors text-left group">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/15 transition-colors">
                <item.icon size={14} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.hint && <p className="text-xs text-gray-600">{item.hint}</p>}
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-white/6 flex items-center gap-4 text-[10px] text-gray-700">
          <span><kbd className="font-mono">âµ</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
          <span className="ml-auto">âK to toggle</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('td_sidebar') === '1');
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(2);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { logOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email ? user.email[0].toUpperCase()
    : '?';
  const currentPage = PAGE_TITLES[location.pathname] ?? 'Dashboard';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') { setNotifOpen(false); setMobileOpen(false); setCmdOpen(false); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('td_sidebar', next ? '1' : '0');
  };

  const handleLogout = async () => { await logOut(); navigate('/login'); };

  const SidebarNav = ({ isMobile = false }: { isMobile?: boolean }) => (
    <nav className={clsx('flex-1 py-3 space-y-0.5 overflow-y-auto', !isMobile && collapsed ? 'px-2' : 'px-2')}>
      {navItems.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end} title={collapsed && !isMobile ? label : undefined}
          className={({ isActive }) => clsx(
            'relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 group overflow-hidden',
            !isMobile && collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5',
            isMobile && 'min-h-[52px]',
            isActive
              ? 'text-white bg-blue-500/12 border border-blue-500/20'
              : 'text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-transparent'
          )}>
          {({ isActive }) => (
            <>
              {/* Left glow bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                  style={{ background: 'linear-gradient(180deg,#60a5fa,#3b82f6)', boxShadow: '0 0 8px rgba(96,165,250,0.8)' }} />
              )}
              <Icon size={18} className={clsx(
                'transition-colors flex-shrink-0',
                isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
              )} />
              {(!collapsed || isMobile) && (
                <span className={isActive ? 'text-white font-semibold' : ''}>{label}</span>
              )}
              {isActive && (!collapsed || isMobile) && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const UserFooter = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={clsx('border-t border-white/6 pt-3 pb-4 flex-shrink-0', !isMobile && collapsed ? 'px-2' : 'px-2')}>
      {(!collapsed || isMobile) ? (
        <>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.email}</p>
              <p className="text-[10px] text-green-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />Active
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all group min-h-[44px]">
            <LogOut size={15} className="group-hover:text-red-400 transition-colors" />
            <span>Sign out</span>
          </button>
        </>
      ) : (
        <button onClick={handleLogout} title="Sign out"
          className="flex items-center justify-center p-3 w-full rounded-xl text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all min-h-[44px]">
          <LogOut size={15} />
        </button>
      )}
      {!isMobile && (
        <button onClick={toggleCollapse}
          className="hidden lg:flex items-center justify-center w-full mt-1.5 py-2 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all text-xs gap-1.5 border border-transparent hover:border-white/6">
          {collapsed ? <ChevronRight size={13} /> : <><ChevronLeft size={13} /><span>Collapse</span></>}
        </button>
      )}
    </div>
  );

  const SidebarShell = ({ isMobile = false }: { isMobile?: boolean }) => (
    <aside className={clsx(
      'flex flex-col flex-shrink-0',
      !isMobile && 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
      !isMobile && (collapsed ? 'w-[60px]' : 'w-[220px]'),
      isMobile && 'w-72'
    )} style={{
      background: 'linear-gradient(160deg,#0c1120 0%,#0a0f1d 40%,#080d19 100%)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div className={clsx(
        'flex items-center border-b border-white/6 flex-shrink-0 h-14',
        !isMobile && collapsed ? 'justify-center px-2' : 'px-4 gap-2.5'
      )}>
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-md" />
          <div className="relative w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap size={15} className="text-white" />
          </div>
        </div>
        {(!collapsed || isMobile) && (
          <div className="overflow-hidden">
            <span className="font-bold text-white text-base tracking-tight whitespace-nowrap">TradeDesk</span>
            <p className="text-[9px] text-blue-400/60 font-semibold tracking-widest uppercase whitespace-nowrap">AI Receptionist</p>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-gray-500 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={18} />
          </button>
        )}
      </div>

      {/* AI live badge */}
      <div className={clsx('mx-2 mt-2.5', (!collapsed || isMobile) ? '' : 'flex justify-center')}>
        {(!collapsed || isMobile) ? (
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-green-500/20 bg-green-500/6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="text-[10px] text-green-400 font-semibold tracking-wide">AI live Â· answering calls</span>
          </div>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="AI is live" />
        )}
      </div>

      <SidebarNav isMobile={isMobile} />
      <UserFooter isMobile={isMobile} />
    </aside>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#080c14' }}>
      {cmdOpen && <CommandSearch onClose={() => setCmdOpen(false)} />}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SidebarShell />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative animate-slide-in-right">
            <SidebarShell isMobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* âââ Top header âââ */}
        <header className="flex items-center gap-3 px-4 h-14 flex-shrink-0 border-b border-white/[0.07]"
          style={{ background: 'rgba(8,12,20,0.98)', backdropFilter: 'blur(16px)' }}>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-500 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1">
            <Menu size={20} />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white tracking-tight">{currentPage}</h2>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Search / command palette trigger */}
            <button onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-300 bg-white/4 hover:bg-white/7 border border-white/7 transition-all group min-h-[34px]">
              <Search size={12} className="group-hover:text-blue-400 transition-colors" />
              <span className="hidden md:block">Search</span>
              <kbd className="hidden md:block text-[10px] font-mono bg-white/8 px-1.5 py-0.5 rounded text-gray-600">âK</kbd>
            </button>

            {/* Notification bell */}
            <div className="relative">
              <button onClick={() => { setNotifOpen(o => !o); setUnread(0); }}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/7 border border-white/7 transition-all min-h-[44px] min-w-[44px]">
                <Bell size={15} />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center leading-none">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 rounded-2xl border border-white/10 shadow-2xl shadow-black/60 z-40 overflow-hidden"
                    style={{ background: '#0d1426' }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      <button onClick={() => setNotifOpen(false)} className="text-gray-600 hover:text-white p-1"><X size={13} /></button>
                    </div>
                    <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                      {MOCK_NOTIFS.map(n => (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/4 cursor-pointer transition-colors">
                          <div className={`w-7 h-7 rounded-lg ${n.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <n.icon size={13} className={n.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{n.title}</p>
                            <p className="text-xs text-gray-500 truncate">{n.desc}</p>
                          </div>
                          <span className="text-[10px] text-gray-600 whitespace-nowrap flex-shrink-0">{n.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-white/8">
                      <NavLink to="/dashboard/calls" onClick={() => setNotifOpen(false)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        View all calls â
                      </NavLink>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-500/40 transition-all">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 lg:pb-6"
          style={{
            backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.04) 0%, transparent 70%)',
          }}>
          <Outlet />
        </main>
      </div>

      {/* âââ Mobile bottom nav âââ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-white/8"
        style={{ background: 'rgba(8,12,20,0.98)', backdropFilter: 'blur(20px)', height: '60px' }}>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all',
              isActive ? 'text-blue-400' : 'text-gray-600'
            )}>
            {({ isActive }) => (
              <>
                <div className={clsx(
                  'flex items-center justify-center w-10 h-6 rounded-lg transition-all',
                  isActive ? 'bg-blue-500/15' : ''
                )}>
                  <Icon size={18} className={clsx(isActive ? 'text-blue-400' : 'text-gray-600')}
                    style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.7))' } : undefined} />
                </div>
                <span className={clsx('text-[9px] font-semibold tracking-wide', isActive ? 'text-blue-400' : 'text-gray-700')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
