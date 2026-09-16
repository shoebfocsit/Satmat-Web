import React from 'react';
import { Menu, ArrowLeft, Bell, RefreshCw, Edit2 } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showWallet?: boolean;
  showNotification?: boolean;
  showRefresh?: boolean;
  showEdit?: boolean;
  balance?: number;
  onBackClick?: () => void;
  onRefreshClick?: () => void;
  onWalletClick?: () => void;
  onNotificationClick?: () => void;
  onEditClick?: () => void;
  icon?: React.ReactNode;
  onMenuClick?: () => void; // for mobile drawer
  showMobileMenu?: boolean;
  onTitleClick?: () => void; // logo/title tap goes home
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  showWallet = false,
  showNotification = true,
  showRefresh = false,
  showEdit = false,
  balance = 0.0,
  onBackClick,
  onRefreshClick,
  onWalletClick,
  onNotificationClick,
  onEditClick,
  icon,
  onMenuClick,
  showMobileMenu = false,
  onTitleClick,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-[#E5E7EB] shadow-sm px-3 md:px-4 py-2.5">
      <div className="max-w-full flex items-center justify-between gap-3 min-h-[44px]">
        {/* Left: Back button or Mobile menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showBackButton && (
            <button
              onClick={onBackClick}
              className="p-2 text-[#6B7280] hover:text-[#0F172A] rounded-lg active:scale-95 transition bg-[#E7E9EC] border border-[#D1D5DB]"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {showMobileMenu && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 text-[#6B7280] hover:text-[#0F172A] rounded-lg active:scale-95 transition"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          )}
        </div>

        {/* Center Title — taps home */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div className="flex items-center gap-1.5 truncate max-w-[320px] mx-auto">
            {icon && <span className="text-[#9CA3AF] shrink-0">{icon}</span>}
            {onTitleClick ? (
              <button
                onClick={onTitleClick}
                aria-label="Go to home"
                className="text-sm md:text-base font-bold text-[#0F172A] tracking-wide truncate text-center w-full active:scale-95 transition"
              >
                {title}
              </button>
            ) : (
              <h1 className="text-sm md:text-base font-bold text-[#0F172A] tracking-wide truncate text-center w-full">
                {title}
              </h1>
            )}
          </div>
        </div>

        {/* Right action items */}
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {showWallet && onWalletClick && (
            <button
              onClick={onWalletClick}
              className="bg-[#F1F3F5] hover:bg-[#E5E7EB] border border-[#D1D5DB] text-[#0F172A] px-2.5 py-1 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition whitespace-nowrap"
            >
              <span className="hidden sm:inline">₹{balance.toFixed(2)}</span>
              <span className="sm:hidden">₹{balance.toFixed(2)}</span>
            </button>
          )}

          {showNotification && onNotificationClick && (
            <button
              onClick={onNotificationClick}
              className="p-1.5 md:p-2 text-[#6B7280] hover:text-[#0F172A] relative rounded-lg transition"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#0EA5E9] rounded-full animate-pulse" />
            </button>
          )}

          {showRefresh && onRefreshClick && (
            <button
              onClick={onRefreshClick}
              className="p-1.5 md:p-2 text-[#6B7280] hover:text-[#0F172A] rounded-lg active:rotate-180 transition duration-300"
              aria-label="Refresh"
            >
              <RefreshCw size={20} />
            </button>
          )}

          {showEdit && onEditClick && (
            <button
              onClick={onEditClick}
              className="p-1.5 md:p-2 text-[#6B7280] hover:text-[#0F172A] rounded-lg transition"
              aria-label="Edit"
            >
              <Edit2 size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
