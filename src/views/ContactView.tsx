import React, { useState } from 'react';
import { MessageSquare, PhoneCall, Mail, Send, Bot } from 'lucide-react';
import { useToast } from '../components/Toast';
import { api, ApiError } from '../lib/api';

export const ContactView: React.FC = () => {
  const { showToast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('error', 'Please fill subject and message');
      return;
    }
    setTicketLoading(true);
    try {
      const res = await api.createSupportTicket({ subject: subject.trim(), message: message.trim() });
      showToast('success', `Ticket created: ${res.ticketId}`);
      setSubject('');
      setMessage('');
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Failed to create ticket');
    } finally {
      setTicketLoading(false);
    }
  };

  const handleAiChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiReply(null);
    try {
      const res = await api.aiChat(aiPrompt.trim(), 'SATMAT support context');
      setAiReply(res.reply);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'AI unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="text-center bg-[#E5E7EB] p-3 rounded-2xl border border-[#D1D5DB]">
        <h2 className="font-bold text-base text-[#0F172A]">Contact & Support</h2>
        <p className="text-xs text-[#6B7280]">We're here to help you 24/7</p>
      </div>

      {/* Support Cards Stack */}
      <div className="space-y-3">
        {/* Customer Support */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 text-[#0F172A] flex items-center justify-center">
              <MessageSquare size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Customer Support</h3>
              <p className="text-[11px] text-[#6B7280]">
                Live chat with our dedicated support agents.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-2">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (e.g. Withdrawal issue)"
              maxLength={100}
              className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0EA5E9]"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue..."
              maxLength={2000}
              rows={3}
              className="w-full bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0EA5E9]"
            />
            <button
              type="submit"
              disabled={ticketLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 active:scale-95 transition"
            >
              <Send size={14} />
              <span>{ticketLoading ? 'Creating...' : 'Create Support Ticket'}</span>
            </button>
          </form>
        </div>

        {/* Helpdesk */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#737373]/15 text-[#737373] flex items-center justify-center">
              <PhoneCall size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Helpdesk</h3>
              <p className="text-[11px] text-[#6B7280]">
                Prefer to talk? Call our helpdesk directly.
              </p>
            </div>
          </div>

          <button
            onClick={() => window.open('tel:+919876543210')}
            className="py-2 px-4 rounded-xl bg-[#F8FAFC] border border-[#D1D5DB] hover:bg-[#E5E7EB] text-[#0F172A] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <span>Call Now</span>
            <PhoneCall size={14} className="text-[#6B7280]" />
          </button>
        </div>

        {/* AI Assistant */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">AI Assistant</h3>
              <p className="text-[11px] text-[#6B7280]">Ask about markets, rates, or gameplay.</p>
            </div>
          </div>
          <form onSubmit={handleAiChat} className="flex gap-2">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask AI..."
              className="flex-1 bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#8B5CF6]"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold disabled:opacity-50"
            >
              {aiLoading ? '...' : 'Ask'}
            </button>
          </form>
          {aiReply && (
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap">
              {aiReply}
            </div>
          )}
        </div>

        {/* Support Email */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#737373]/15 text-[#737373] flex items-center justify-center">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Support Email</h3>
              <p className="text-[11px] text-[#6B7280]">
                Drop us a line for non-urgent inquiries.
              </p>
            </div>
          </div>

          <button
            onClick={() => window.open('mailto:support@satmat.com')}
            className="py-2 px-4 rounded-xl bg-[#F8FAFC] border border-[#D1D5DB] hover:bg-[#E5E7EB] text-[#0F172A] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <span>Send Email</span>
            <Mail size={14} className="text-[#6B7280]" />
          </button>
        </div>

        {/* Newsletter */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-sm">
          <h3 className="font-bold text-sm">Newsletter</h3>
          <p className="text-xs text-[#6B7280]">Get updates on new markets and bonuses.</p>
          <NewsletterForm />
        </div>
      </div>
    </div>
  );
};

const NewsletterForm: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('error', 'Invalid email'); return; }
    setLoading(true);
    try {
      await api.subscribeNewsletter(email);
      showToast('success', 'Subscribed!');
      setEmail('');
    } catch (err: any) { showToast('error', err?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={handle} className="flex gap-2">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="flex-1 bg-[#F8FAFC] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs" />
      <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold disabled:opacity-50">{loading ? '...' : 'Subscribe'}</button>
    </form>
  );
};
