import React, { useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Trash2, Home, Plus } from 'lucide-react';
import { useToast } from './Toast';
import { useRateLimit } from '../hooks/useRateLimit';
import { validateAmount, sanitizeText } from '../lib/validation';
import { api, MarketStatus } from '../lib/api';
import { formatCountdown, useServerCountdown } from '../hooks/useMarketCountdown';

interface QueuedBidItem {
  id: number;
  digit: string;
  amount: number;
}

interface BiddingModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketName: string;
  marketId: string;
  gameType?: string;
  userBalance: number;
  /**
   * Places one bid. Resolves null on success, or a user-friendly error
   * message on failure (including MARKET_CLOSED from the server, which is
   * the final authority — this modal never decides the window itself).
   */
  onPlaceBid: (bid: {
    marketName: string;
    marketId: string;
    gameType: string;
    numberSelected: string;
    amount: number;
    leg: 'OPEN' | 'CLOSE';
  }) => Promise<string | null>;
  onGoHome?: () => void;
}

// Normalize gameType to live 9 games
function normalizeGT(gt: string) {
  const t = gt.toLowerCase().trim();
  if (t === 'ank' || t.includes('single digit') || t === 'ank (single digit)') return 'ank';
  if (t === 'jodi' || t.includes('jodi')) return 'jodi';
  if (t === 'sp' || t.includes('single pana') || t === 'single panna') return 'sp';
  if (t === 'dp' || t.includes('double pana') || t === 'double panna') return 'dp';
  if (t === 'tp' || t.includes('triple pana') || t === 'triple panna') return 'tp';
  if (t === 'cp' || t.includes('cycle')) return 'cp';
  if (t === 'hf.s' || t === 'hfs' || t.includes('half')) return 'hfs';
  if (t === 'f.s' || t === 'fs' || t.includes('full')) return 'fs';
  if (t === 'motar' || t === 'motor' || t.includes('motor')) return 'motar';
  return t;
}

function validateForGame(gtNorm: string, val: string): { valid: boolean; error?: string; sanitized: string } {
  const v = val.trim();
  if (!v) return { valid: false, error: 'Please select a number', sanitized: '' };
  if (gtNorm === 'ank') {
    if (!/^[0-9]$/.test(v)) return { valid: false, error: 'ANK is single digit 0-9', sanitized: v };
    return { valid: true, sanitized: v };
  }
  if (gtNorm === 'jodi') {
    if (!/^[0-9]{2}$/.test(v)) return { valid: false, error: 'JODI is 2 digits 00-99', sanitized: v };
    return { valid: true, sanitized: v };
  }
  if (['sp', 'dp', 'tp', 'cp'].includes(gtNorm)) {
    if (!/^[0-9]{3}$/.test(v)) return { valid: false, error: 'Pana is 3 digits (e.g. 123)', sanitized: v };
    // Live validation: SP = all digits different, DP = exactly one pair, TP = all same, CP = any 3-digit
    if (gtNorm === 'sp') {
      const [a, b, c] = v.split('');
      if (a === b || b === c || a === c) return { valid: false, error: 'SP requires 3 distinct digits (e.g. 123)', sanitized: v };
    }
    if (gtNorm === 'dp') {
      const [a, b, c] = v.split('');
      const uniq = new Set([a, b, c]).size;
      if (uniq !== 2) return { valid: false, error: 'DP requires exactly one pair (e.g. 112)', sanitized: v };
    }
    if (gtNorm === 'tp') {
      if (!/^(.)\1\1$/.test(v)) return { valid: false, error: 'TP requires triple same (e.g. 777)', sanitized: v };
    }
    return { valid: true, sanitized: v };
  }
  if (gtNorm === 'hfs') {
    // Half Sangam: ank * panna  e.g. 5*123 or 5-123 or 5123
    const norm = v.replace(/[^0-9]/g, '');
    if (!/^[0-9][0-9]{3}$/.test(norm) || norm.length !== 4) return { valid: false, error: 'HF.S is Ank*Panna e.g. 5*123 (4 digits)', sanitized: v };
    // also allow with separator
    if (/^[0-9][\-\*][0-9]{3}$/.test(v)) return { valid: true, sanitized: v };
    if (/^[0-9]{4}$/.test(v)) return { valid: true, sanitized: `${v[0]}*${v.slice(1)}` };
    return { valid: false, error: 'HF.S format: Ank*Panna e.g. 5*123', sanitized: v };
  }
  if (gtNorm === 'fs') {
    // Full Sangam: panna * panna e.g. 123*456
    const norm = v.replace(/[^0-9]/g, '');
    if (norm.length !== 6) return { valid: false, error: 'F.S is Pana*Pana e.g. 123*456 (6 digits)', sanitized: v };
    if (/^[0-9]{3}[\-\*][0-9]{3}$/.test(v)) return { valid: true, sanitized: v };
    if (/^[0-9]{6}$/.test(v)) return { valid: true, sanitized: `${v.slice(0, 3)}*${v.slice(3)}` };
    return { valid: false, error: 'F.S format: Pana*Pana e.g. 123*456', sanitized: v };
  }
  if (gtNorm === 'motar') {
    const norm = v.replace(/[^0-9]/g, '');
    if (norm.length < 7) return { valid: false, error: 'MOTAR requires 7 Ank digits (e.g. 1234567)', sanitized: v };
    if (!/^[0-9]{7,10}$/.test(norm)) return { valid: false, error: 'MOTAR 7 Ank allowed (7 digits)', sanitized: v };
    return { valid: true, sanitized: norm.slice(0, 7) };
  }
  return { valid: true, sanitized: v };
}

export const BiddingModal: React.FC<BiddingModalProps> = ({
  isOpen,
  onClose,
  marketName,
  marketId,
  gameType = 'ANK',
  userBalance,
  onPlaceBid,
  onGoHome,
}) => {
  const { showToast } = useToast();
  const bidRateLimit = useRateLimit({ maxCalls: 10, windowMs: 60000, key: 'bid' });

  const [leg, setLeg] = useState<'OPEN' | 'CLOSE'>('OPEN');
  const [selectedDigit, setSelectedDigit] = useState<string>('5');
  const [amount, setAmount] = useState<number>(10);
  const [customDigit, setCustomDigit] = useState<string>('');
  const [queuedBids, setQueuedBids] = useState<QueuedBidItem[]>([]);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [panelDigits, setPanelDigits] = useState<{ h: string; t: string; u: string }>({ h: '', t: '', u: '' });
  const [hfAnk, setHfAnk] = useState<string>('5');
  const [hfPanna, setHfPanna] = useState<{ h: string; t: string; u: string }>({ h: '', t: '', u: '' });
  const [fsOpen, setFsOpen] = useState<{ h: string; t: string; u: string }>({ h: '', t: '', u: '' });
  const [fsClose, setFsClose] = useState<{ h: string; t: string; u: string }>({ h: '', t: '', u: '' });
  const [motorDigits, setMotorDigits] = useState<string>('1234567');

  // Server-authoritative window (UI hint only). Failing to load never blocks
  // the form — the backend makes the final accept/reject decision.
  const [mstatus, setMstatus] = useState<MarketStatus | null>(null);
  useEffect(() => {
    if (!isOpen || !marketId) return;
    let cancelled = false;
    const load = () => {
      api
        .marketStatus(marketId)
        .then((s) => {
          if (!cancelled) setMstatus(s);
        })
        .catch(() => {
          if (!cancelled) setMstatus(null);
        });
    };
    load();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOpen, marketId]);
  const windowClosed = mstatus ? !mstatus.canBid : false;
  const countdownTarget =
    mstatus?.status === 'OPEN' ? mstatus.closesAt : mstatus?.status === 'SCHEDULED' ? mstatus.opensAt : null;
  const remaining = useServerCountdown(countdownTarget, mstatus?.serverTime);
  // Per-leg cutoff (display only — the server enforces LEG_CLOSED): once
  // today's open is declared, the OPEN leg is dead, CLOSE lives on.
  const openLegClosed = !!mstatus?.openDeclared;

  useEffect(() => {
    if (!isOpen) {
      setLeg('OPEN');
      setSelectedDigit('5');
      setAmount(10);
      setCustomDigit('');
      setQueuedBids([]);
      setError('');
      setSuccessMsg(false);
      setIsSubmitting(false);
      setPanelDigits({ h: '', t: '', u: '' });
      setHfAnk('5');
      setHfPanna({ h: '', t: '', u: '' });
      setFsOpen({ h: '', t: '', u: '' });
      setFsClose({ h: '', t: '', u: '' });
      setMotorDigits('1234567');
    }
  }, [isOpen]);

  const quickAmounts = [10, 50, 100, 500, 1000];
  const gtNorm = normalizeGT(gameType);
  const isAnk = gtNorm === 'ank';
  const isJodi = gtNorm === 'jodi';
  const isPanna = ['sp', 'dp', 'tp', 'cp'].includes(gtNorm);
  const isHFS = gtNorm === 'hfs';
  const isFS = gtNorm === 'fs';
  const isMotar = gtNorm === 'motar';

  const digitsList = isJodi
    ? Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'))
    : Array.from({ length: 10 }, (_, i) => `${i}`);

  const pannaValue = `${panelDigits.h}${panelDigits.t}${panelDigits.u}`;
  const hfPannaValue = `${hfPanna.h}${hfPanna.t}${hfPanna.u}`;
  const fsOpenValue = `${fsOpen.h}${fsOpen.t}${fsOpen.u}`;
  const fsCloseValue = `${fsClose.h}${fsClose.t}${fsClose.u}`;

  const onPickPanelDigit = (position: 'h' | 't' | 'u', d: string) => {
    setPanelDigits((prev) => ({ ...prev, [position]: d }));
    setCustomDigit('');
    setError('');
  };

  useEffect(() => {
    if (isPanna && panelDigits.h && panelDigits.t && panelDigits.u) {
      setSelectedDigit(`${panelDigits.h}${panelDigits.t}${panelDigits.u}`);
    }
  }, [panelDigits, isPanna]);

  useEffect(() => {
    if (isHFS && hfPanna.h && hfPanna.t && hfPanna.u) {
      setSelectedDigit(`${hfAnk}*${hfPanna.h}${hfPanna.t}${hfPanna.u}`);
    }
  }, [hfAnk, hfPanna, isHFS]);

  useEffect(() => {
    if (isFS && fsOpen.h && fsOpen.t && fsOpen.u && fsClose.h && fsClose.t && fsClose.u) {
      setSelectedDigit(`${fsOpen.h}${fsOpen.t}${fsOpen.u}*${fsClose.h}${fsClose.t}${fsClose.u}`);
    }
  }, [fsOpen, fsClose, isFS]);

  useEffect(() => {
    if (isMotar) setSelectedDigit(motorDigits);
  }, [motorDigits, isMotar]);

  const totalPoints = queuedBids.reduce((sum, b) => sum + b.amount, 0);

  const addBid = useCallback(() => {
    setError('');
    let finalDigit = '';
    if (isHFS) finalDigit = hfPannaValue ? `${hfAnk}*${hfPannaValue}` : customDigit || selectedDigit;
    else if (isFS) finalDigit = fsOpenValue && fsCloseValue ? `${fsOpenValue}*${fsCloseValue}` : customDigit || selectedDigit;
    else if (isMotar) finalDigit = motorDigits;
    else finalDigit = sanitizeText(customDigit.trim() || selectedDigit, 20);

    const digitValidation = validateForGame(gtNorm, finalDigit);
    if (!digitValidation.valid) {
      setError(digitValidation.error || 'Invalid number');
      showToast('error', digitValidation.error || 'Invalid number');
      return;
    }

    const amtValidation = validateAmount(amount, 10, userBalance);
    if (!amtValidation.valid) {
      setError(amtValidation.error || 'Invalid amount');
      showToast('error', amtValidation.error || 'Invalid amount');
      return;
    }

    setQueuedBids((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), digit: digitValidation.sanitized, amount: amtValidation.value },
    ]);
    setCustomDigit('');
    setAmount(10);
    if (isPanna) setPanelDigits({ h: '', t: '', u: '' });
    showToast('success', `Bid queued: ₹${amtValidation.value} on ${digitValidation.sanitized}`);
  }, [customDigit, selectedDigit, amount, gtNorm, isPanna, isHFS, isFS, isMotar, hfAnk, hfPannaValue, fsOpenValue, fsCloseValue, motorDigits, userBalance, showToast]);

  const removeBid = useCallback((id: number) => setQueuedBids((prev) => prev.filter((b) => b.id !== id)), []);

  const submitAll = useCallback(async () => {
    setError('');
    if (queuedBids.length === 0) {
      setError('Add at least one bid before submitting');
      showToast('error', 'Add at least one bid before submitting');
      return;
    }
    if (windowClosed) {
      const msg =
        mstatus?.status === 'SCHEDULED'
          ? 'Market has not opened yet. Betting is not open.'
          : mstatus?.status === 'RESULT_DECLARED'
            ? 'Result already declared. Betting is closed.'
            : 'Market is closed. Betting is no longer available.';
      setError(msg);
      showToast('error', msg);
      return;
    }
    if (leg === 'OPEN' && openLegClosed) {
      const msg = 'Open result is declared. Only CLOSE bets are accepted now.';
      setError(msg);
      showToast('error', msg);
      return;
    }
    if (!bidRateLimit.checkLimit()) {
      setError('Too many bid attempts. Please wait a moment.');
      showToast('error', 'Too many attempts. Please wait.', 5000);
      return;
    }
    setIsSubmitting(true);
    let ok = true;
    for (const b of queuedBids) {
      const errMsg = await onPlaceBid({ marketName, marketId, gameType, numberSelected: b.digit, amount: b.amount, leg });
      if (errMsg) {
        ok = false;
        setError(errMsg);
        showToast('error', errMsg);
        // Refresh the window — a MARKET_CLOSED here means the session flipped.
        api.marketStatus(marketId).then(setMstatus).catch(() => undefined);
        break;
      }
    }
    setIsSubmitting(false);
    if (ok) {
      setSuccessMsg(true);
      showToast('success', `${queuedBids.length} bid${queuedBids.length > 1 ? 's' : ''} placed: ₹${totalPoints.toLocaleString('en-IN')}`);
    }
  }, [queuedBids, bidRateLimit, showToast, marketName, marketId, gameType, leg, onPlaceBid, totalPoints, windowClosed, openLegClosed, mstatus?.status]);

  if (!isOpen) return null;

  const rateHint: Record<string, string> = {
    ank: '10 → 95', jodi: '10 → 950', sp: '10 → 1500', dp: '10 → 3000', tp: '10 → 5000', cp: '10 → 1500/3000', hfs: '10 → 10000', fs: '10 → 100000', motar: '7 Ank 15/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white border border-[#E5E7EB] rounded-3xl text-[#0F172A] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-5 border-b border-[#E5E7EB] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">{gameType}</span>
              <span className="bg-[#0EA5E9]/15 border border-[#0EA5E9]/30 text-[#0369A1] px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider">{rateHint[gtNorm] || ''}</span>
              <span className="bg-[#0EA5E9]/20 border border-[#0EA5E9]/50 text-[#0F172A] px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider">{leg}</span>
            </div>
            <h3 className="text-lg font-black text-[#0F172A] leading-tight">{sanitizeText(marketName)}</h3>
            {/* Server-checked window — display only, the server decides. */}
            {mstatus && (
              <p
                className={`mt-1 text-[11px] font-bold ${
                  mstatus.status === 'OPEN' ? 'text-[#16A34A]' : 'text-[#EF4444]'
                }`}
              >
                {mstatus.status === 'OPEN'
                  ? `Market open${remaining !== null && remaining > 0 ? ` • closes in ${formatCountdown(remaining)}` : ''}`
                  : mstatus.status === 'SCHEDULED'
                    ? `Opens at ${mstatus.opensAt ? new Date(mstatus.opensAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''} • betting not open yet`
                    : mstatus.status === 'RESULT_DECLARED'
                      ? 'Result declared • betting closed'
                      : 'Market closed • betting unavailable'}
              </p>
            )}
          </div>
          <button onClick={onClose} disabled={isSubmitting || successMsg} className="p-1.5 rounded-full bg-[#F8FAFC] text-[#6B7280] hover:text-[#0F172A] disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        {successMsg ? (
          <div className="py-10 px-6 flex flex-col items-center justify-center text-center space-y-3 overflow-y-auto">
            <CheckCircle size={56} className="text-[#16A34A] animate-bounce" />
            <h4 className="text-xl font-black text-[#0F172A]">All Bids Submitted!</h4>
            <p className="text-xs text-[#6B7280]">Placed on <span className="text-[#0F172A] font-bold">{sanitizeText(marketName)}</span> ({gameType} / {leg})</p>
            <p className="text-xs text-[#6B7280] font-mono">{queuedBids.length} bid{queuedBids.length > 1 ? 's' : ''} totaling ₹{totalPoints.toLocaleString('en-IN')}</p>
            <button onClick={() => (onGoHome ? onGoHome() : onClose())} className="mt-5 w-full py-3 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base shadow-lg shadow-[#2563EB]/20 active:scale-95 transition flex items-center justify-center gap-2">
              <Home size={18} /><span>Go to Home</span>
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* OPEN / CLOSE */}
              <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-2xl p-1 grid grid-cols-2 gap-1">
                {(['OPEN', 'CLOSE'] as const).map((l) => {
                  const legDisabled = isSubmitting || (l === 'OPEN' && openLegClosed);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => { setLeg(l); setError(''); }}
                      disabled={legDisabled}
                      title={l === 'OPEN' && openLegClosed ? 'Open declared — only CLOSE bets accepted' : undefined}
                      className={`py-2 rounded-xl text-xs font-black transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${leg === l ? 'bg-[#0F172A] text-white shadow-md' : 'bg-transparent text-[#64748B] hover:bg-white'}`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              {openLegClosed && (
                <p className="text-[11px] font-bold text-[#B45309] bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-3 py-2 text-center">
                  Open result declared — only CLOSE bets are accepted now.
                </p>
              )}

              {/* Game-specific picker */}
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-2 tracking-wide">
                  {isAnk ? 'Select Ank (0-9)' : isJodi ? 'Select Jodi (00-99)' : isPanna ? `Select ${gameType} 3-Digit Panna` : isHFS ? 'Half Sangam — Ank + Panna' : isFS ? 'Full Sangam — Pana + Pana' : isMotar ? 'Motor — 7 Ank (e.g. 1234567)' : 'Select Number'}
                </label>

                {isAnk && (
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 10 }, (_, i) => `${i}`).map((d) => (
                      <button key={d} type="button" onClick={() => { setSelectedDigit(d); setCustomDigit(''); setError(''); }} disabled={isSubmitting} className={`py-2.5 text-sm font-black rounded-xl border transition active:scale-95 ${selectedDigit === d && !customDigit ? 'bg-[#0EA5E9] text-white border-[#0EA5E9] shadow-md' : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-white hover:border-[#0EA5E9]/30'}`}>{d}</button>
                    ))}
                  </div>
                )}

                {isJodi && (
                  <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                    {digitsList.map((d) => (
                      <button key={d} type="button" onClick={() => { setSelectedDigit(d); setCustomDigit(''); setError(''); }} disabled={isSubmitting} className={`py-1.5 text-xs font-bold rounded-lg border ${selectedDigit === d && !customDigit ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-[#0EA5E9]/10'}`}>{d}</button>
                    ))}
                  </div>
                )}

                {isPanna && (
                  <div className="grid grid-cols-3 gap-2">
                    {(['h', 't', 'u'] as const).map((pos, idx) => (
                      <div key={pos} className="flex flex-col gap-1.5">
                        <span className="text-center text-[9px] font-bold text-[#64748B] uppercase tracking-widest">{['Hundreds', 'Tens', 'Units'][idx]}</span>
                        <div className="grid grid-cols-3 gap-1">
                          {Array.from({ length: 10 }, (_, i) => `${i}`).map((d) => (
                            <button key={d} type="button" onClick={() => { const next = { ...panelDigits, [pos]: d }; setPanelDigits(next); setCustomDigit(''); setError(''); if (next.h && next.t && next.u) setSelectedDigit(`${next.h}${next.t}${next.u}`); }} disabled={isSubmitting} className={`py-1.5 text-xs font-bold rounded-lg border ${panelDigits[pos] === d && !customDigit ? 'bg-[#0EA5E9] text-white border-[#0EA5E9] shadow' : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-white'}`}>{d}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isHFS && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Ank (0-9)</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {Array.from({ length: 10 }, (_, i) => `${i}`).map((d) => (
                          <button key={d} type="button" onClick={() => setHfAnk(d)} className={`py-2 text-xs font-black rounded-xl border ${hfAnk === d ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'}`}>{d}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Pana (3-digit)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['h', 't', 'u'] as const).map((pos, idx) => (
                          <div key={pos} className="flex flex-col gap-1">
                            <span className="text-center text-[9px] font-bold text-[#64748B]">{['H', 'T', 'U'][idx]}</span>
                            <div className="grid grid-cols-3 gap-1">
                              {Array.from({ length: 10 }, (_, i) => `${i}`).map((d) => (
                                <button key={d} type="button" onClick={() => { const n = { ...hfPanna, [pos]: d }; setHfPanna(n); setError(''); }} className={`py-1 text-[11px] font-bold rounded-lg border ${hfPanna[pos] === d ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'}`}>{d}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-center font-mono font-black text-[#0F172A]"> {hfAnk} * {hfPanna.h || '-'}{hfPanna.t || '-'}{hfPanna.u || '-'} </p>
                    </div>
                  </div>
                )}

                {isFS && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Open Pana</p>
                        <div className="grid grid-cols-3 gap-1">
                          {(['h', 't', 'u'] as const).map((pos) => (
                            <div key={`o-${pos}`} className="grid grid-cols-3 gap-1">
                              {Array.from({ length: 10 }, (_, i) => `${i}`).map((d) => (
                                <button key={d} type="button" onClick={() => { const n = { ...fsOpen, [pos]: d }; setFsOpen(n); }} className={`py-1 text-[11px] font-bold rounded-lg border ${fsOpen[pos] === d ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'}`}>{d}</button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Close Pana</p>
                        <div className="grid grid-cols-3 gap-1">
                          {(['h', 't', 'u'] as const).map((pos) => (
                            <div key={`c-${pos}`} className="grid grid-cols-3 gap-1">
                              {Array.from({ length: 10 }, (_, i) => `${i}`).map((d) => (
                                <button key={d} type="button" onClick={() => { const n = { ...fsClose, [pos]: d }; setFsClose(n); }} className={`py-1 text-[11px] font-bold rounded-lg border ${fsClose[pos] === d ? 'bg-[#14B8A6] text-white border-[#14B8A6]' : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'}`}>{d}</button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-center font-mono font-black text-[#0F172A]">{fsOpenValue || '---'} * {fsCloseValue || '---'}</p>
                  </div>
                )}

                {isMotar && (
                  <div>
                    <input type="text" value={motorDigits} onChange={(e) => setMotorDigits(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="Enter 7 Ank e.g. 1234567" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#0EA5E9]" />
                    <p className="text-[10px] text-[#64748B] mt-1">7 Ank allowed • Rate 15/30 • {motorDigits.length}/7 digits</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Array.from({ length: 10 }, (_, i) => `${i}`).map((d) => (
                        <button key={d} type="button" onClick={() => setMotorDigits((prev) => (prev.includes(d) ? prev.replace(d, '') : (prev + d).slice(0, 7)))} className={`w-8 h-8 rounded-lg text-xs font-black border ${motorDigits.includes(d) ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'bg-white text-[#0F172A] border-[#E2E8F0]'}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                )}

                {!isAnk && !isJodi && !isPanna && !isHFS && !isFS && !isMotar && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {digitsList.map((d) => (
                      <button key={d} type="button" onClick={() => { setSelectedDigit(d); setCustomDigit(''); }} className={`py-2 text-xs font-bold rounded-xl border ${selectedDigit === d ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'}`}>{d}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom input */}
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Or Type Custom Number</label>
                <input
                  type="text"
                  value={customDigit}
                  onChange={(e) => setCustomDigit(e.target.value.replace(/[^0-9\-\*]/g, '').slice(0, 12))}
                  placeholder={isAnk ? '0-9' : isJodi ? '00-99' : isPanna ? 'e.g. 123' : isHFS ? 'e.g. 5*123' : isFS ? 'e.g. 123*456' : isMotar ? 'e.g. 1234567' : 'Enter number'}
                  disabled={isSubmitting}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50"
                />
              </div>

              {/* Points */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[#0F172A]">Points (₹) <span className="text-[#64748B] font-medium">Min ₹10</span></label>
                  <span className="text-[11px] text-[#64748B]">Bal: ₹{userBalance.toLocaleString('en-IN')}</span>
                </div>
                <input type="number" value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value.replace(/[^0-9]/g, ''))))} min={10} max={userBalance} disabled={isSubmitting} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-base font-mono font-black text-[#0F172A] focus:outline-none focus:border-[#0EA5E9] disabled:opacity-50" />
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  {quickAmounts.map((amt) => (
                    <button key={amt} type="button" onClick={() => setAmount(Math.min(amt, userBalance))} disabled={isSubmitting || amt > userBalance} className={`px-2.5 py-1 text-xs font-bold bg-[#F8FAFC] hover:bg-[#E0F2FE] text-[#0F172A] border border-[#E2E8F0] rounded-lg shrink-0 disabled:opacity-50 ${amt > userBalance ? 'opacity-40' : ''}`}>+₹{amt}</button>
                  ))}
                </div>
                <button type="button" onClick={addBid} disabled={isSubmitting} className="mt-3 w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-sm shadow-md shadow-[#2563EB]/20 active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <Plus size={16} className="stroke-[2.5]" /><span>Add to Bids</span>
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-[#EF4444] bg-[#EF4444]/10 p-2 rounded-lg border border-[#EF4444]/30">
                  <AlertCircle size={16} /><span>{error}</span>
                </div>
              )}

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black text-[#0F172A] uppercase tracking-widest">Your Bids</span>
                  <span className="text-[11px] font-bold text-[#0F172A]">{queuedBids.length} queued</span>
                </div>
                {queuedBids.length === 0 ? (
                  <p className="text-[11px] text-[#94A3B8] py-3 text-center">No bids yet.</p>
                ) : (
                  <div className="space-y-2 mb-2">
                    {queuedBids.map((b) => (
                      <div key={b.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 bg-white border border-[#E2E8F0] rounded-xl px-2.5 py-2">
                        <div className="w-9 h-9 shrink-0 rounded-lg bg-[#0EA5E9]/15 border border-[#0EA5E9]/20 flex items-center justify-center">
                          <span className="text-[#0F172A] font-black font-mono text-xs">{b.digit}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-wider">Points</div>
                          <div className="text-[13px] font-black text-[#0F172A] font-mono">₹{b.amount.toLocaleString('en-IN')}</div>
                        </div>
                        <span className="shrink-0 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">{leg}</span>
                        <button type="button" onClick={() => removeBid(b.id)} disabled={isSubmitting} className="shrink-0 p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EF4444]/10 text-[#94A3B8] hover:text-[#EF4444] transition disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] bg-white px-3 sm:px-4 py-2.5 sm:py-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 grid grid-cols-2 gap-1.5 sm:gap-2">
                  <div className="bg-[#F8FAFC] rounded-xl px-2 sm:px-2.5 py-1.5 border border-[#E2E8F0]">
                    <div className="text-[7px] sm:text-[8px] font-bold text-[#94A3B8] uppercase tracking-wider">Total Points</div>
                    <div className="text-xs sm:text-sm font-black text-[#0F172A] font-mono truncate">₹{totalPoints.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl px-2 sm:px-2.5 py-1.5 border border-[#E2E8F0]">
                    <div className="text-[7px] sm:text-[8px] font-bold text-[#94A3B8] uppercase tracking-wider">Total Bids</div>
                    <div className="text-xs sm:text-sm font-black text-[#0F172A] font-mono">{queuedBids.length}</div>
                  </div>
                </div>
                <button type="button" onClick={submitAll} disabled={isSubmitting || windowClosed || (leg === 'OPEN' && openLegClosed)} title={windowClosed ? 'Market is closed — betting unavailable' : leg === 'OPEN' && openLegClosed ? 'Open declared — switch to CLOSE' : undefined} className="shrink-0 py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-xs sm:text-sm shadow-lg shadow-[#2563EB]/20 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Submitting...' : windowClosed ? 'Market Closed' : 'Submit All Bids'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};