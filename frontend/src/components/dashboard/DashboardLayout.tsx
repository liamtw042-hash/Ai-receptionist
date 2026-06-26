import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Phone, MessageSquare, Users, Settings, Menu, X, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/dashboard/calls', icon: Phone, label: 'Calls' },
  { to: '/dashboard/sms', icon: MessageSquare, label: 'SMS' },
  { to: '/dashboard/contacts', icon: Users, label: 'Contacts' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logOut, user } = useAuth();
  const navigate = useNavigate();

  const initials = user?.email ? user.email[0].toUpperCase() : '?';

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  const Sidebar = () => (
    <aside className={clsx(
      'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300',
      'lg:translate-x-0 lg:static lg:flex',
      mobileOpen ? 'translate-x-0' : '-translate-x-full'
    )} style={{
      background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1426 50%, #101828 100%)',
      borderRight: '1px solid rgba(59,130,246,0.15)',
    }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/6">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/40 rounded-xl blur-md" />
          <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={18} className="text-white" />
          </div>
        </div>
        <div>
          <span className="font-extrabold text-white text-lg tracking-tight">TradeDesk</span>
          <p className="text-[10px] text-blue-400/70 font-medium tracking-wide uppercase">AI Receptionist</p>
        </div>
        <button className="lg:hidden ml-auto text-gray-400 hover:text-white p-1" onClick={() => setMobileOpen(false)}>
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => clsx(
              'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
              isActive
                ? 'text-white bg-blue-500/15'
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full" />
                )}
                <Icon size={17} className={clsx(
                  'transition-colors duration-200',
                  isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
                )} />
                <span>{label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="px-3 pb-4 border-t border-white/6 pt-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/4 border border-white/6 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{user?.email}</p>
            <p className="text-[10px] text-green-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Active
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200 group"
        >
          <LogOut size={16} className="group-hover:text-red-400 transition-colors duration-200" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#080c14] flex">
      <Sidebar />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3.5 border-b border-white/6" style={{ background: 'rgba(10,15,30,0.95)' }}>
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white p-1">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">TradeDesk</span>
          </div>
        </header>

        {/* Page content with grid bg */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 animate-fade-in relative"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
