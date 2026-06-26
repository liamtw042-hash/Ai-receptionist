import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Phone, MessageSquare, Users, Settings,
  Menu, X, LogOut, Zap, Bell,
  ChevronLeft, ChevronRight, CheckCircle, PhoneIncoming, AlertTriangle,
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

const MOCK_NOTIFS = [
  { id: 1, icon: PhoneIncoming, color: 'text-blue-400', title: 'New call from 0412 345 678', desc: 'Burst pipe emergency — urgent', time: '2 min ago' },
  { id: 2, icon: CheckCircle, color: 'text-green-400', title: 'Job booked!', desc: 'Hot water replacement — Tuesday 9am', time: '18 min ago' },
  { id: 3, icon: AlertTriangle, color: 'text-red-400', title: 'Emergency call flagged', desc: '0438 123 456 — gas leak suspected', time: '1 hr ago' },
  { id: 4, icon: PhoneIncoming, color: 'text-blue-400', title: 'New call from 0421 987 654', desc: 'Quote request — hot water', time: '2 hr ago' },
];

const BREADCRUMBS: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/calls': 'Calls',
  '/dashboard/sms': 'SMS',
  '/dashboard/contacts': 'Contacts',
  '/dashboard/settings': 'Settings',
};

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('td_sidebar') === '1');
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(2);
  const { logOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.email ? user.email[0].toUpperCase() : '?';
  const currentPage = BREADCRUMBS[location.pathname] ?? 'Dashboard';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') { setNotifOpen(false); setMobileOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('td_sidebar', next ? '1' : '0');
  };

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  const openNotifs = () => {
    setNotifOpen(o => !o);
    setUnread(0);
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex">

      {/* ─── DESKTOP SIDEBAR (hidden on mobile) ─── */}
      <aside className={clsx(
        'hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-16' : 'w-64'
      )} style={{
        background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1426 50%, #101828 100%)',
        borderRight: '1px solid rgba(59,130,246,0.15)',
      }}>
        {/* Logo */}
        <div className={clsx(
          'flex items-center border-b border-white/6 flex-shrink-0 transition-all duration-300',
          collapsed ? 'px-3 py-5 justify-center' : 'px-5 py-5 gap-3'
        )}>
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-blue-500/40 rounded-xl blur-md" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap size={18} className="text-white" />
            </div>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-extrabold text-white text-lg tracking-tight whitespace-nowrap">TradeDesk</span>
              <p className="text-[10px] text-blue-400/70 font-medium tracking-wide uppercase whitespace-nowrap">AI Receptionist</p>
            </div>
          )}
        </div>

        {/* Live indicator */}
        {!collapsed ? (
          <div className="mx-3 mt-3 flex items-center gap-2 glass rounded-lg px-3 py-2 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="text-xs text-green-400 font-medium">AI is live · answering calls</span>
          </div>
        ) : (
          <div className="mx-auto mt-3 w-2 h-2 rounded-full bg-green-400 animate-pulse" title="AI is live" />
        )}

        {/* Nav */}
        <nav className={clsx('flex-1 py-4 space-y-0.5 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined}
              className={({ isActive }) => clsx(
                'relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 group',
                collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5',
                isActive ? 'text-white bg-blue-500/15' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              )}>
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full" />}
                  <Icon size={17} className={clsx('transition-colors flex-shrink-0', isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300')} />
                  {!collapsed && <span>{label}</span>}
                  {isActive && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className={clsx('border-t border-white/6 pt-3 pb-4 flex-shrink-0', collapsed ? 'px-2' : 'px-3')}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{user?.email}</p>
                  <p className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Active</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all group">
                <LogOut size={16} className="group-hover:text-red-400 transition-colors" />Sign out
              </button>
            </>
          ) : (
            <button onClick={handleLogout} title="Sign out"
              className="flex items-center justify-center p-3 w-full rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all">
              <LogOut size={16} />
            </button>
          )}
          <button onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-full mt-2 py-2 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all text-xs gap-1.5">
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* ─── MOBILE SIDEBAR DRAWER ─── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 flex flex-col flex-shrink-0 animate-slide-in-right" style={{
            background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1426 50%, #101828 100%)',
            borderRight: '1px solid rgba(59,130,246,0.15)',
          }}>
            <div className="flex items-center gap-3 px-5 py-5 border-b border-white/6">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-blue-500/40 rounded-xl blur-md" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center"><Zap size={18} className="text-white" /></div>
              </div>
              <div>
                <span className="font-extrabold text-white text-lg tracking-tight">TradeDesk</span>
                <p className="text-[10px] text-blue-400/70 font-medium tracking-wide uppercase">AI Receptionist</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="ml-auto text-gray-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="mx-3 mt-3 flex items-center gap-2 glass rounded-lg px-3 py-2 border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <span className="text-xs text-green-400 font-medium">AI is live · answering calls</span>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => clsx(
                    'relative flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm font-medium transition-all min-h-[52px]',
                    isActive ? 'text-white bg-blue-500/15' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                  )}>
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-400 rounded-full" />}
                      <Icon size={18} className={isActive ? 'text-blue-400' : 'text-gray-500'} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-white/6 px-3 pt-3 pb-6">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{user?.email}</p>
                  <p className="text-[10px] text-green-400">● Active</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 w-full rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all min-h-[44px]">
                <LogOut size={16} />Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/6 flex-shrink-0 h-14"
          style={{ background: 'rgba(8,12,20,0.95)', backdropFilter: 'blur(12px)' }}>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 flex-shrink-0">
            <Menu size={22} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
            <span className="text-gray-600 hidden sm:block">Dashboard</span>
            {currentPage !== 'Overview' && (
              <>
                <span className="text-gray-700 hidden sm:block">/</span>
                <span className="text-white font-medium">{currentPage}</span>
              </>
            )}
            {currentPage === 'Overview' && <span className="text-white font-medium sm:font-normal sm:text-gray-400">{currentPage}</span>}
          </div>

          {/* Notifications */}
          <div className="relative flex-shrink-0">
            <button onClick={openNotifs}
              className="relative w-10 h-10 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-white border border-white/8 hover:border-white/20 transition-all min-h-[44px] min-w-[44px]">
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-12 w-72 sm:w-80 glass rounded-xl border border-white/12 shadow-2xl z-40 overflow-hidden animate-slide-in-right">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-gray-500 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                    {MOCK_NOTIFS.map(n => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/4 transition-colors cursor-pointer min-h-[52px]">
                        <n.icon size={15} className={clsx('flex-shrink-0 mt-0.5', n.color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{n.title}</p>
                          <p className="text-xs text-gray-500 truncate">{n.desc}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 flex-shrink-0 whitespace-nowrap">{n.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-white/8">
                    <NavLink to="/dashboard/calls" onClick={() => setNotifOpen(false)} className="text-xs text-blue-400 hover:text-blue-300">
                      View all calls →
                    </NavLink>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content — add bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-6 animate-fade-in" style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}>
          <Outlet />
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV (lg:hidden) ─── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-white/10"
        style={{ background: 'rgba(8,12,20,0.97)', backdropFilter: 'blur(16px)' }}>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all min-h-[56px]',
              isActive ? 'text-blue-400' : 'text-gray-600 hover:text-gray-300'
            )}>
            {({ isActive }) => (
              <>
                <Icon size={20} className={isActive ? 'text-blue-400' : ''} />
                <span className={clsx('text-[10px] font-medium', isActive ? 'text-blue-400' : 'text-gray-600')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
