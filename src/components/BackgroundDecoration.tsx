import React from 'react';

export const BackgroundDecoration: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-15">
      {/* Curved wave lines */}
      <svg
        className="absolute top-0 left-0 w-full h-full text-neutral-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 6"
          d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,197.3C960,213,1056,203,1152,176C1248,149,1344,107,1392,85.3L1440,64"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          d="M0,64L60,96C120,128,240,192,360,208C480,224,600,192,720,160C840,128,960,96,1080,106.7C1200,117,1320,171,1380,197.3L1440,224"
        />
      </svg>

      {/* Faint concentric circles top right & bottom left */}
      <div className="absolute -top-24 -right-24 w-72 h-72 border border-neutral-400/20 rounded-full" />
      <div className="absolute -top-16 -right-16 w-56 h-56 border border-neutral-300/15 rounded-full" />
      <div className="absolute -top-8 -right-8 w-40 h-40 border border-neutral-200/10 rounded-full" />

      <div className="absolute top-1/2 -left-32 w-80 h-80 border border-neutral-400/10 rounded-full" />
      <div className="absolute top-1/2 -left-20 w-56 h-56 border border-neutral-300/10 rounded-full" />

      {/* Dotted background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(17, 24, 39, 0.08) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};
