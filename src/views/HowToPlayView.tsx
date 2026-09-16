import React, { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { api } from '../lib/api';

export const HowToPlayView: React.FC = () => {
  const [liveSections, setLiveSections] = useState<Array<{ title: string; body: string }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.howToPlay()
      .then((res) => {
        if (res.sections && res.sections.length > 0) setLiveSections(res.sections);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const steps = liveSections
    ? liveSections.map((s, i) => ({ number: String(i + 1), title: s.title, description: s.body }))
    : [
        {
          number: '1',
          title: 'Select a Market',
          description:
            'Choose your favorite market from the Home Dashboard (e.g., MILAN DAY, KALYAN).',
        },
        {
          number: '2',
          title: 'Choose Game Type',
          description:
            'Select game type such as Single Digit, Jodi Digit, Single Panna, or Sangam.',
        },
        {
          number: '3',
          title: 'Enter Digit & Points',
          description:
            'Select your winning numbers and place points/amount using your available wallet balance.',
        },
        {
          number: '4',
          title: 'Wait for Results & Win',
          description:
            'When market results are declared, winnings are automatically credited to your wallet instantly!',
        },
      ];

  return (
    <div className="pb-10 pt-5 px-4 md:px-8 max-w-6xl mx-auto space-y-4">
      <div className="bg-[#E5E7EB] p-3 rounded-2xl border border-[#D1D5DB] text-center">
        <h2 className="font-bold text-base text-[#0F172A] flex items-center justify-center gap-2">
          <HelpCircle size={18} className="text-[#0F172A]" />
          <span>How to Play</span>
        </h2>
        <p className="text-xs text-[#6B7280]">
          Easy step-by-step guide to place bids and win
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex gap-3 shadow-sm"
          >
            <div
              className={`w-8 h-8 rounded-full ${
                step.number === '4'
                  ? 'bg-[#0F172A] text-[#0EA5E9]'
                  : 'bg-[#0EA5E9] text-[#0F172A]'
              } font-black text-sm flex items-center justify-center shrink-0`}
            >
              {step.number}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">{step.title}</h3>
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
