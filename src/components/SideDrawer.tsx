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
  X,
  BadgeCheck,
  BarChart3,
  Download,
  Smartphone,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onRouteChange: (route: AppRoute) => void;
  onOpenReferModal: () => void;
  onLogout: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onRouteChange,
  onOpenReferModal,
  onLogout,
}) => {
  const { canInstall, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const [showPWAHint, setShowPWAHint] = useState(false);

  const handleDownloadClick = async () => {
    const result = await promptInstall();
    if (result === 'ios' || result === 'unavailable') {
      setShowPWAHint((v) => !v);
    } else if (result === 'installed' || result === 'dismissed') {
      setShowPWAHint(false);
    }
  };

  if (!isOpen) return null;

  const menuItems = [
    { label: 'My Profile', route: '/profile' as AppRoute, icon: UserIcon },
    { label: 'Results', route: '/results' as AppRoute, icon: BadgeCheck },
    { label: 'Charts', route: '/charts' as AppRoute, icon: BarChart3 },
    { label: 'Full Schedule', route: '/schedule' as AppRoute, icon: CalendarClock },
    { label: 'Notice Board', route: '/notice-board' as AppRoute, icon: Bell, badge: true },
    { label: 'Game Rates', route: '/game-rates' as AppRoute, icon: TrendingUp },
    { label: 'Finance', route: '/finance' as AppRoute, icon: Receipt },
    { label: 'Bank Details', route: '/bank-details' as AppRoute, icon: Building2 },
    { label: 'Wallet Balance', route: '/wallet' as AppRoute, icon: Wallet },
    { label: 'Bids', route: '/bids' as AppRoute, icon: Ticket },
    { label: 'How to Play', route: '/how-to-play' as AppRoute, icon: HelpCircle },
    { label: 'Refer a Friend', action: 'refer', icon: Share2 },
    { label: 'Contact Us', route: '/contact' as AppRoute, icon: PhoneCall },
  ];

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Dark Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-4/5 max-w-xs bg-white border-r border-[#E5E7EB] text-[#0F172A] h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-300 overflow-y-auto">
        {/* Header Section */}
        <div className="p-5 border-b border-[#E5E7EB] bg-[#E5E7EB] relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-[#6B7280] hover:text-[#0F172A] rounded-full bg-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-[#D1D5DB] overflow-hidden bg-[#F8FAFC] flex items-center justify-center shadow-inner">
                {/* Avatar illustration */}
                <div className="w-full h-full bg-gradient-to-tr from-[#9CA3AF] via-[#D1D5DB] to-[#E5E7EB] flex items-center justify-center text-[#0F172A] font-bold text-xl">
                  {user.name.charAt(0)}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#0EA5E9] border-2 border-white rounded-full" />
            </div>

            <div className="flex flex-col">
              <h2 className="font-bold text-lg text-[#0F172A] tracking-wide truncate max-w-[150px]">
                {user.name}
              </h2>
              <span className="text-xs text-[#6B7280] font-mono">
                ID: {user.id}
              </span>

              {user.isGoldMember && (
                <div className="mt-1 inline-flex items-center gap-1 bg-[#0EA5E9]/15 border border-[#0EA5E9]/40 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#0F172A] w-fit">
                  <Star size={10} className="fill-[#0EA5E9]" />
                  Gold Member
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Navigation Items */}
        <div className="flex-1 py-3 px-3 space-y-1">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  onClose();
                  if (item.action === 'refer') {
                    onOpenReferModal();
                  } else if (item.route) {
                    onRouteChange(item.route);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98] ${
                  'text-[#0F172A] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-[#6B7280]" />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Download App — inside drawer */}
        {!isStandalone && (
          <div className="px-3 pb-2">
            <button
              onClick={handleDownloadClick}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-[#0F172A] hover:bg-black text-white text-sm font-bold shadow-md active:scale-[0.98] transition"
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
            {showPWAHint && (
              <div className="mt-2 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs">
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
          </div>
        )}

        {/* Bottom Logout Section */}
        <div className="p-4 border-t border-[#E5E7EB] bg-white">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#D1D5DB] text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition text-sm font-semibold active:scale-95"
          >
            <LogOut size={18} className="text-[#9CA3AF]" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
