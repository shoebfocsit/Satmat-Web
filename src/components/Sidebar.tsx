import React, { useState } from 'react';
import { User, AppRoute } from '../types';
import {
  User as UserIcon,
  Bell,
  CalendarClock,
  TrendingUp,
  Receipt,
  Building2,
  Wallet,
  Ticket,
  HelpCircle,
  Share2,
  PhoneCall,
  LogOut,
  Star,
  ChevronLeft,
  Home,
  Trophy,
  ClipboardList,
  BadgeCheck,
  BarChart3,
  Download,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SidebarProps {
  user: User;
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  onOpenReferModal: () => void;
  onLogout: () => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
}

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { id: 'home', label: 'Home', route: '/' as AppRoute, icon: Home },
    ],
  },
  {
    label: 'Games',
    items: [
      { id: 'results', label: 'Results', route: '/results' as AppRoute, icon: BadgeCheck },
      { id: 'charts', label: 'Charts', route: '/charts' as AppRoute, icon: BarChart3 },
      { id: 'schedule', label: 'Full Schedule', route: '/schedule' as AppRoute, icon: CalendarClock },
      { id: 'winnings', label: 'Winnings', route: '/winnings' as AppRoute, icon: Trophy },
      { id: 'bids', label: 'Bids', route: '/bids' as AppRoute, icon: Ticket },
      { id: 'orders', label: 'Order Record', route: '/orders' as AppRoute, icon: ClipboardList },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'finance', label: 'Finance', route: '/finance' as AppRoute, icon: Receipt },
      { id: 'wallet', label: 'Wallet', route: '/wallet' as AppRoute, icon: Wallet },
      { id: 'bank', label: 'Bank Details', route: '/bank-details' as AppRoute, icon: Building2 },
    ],
  },
  {
    label: 'More',
    items: [
      { id: 'notice', label: 'Notice Board', route: '/notice-board' as AppRoute, icon: Bell, badge: true },
      { id: 'rates', label: 'Game Rates', route: '/game-rates' as AppRoute, icon: TrendingUp },
      { id: 'how', label: 'How to Play', route: '/how-to-play' as AppRoute, icon: HelpCircle },
      { id: 'refer', label: 'Refer a Friend', action: 'refer', icon: Share2 },
      { id: 'contact', label: 'Contact Us', route: '/contact' as AppRoute, icon: PhoneCall },
    ],
  },
];

const isRouteActive = (route: AppRoute | undefined, currentRoute: AppRoute) => {
  if (route === currentRoute) return true;
  if (route === '/finance' && currentRoute === '/passbook') return true;
  return false;
};

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentRoute,
  onRouteChange,
  onOpenReferModal,
  onLogout,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { canInstall, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const [showPWAHint, setShowPWAHint] = useState(false);

  const handleDownloadClick = async () => {
    const result = await promptInstall();
    if (result === 'ios' || result === 'unavailable') {
      setShowPWAHint(true);
    }
  };

  return (
    <aside
      className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-[#E5E7EB] transition-all duration-300 flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      aria-label="Main navigation"
    >
      {/* Logo / Collapse toggle */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#E5E7EB]">
        {!collapsed && (
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onRouteChange('/');
            }}
            className="flex items-center gap-2"
          >
            <span className="w-8 h-8 rounded-lg bg-[#0EA5E9] flex items-center justify-center text-[#0F172A] font-black text-lg">
              S
            </span>
            <span className="font-extrabold tracking-[0.15em] text-sm text-[#0F172A]">SATMAT</span>
          </a>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition ${
            collapsed ? 'mx-auto' : 'ml-2'
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={18} className={collapsed ? 'rotate-180' : ''} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-6" aria-label="Sidebar navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(item.route, currentRoute);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action === 'refer') {
                      onOpenReferModal();
                    } else if (item.route) {
                      onRouteChange(item.route);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98] ${
                    collapsed ? 'justify-center' : 'justify-start'
                  } ${
                    isActive
                      ? 'bg-[#0EA5E9]/15 text-[#0F172A] border border-[#0EA5E9]/30 shadow-sm shadow-[#2563EB]/10'
                      : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                  }`}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    size={20}
                    className={`shrink-0 ${
                      isActive ? 'text-[#0EA5E9]' : 'text-[#9CA3AF]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {item.badge && !collapsed && (
                    <span
                      className="ml-auto w-2 h-2 rounded-full bg-[#0EA5E9] animate-ping"
                      aria-label="New"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Download App — inside sidebar (not standalone only) */}
      {!isStandalone && !collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={handleDownloadClick}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#0F172A] hover:bg-black text-white text-sm font-bold shadow-md active:scale-[0.98] transition"
          >
            <span className="w-8 h-8 rounded-lg bg-[#0EA5E9] flex items-center justify-center shrink-0">
              <Download size={16} className="text-[#0F172A]" />
            </span>
            <span className="flex-1 text-left leading-tight">
              Download App
              <span className="block text-[10px] font-medium text-white/60">
                {canInstall ? 'One-tap install' : isIOS ? 'Add to Home Screen' : 'Install PWA'}
              </span>
            </span>
          </button>
        </div>
      )}
      {!isStandalone && collapsed && (
        <div className="px-2 pb-2 flex justify-center">
          <button
            onClick={handleDownloadClick}
            className="w-10 h-10 rounded-xl bg-[#0F172A] hover:bg-black text-white flex items-center justify-center shadow-md active:scale-95 transition"
            title="Download App"
            aria-label="Download App"
          >
            <Download size={16} />
          </button>
        </div>
      )}

      {/* PWA hint for manual install */}
      {showPWAHint && !isStandalone && (
        <div className="mx-3 mb-2 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Smartphone size={14} /> Install kaise kare
            </p>
            <button onClick={() => setShowPWAHint(false)} className="text-[#9CA3AF] hover:text-[#0F172A]">
              <X size={14} />
            </button>
          </div>
          {isIOS ? (
            <ol className="mt-2 space-y-1 text-[#6B7280] list-decimal list-inside">
              <li>Share button (⎙) dabao</li>
              <li><b className="text-[#0F172A]">Add to Home Screen</b> select karo</li>
            </ol>
          ) : (
            <p className="mt-2 text-[#6B7280]">Browser menu (⋮) → <b className="text-[#0F172A]">Add to Home Screen</b> / <b className="text-[#0F172A]">Install App</b></p>
          )}
        </div>
      )}

      {/* User profile / logout at bottom */}
      <div className="p-3 border-t border-[#E5E7EB]">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 rounded-full border-2 border-[#D1D5DB] overflow-hidden bg-[#E5E7EB] flex items-center justify-center shadow-inner">
                <div className="w-full h-full bg-gradient-to-tr from-[#9CA3AF] via-[#D1D5DB] to-[#E5E7EB] flex items-center justify-center text-[#0F172A] font-bold text-sm">
                  {user.name.charAt(0)}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#0EA5E9] border-2 border-white rounded-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => onRouteChange('/profile')}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#F8FAFC] transition text-left"
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full border-2 border-[#D1D5DB] overflow-hidden bg-[#E5E7EB] flex items-center justify-center shadow-inner">
                  <div className="w-full h-full bg-gradient-to-tr from-[#9CA3AF] via-[#D1D5DB] to-[#E5E7EB] flex items-center justify-center text-[#0F172A] font-bold text-base">
                    {user.name.charAt(0)}
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#0EA5E9] border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#0F172A] truncate">{user.name}</p>
                <p className="text-[11px] text-[#9CA3AF] font-mono">ID: {user.id}</p>
                {user.isGoldMember && (
                  <span className="inline-flex items-center gap-1 bg-[#0EA5E9]/15 border border-[#0EA5E9]/40 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#0F172A] mt-1">
                    <Star size={10} className="fill-[#0EA5E9]" />
                    Gold Member
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#D1D5DB] text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition text-sm font-medium active:scale-[0.98]"
            >
              <LogOut size={16} className="text-[#9CA3AF]" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
