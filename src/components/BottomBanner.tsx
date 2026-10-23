import React from 'react';

export const BottomBanner: React.FC = () => {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-full font-mono text-[11px] text-slate-400 flex items-center gap-3 select-none pointer-events-none shadow-lg">
      <span className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200 border border-slate-700 font-semibold">
          Left Click + Drag
        </kbd>
        <span>Inject Fluid / Wave Packet</span>
      </span>
      <span className="text-slate-600">|</span>
      <span className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200 border border-slate-700 font-semibold">
          Right Click
        </kbd>
        <span>Draw Barrier</span>
      </span>
      <span className="text-slate-600">|</span>
      <span className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200 border border-slate-700 font-semibold">
          Space
        </kbd>
        <span>Pause / Resume</span>
      </span>
    </div>
  );
};
