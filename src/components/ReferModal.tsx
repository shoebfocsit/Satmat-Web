import React, { useState, useCallback } from 'react';
import { Gift, Copy, Check, Share2, X, MessageSquare, Send, MoreHorizontal } from 'lucide-react';
import { useToast } from './Toast';

interface ReferModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode?: string;
}

export const ReferModal: React.FC<ReferModalProps> = ({
  isOpen,
  onClose,
  referralCode = 'RM9928',
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://satmat.app'}/ref?id=${referralCode}`;

  const handleCopy = useCallback(async () => {
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        // Fallback for insecure contexts (HTTP localhost)
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showToast('success', 'Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Failed to copy link');
    }
  }, [referralLink, showToast]);

  const handleShare = useCallback(async (platform?: 'whatsapp' | 'telegram') => {
    const shareData = {
      title: 'Join SATMAT',
      text: `Use my code ${referralCode} to join SATMAT and earn bonus cash!`,
      url: referralLink,
    };

    try {
      if (window.isSecureContext && navigator.share && !platform) {
        await navigator.share(shareData);
        showToast('success', 'Shared successfully!');
        return;
      }

      // Platform-specific fallbacks
      let shareUrl = '';
      if (platform === 'whatsapp') {
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
      } else if (platform === 'telegram') {
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`;
      } else if (window.isSecureContext && navigator.share) {
        await navigator.share(shareData);
        return;
      } else {
        // Final fallback: copy to clipboard
        await handleCopy();
        return;
      }

      if (shareUrl) {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        showToast('success', `Opening ${platform}...`);
      }
    } catch {
      showToast('error', 'Failed to share');
    }
  }, [referralCode, referralLink, handleCopy, showToast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#0EA5E9] to-[#F8FAFC] rounded-3xl p-6 text-[#0F172A] shadow-2xl border border-[#9CA3AF]/30 overflow-hidden text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/60 hover:bg-white text-[#0F172A] transition"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Gift icon circle */}
        <div className="w-20 h-20 mx-auto rounded-full bg-[#0EA5E9] shadow-lg shadow-[#2563EB]/40 border border-[#14B8A6] flex items-center justify-center text-[#0F172A] mb-4">
          <Gift size={40} className="stroke-[2.5]" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-[#0F172A] tracking-wide">
          Refer & Earn
        </h2>
        <p className="text-sm text-[#0F172A]/70 font-medium mt-1">
          Share with friends and earn rewards!
        </p>

        {/* Link Box */}
        <div className="mt-5 bg-white/90 rounded-2xl p-3 border border-[#D1D5DB] flex items-center justify-between gap-2">
          <div className="flex flex-col text-left overflow-hidden">
            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">
              Your Referral Link
            </span>
            <span className="text-xs font-mono text-[#0F172A] truncate">
              {referralLink}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#E5E7EB] text-[#0F172A] transition shrink-0"
            title="Copy link"
            aria-label={copied ? 'Copied!' : 'Copy referral link'}
          >
            {copied ? <Check size={18} className="text-[#16A34A]" /> : <Copy size={18} />}
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={() => handleShare()}
          className="w-full mt-5 py-3.5 px-4 rounded-full bg-[#0F172A] hover:bg-[#1F2937] text-[#F5F5F5] font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-neutral-400/30 active:scale-95 transition"
        >
          <Share2 size={18} />
          <span>Share with Friends</span>
        </button>

        {/* Bottom Social Quick Sharing */}
        <div className="mt-6 pt-4 border-t border-[#0F172A]/10 flex items-center justify-center gap-6">
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex flex-col items-center gap-1 group"
            aria-label="Share on WhatsApp"
          >
            <div className="w-12 h-12 rounded-full bg-[#0EA5E9] flex items-center justify-center text-[#0F172A] border border-[#14B8A6] shadow-md group-hover:scale-105 transition">
              <MessageSquare size={22} />
            </div>
            <span className="text-xs text-[#0F172A] font-medium">WhatsApp</span>
          </button>

          <button
            onClick={() => handleShare('telegram')}
            className="flex flex-col items-center gap-1 group"
            aria-label="Share on Telegram"
          >
            <div className="w-12 h-12 rounded-full bg-[#0F172A] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
              <Send size={20} />
            </div>
            <span className="text-xs text-[#0F172A] font-medium">Telegram</span>
          </button>

          <button
            onClick={() => handleShare()}
            className="flex flex-col items-center gap-1 group"
            aria-label="More sharing options"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#0F172A] border border-[#D1D5DB] group-hover:scale-105 transition">
              <MoreHorizontal size={20} />
            </div>
            <span className="text-xs text-[#0F172A] font-medium">More</span>
          </button>
        </div>
      </div>
    </div>
  );
};
