import React from 'react';
import { AppRoute } from '../types';
import { Home, Trophy, Receipt, Ticket, ClipboardList } from 'lucide-react';

interface BottomNavigationProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentRoute,
  onRouteChange,
}) => {
  const navItems = [
    {
      id: 'finance',
      label: 'Finance',
      route: '/finance' as AppRoute,
      icon: Receipt,
    },
    {
      id: 'winnings',
      label: 'Winnings',
      route: '/winnings' as AppRoute,
      icon: Trophy,
    },
    {
      id: 'home',
      label: 'Home',
      route: '/' as AppRoute,
      icon: Home,
      isCenter: true,
    },
    {
      id: 'bids',
      label: 'Bids',
      route: '/bids' as AppRoute,
      icon: Ticket,
    },
    {
      id: 'orders',
      // Short label: 5 tabs must share ~300px on 320px-wide phones.
      label: 'Orders',
      route: '/orders' as AppRoute,
      icon: ClipboardList,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F8FAFC]/95 backdrop-blur-md border-t border-[#E5E7EB] pb-safe">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentRoute === item.route ||
            (item.id === 'finance' && currentRoute === '/passbook');

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => onRouteChange(item.route)}
                className="relative -top-4 flex flex-col items-center group focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-[#0EA5E9] border-2 border-[#0EA5E9] shadow-[#2563EB]/30'
                      : 'bg-white border-2 border-[#0EA5E9]/70 shadow-neutral-400/30'
                  }`}
                >
                  <Icon
                    size={26}
                    className={isActive ? 'text-[#0F172A]' : 'text-[#0F172A]'}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium mt-0.5 ${
                    isActive ? 'text-[#0F172A] font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onRouteChange(item.route)}
              className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition active:scale-95"
            >
              <div
                className={`p-1.5 rounded-full transition-all ${
                  isActive
                    ? 'bg-[#0EA5E9]/15 text-[#0F172A] shadow-md shadow-[#2563EB]/10'
                    : 'text-[#9CA3AF] hover:text-[#0F172A]'
                }`}
              >
                <Icon size={20} />
              </div>
              <span
                className={`text-[9px] sm:text-[10px] font-medium mt-0.5 tracking-tight whitespace-nowrap ${
                  isActive ? 'text-[#0F172A] font-bold' : 'text-[#6B7280]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
