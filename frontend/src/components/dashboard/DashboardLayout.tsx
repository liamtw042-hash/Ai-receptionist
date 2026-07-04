import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { pageTransition } from '../../lib/motion';
import {
  LayoutDashboard, Phone, MessageSquare, Users, Settings, Calendar,
  Menu, X, LogOut, Zap, Bell, Search, BarChart3,
  CheckCircle, PhoneIncoming, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatDistanceToNowStrict } from 'date-fns';
import { clsx } from 'clsx';

// Grouped nav — "the work" (what the AI does for you) vs "your setup".
// Grouping gives the sidebar structure instead of a flat equal-weight icon list.
const navGroups: { heading: string; items: { to: string; icon: typeof Phone; label: string; end?: boolean }[] }[] = [
  {
    heading: 'The work',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
      { to: '/dashboard/calls', icon: Phone, label: 'Calls' },
      { to: '/dashboard/jobs', icon: Calendar, label: 'Jobs' },
      { to: '/dashboard/sms', icon: MessageSquare, label: 'SMS' },
    ],
  },
  {
    heading: 'Your desk',
    items: [
      { to: '/dashboard/contacts', icon: Users, label: 'Contacts' },
      { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

// Flat list kept for the mobile bottom-nav bar (space-constrained, no grouping).
const navItems = navGroups.flatMap(g => g.items);

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/calls': 'Calls',
  '/dashboard/jobs': 'Jobs',
  '/dashboard/sms': 'SMS Inbox',
  '/dashboard/contacts': 'Contacts',
  '/dashboard/settings': 'Settings',
};

interface RecentCall {
  id: string;
  callerNumber: string;
  outcome: string;
  summary: string;
  createdAt: string;
}

function notifMeta(outcome: string) {
  if (outcome === 'emergency') return { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15', title: 'Emergency call flagged' };
  if (outcome === 'job_booked') return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/15', title: 'Job booked!' };
  return { icon: PhoneIncoming, color: 'text-orange-400', bg: 'bg-orange-500/15', title: 'New call' };
}

// ── Command Palette ──────────────────────────────────────────────────────────
function CommandSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const ITEMS = [
    { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Calls', icon: Phone, href: '/dashboard/calls', hint: 'View call transcripts' },
    { label: 'Jobs', icon: Calendar, href: '/dashboard/jobs', hint: 'Booked jobs & calendar' },
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
      <div className="w-full max-w-md bg-[#17191e] rounded-2xl border border-white/12 shadow-2xl shadow-black/60 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search size={15} className="text-gray-500 flex-shrink-0" />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && filtered[0]) { navigate(filtered[0].href); onClose(); } }}
            placeholder="Search pages and actions…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none" />
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors"><X size={14} /></button>
        </div>
        <div className="p-1.5">
          {filtered.map(item => (
            <button key={item.href}
              onClick={() => { navigate(item.href); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/6 transition-colors text-left group">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/15 transition-colors">
                <item.icon size={14} className="text-gray-400 group-hover:text-orange-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.hint && <p className="text-xs text-gray-600">{item.hint}</p>}
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-white/6 flex items-center gap-4 text-[10px] text-gray-700">
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
          <span className="ml-auto">⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('td_sidebar') === '1');
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const { logOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    api.get<RecentCall[]>('/dashboard/recent-calls')
      .then(calls => {
        const notifs = calls.slice(0, 4);
        setRecentCalls(notifs);
        setUnread(notifs.length);
      })
      .catch(() => {});
  }, []);

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

  const showLabels = (isMobile: boolean) => !collapsed || isMobile;

  const NavRow = ({ to, Icon, label, end, isMobile }: {
    to: string; Icon: typeof Phone; label: string; end?: boolean; isMobile: boolean;
  }) => (
    <NavLink to={to} end={end} title={collapsed && !isMobile ? label : undefined}
      className={({ isActive }) => clsx(
        'relative flex items-center rounded-xl text-sm transition-all duration-200 group overflow-hidden',
        !isMobile && collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5',
        isMobile && 'min-h-[52px]',
        isActive
          ? 'text-white bg-orange-500/[0.12] border border-orange-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          : 'text-gray-500 hover:text-gray-100 hover:bg-white/[0.055] border border-transparent'
      )}>
      {({ isActive }) => (
        <>
          {/* Left hi-vis rail — the single, deliberate active marker (orange = tradie accent) */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
              style={{ background: 'linear-gradient(180deg,#fb923c,#f97316)', boxShadow: '0 0 10px rgba(249,115,22,0.65)' }} />
          )}
          <Icon size={18} className={clsx(
            'transition-all duration-200 flex-shrink-0',
            isActive ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-200 group-hover:translate-x-0.5'
          )} />
          {showLabels(isMobile) && (
            <span className={clsx('transition-transform duration-200', isActive ? 'text-white font-semibold tracking-tight' : 'font-medium group-hover:translate-x-0.5')}>{label}</span>
          )}
        </>
      )}
    </NavLink>
  );

  const SidebarNav = ({ isMobile = false }: { isMobile?: boolean }) => (
    <nav className="flex-1 py-3 px-2 overflow-y-auto">
      {navGroups.map((group, gi) => (
        <div key={group.heading} className={clsx(gi > 0 && (showLabels(isMobile) ? 'mt-5' : 'mt-3'))}>
          {showLabels(isMobile) ? (
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-700">{group.heading}</p>
          ) : gi > 0 ? (
            <div className="mx-3 mb-2 h-px bg-white/6" />
          ) : null}
          <div className="space-y-0.5">
            {group.items.map(item => (
              <NavRow key={item.to} to={item.to} Icon={item.icon} label={item.label} end={item.end} isMobile={isMobile} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const UserFooter = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={clsx('border-t border-white/6 pt-3 pb-4 flex-shrink-0', !isMobile && collapsed ? 'px-2' : 'px-2')}>
      {(!collapsed || isMobile) ? (
        <>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-xs font-black text-black flex-shrink-0 shadow-sm">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.email}</p>
              <p className="text-[10px] text-green-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />Active
              </p>
            </div>
          </div>
          {(user?.email || '').toLowerCase() === 'liamtw042@gmail.com' && (
            <NavLink to="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all group min-h-[44px]">
              <BarChart3 size={15} className="group-hover:text-orange-400 transition-colors" />
              <span>Owner analytics</span>
            </NavLink>
          )}
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
      background: '#0f1114',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div className={clsx(
        'flex items-center border-b border-white/6 flex-shrink-0 h-14',
        !isMobile && collapsed ? 'justify-center px-2' : 'px-4 gap-2.5'
      )}>
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-orange-500/25 rounded-xl blur-md" />
          <div className="relative w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25 ring-1 ring-orange-400/40">
            <Zap size={15} className="text-black" fill="currentColor" />
          </div>
        </div>
        {(!collapsed || isMobile) && (
          <div className="overflow-hidden leading-none">
            <span className="font-black text-white text-base tracking-tight whitespace-nowrap">TradeDesk</span>
            <p className="text-[9px] text-orange-400/70 font-bold tracking-[0.18em] uppercase whitespace-nowrap mt-0.5">AI Receptionist</p>
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
            <span className="text-[10px] text-green-400 font-semibold tracking-wide">AI live · answering calls</span>
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
    <div className="min-h-screen flex" style={{ background: '#0a0b0d' }}>
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

        {/* ─── Top header ─── */}
        <header className="flex items-center gap-3 px-4 h-14 flex-shrink-0 border-b border-white/[0.07]"
          style={{ background: 'rgba(10,11,13,0.98)', backdropFilter: 'blur(16px)' }}>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-500 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1">
            <Menu size={20} />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight">{currentPage}</h2>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Search / command palette trigger */}
            <button onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-300 bg-white/4 hover:bg-white/7 border border-white/7 transition-all group min-h-[34px]">
              <Search size={12} className="group-hover:text-orange-400 transition-colors" />
              <span className="hidden md:block">Search</span>
              <kbd className="hidden md:block text-[10px] font-mono bg-white/8 px-1.5 py-0.5 rounded text-gray-600">⌘K</kbd>
            </button>

            {/* Notification bell */}
            <div className="relative">
              <button ref={bellRef}
                onClick={() => {
                  if (!notifOpen && bellRef.current) {
                    const rect = bellRef.current.getBoundingClientRect();
                    setDropdownStyle({ position: 'fixed', top: rect.bottom + 8, right: window.innerWidth - rect.right });
                  }
                  setNotifOpen(o => !o);
                  setUnread(0);
                }}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/7 border border-white/7 transition-all min-h-[44px] min-w-[44px]">
                <Bell size={15} />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center leading-none">
                    {unread}
                  </span>
                )}
              </button>
              {createPortal(
                <AnimatePresence>
                  {notifOpen && (
                  <>
                  <div className="fixed inset-0 z-[9998]" onClick={() => setNotifOpen(false)} />
                  <motion.div className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 shadow-2xl shadow-black/60 z-[9999] overflow-hidden"
                    style={{ ...dropdownStyle, background: '#17191e', transformOrigin: 'top right' }}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      <button onClick={() => setNotifOpen(false)} className="text-gray-600 hover:text-white p-1"><X size={13} /></button>
                    </div>
                    <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                      {recentCalls.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-2.5">
                            <PhoneIncoming size={16} className="text-orange-400/70" />
                          </div>
                          <p className="text-xs font-semibold text-gray-300">All quiet for now</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">The moment your AI answers a call, it'll land here.</p>
                        </div>
                      ) : recentCalls.map(call => {
                        const meta = notifMeta(call.outcome);
                        return (
                          <NavLink key={call.id} to="/dashboard/calls" onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-white/4 cursor-pointer transition-colors">
                            <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <meta.icon size={13} className={meta.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white">{meta.title} — {call.callerNumber}</p>
                              <p className="text-xs text-gray-500 truncate">{call.summary || 'No summary available'}</p>
                            </div>
                            <span className="text-[10px] text-gray-600 whitespace-nowrap flex-shrink-0">
                              {formatDistanceToNowStrict(new Date(call.createdAt), { addSuffix: true })}
                            </span>
                          </NavLink>
                        );
                      })}
                    </div>
                    <div className="px-4 py-2.5 border-t border-white/8">
                      <NavLink to="/dashboard/calls" onClick={() => setNotifOpen(false)} className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors">
                        View all calls →
                      </NavLink>
                    </div>
                  </motion.div>
                  </>
                  )}
                </AnimatePresence>,
                document.body
              )}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-xs font-black text-black shadow-sm cursor-pointer hover:ring-2 hover:ring-orange-500/40 transition-all">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 lg:pb-6"
          style={{
            backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249,115,22,0.035) 0%, transparent 70%)',
          }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={reduceMotion ? undefined : pageTransition}
              initial={reduceMotion ? false : 'hidden'}
              animate="show"
              exit={reduceMotion ? undefined : 'exit'}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ─── Mobile bottom nav ─── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-white/8"
        style={{ background: 'rgba(10,11,13,0.98)', backdropFilter: 'blur(20px)', height: '60px' }}>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all',
              isActive ? 'text-orange-400' : 'text-gray-600'
            )}>
            {({ isActive }) => (
              <>
                <div className={clsx(
                  'flex items-center justify-center w-10 h-6 rounded-lg transition-all',
                  isActive ? 'bg-orange-500/15' : ''
                )}>
                  <Icon size={18} className={clsx(isActive ? 'text-orange-400' : 'text-gray-600')}
                    style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(251,146,60,0.7))' } : undefined} />
                </div>
                <span className={clsx('text-[9px] font-semibold tracking-wide', isActive ? 'text-orange-400' : 'text-gray-700')}>
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
