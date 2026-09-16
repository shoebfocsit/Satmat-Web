import React from 'react';
import { Notice } from '../types';
import { Bell, AlertCircle, Clock } from 'lucide-react';

interface NoticeBoardViewProps {
  notices: Notice[];
}

export const NoticeBoardView: React.FC<NoticeBoardViewProps> = ({ notices }) => {
  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-3.5">
      <div className="bg-[#E5E7EB] p-3 rounded-2xl border border-[#D1D5DB] text-center">
        <h2 className="font-bold text-base text-[#0F172A] flex items-center justify-center gap-2">
          <Bell size={18} className="text-[#0F172A]" />
          <span>Notice Board</span>
        </h2>
        <p className="text-xs text-[#6B7280]">
          Official announcements and market updates
        </p>
      </div>

      <div className="space-y-3">
        {notices.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center shadow-sm">
            <Bell size={24} className="mx-auto text-[#D1D5DB]" />
            <p className="mt-3 text-sm font-bold text-[#0F172A]">No notices</p>
            <p className="mt-1 text-xs text-[#6B7280]">Check back later or retry when online.</p>
          </div>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-2 shadow-sm relative overflow-hidden"
            >
              {notice.isImportant && (
                <div className="absolute top-3 right-3 text-[#EF4444]">
                  <AlertCircle size={18} className="animate-pulse" />
                </div>
              )}

              <h3 className="font-extrabold text-sm text-[#0F172A] tracking-wide pr-6">
                {notice.title}
              </h3>

              <p className="text-xs text-[#0F172A]/90 leading-relaxed">
                {notice.content}
              </p>

              <div className="pt-2 border-t border-[#E5E7EB] flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                <Clock size={11} />
                <span>{notice.date}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
