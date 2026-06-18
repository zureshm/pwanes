"use client";

import { useCallback, useRef, useState } from "react";

const BUTTON_A = 0;
const BUTTON_B = 1;
const BUTTON_SELECT = 2;
const BUTTON_START = 3;
const BUTTON_UP = 4;
const BUTTON_DOWN = 5;
const BUTTON_LEFT = 6;
const BUTTON_RIGHT = 7;

interface GamePadProps {
  onButtonDown: (button: number) => void;
  onButtonUp: (button: number) => void;
  layout?: "default" | "arcade";
  isLandscape?: boolean;
  onTurboAStart?: () => void;
  onTurboAStop?: () => void;
  onTurboBStart?: () => void;
  onTurboBStop?: () => void;
}

export default function GamePad({ 
  onButtonDown, 
  onButtonUp, 
  layout = "default",
  isLandscape = false,
  onTurboAStart,
  onTurboAStop,
  onTurboBStart,
  onTurboBStop
}: GamePadProps) {
  const activeButtons = useRef<Set<number>>(new Set());

  const press = useCallback(
    (btn: number) => {
      if (!activeButtons.current.has(btn)) {
        activeButtons.current.add(btn);
        onButtonDown(btn);
      }
    },
    [onButtonDown]
  );

  const release = useCallback(
    (btn: number) => {
      activeButtons.current.delete(btn);
      onButtonUp(btn);
    },
    [onButtonUp]
  );

  const diagHandlers = (b1: number, b2: number) => ({
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); press(b1); press(b2); },
    onTouchEnd:   (e: React.TouchEvent) => { e.preventDefault(); release(b1); release(b2); },
    onTouchCancel:(e: React.TouchEvent) => { e.preventDefault(); release(b1); release(b2); },
    onMouseDown:  () => { press(b1); press(b2); },
    onMouseUp:    () => { release(b1); release(b2); },
    onMouseLeave: () => { release(b1); release(b2); },
  });

  const handlers = (btn: number) => ({
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); press(btn); },
    onTouchEnd:   (e: React.TouchEvent) => { e.preventDefault(); release(btn); },
    onTouchCancel:(e: React.TouchEvent) => { e.preventDefault(); release(btn); },
    onMouseDown:  () => press(btn),
    onMouseUp:    () => release(btn),
    onMouseLeave: () => release(btn),
  });

  const DefaultLayout = () => (
    <>
      {/* SELECT / START */}
      <div className="flex justify-center gap-6 mb-4">
        {[{ label: "SELECT", btn: BUTTON_SELECT }, { label: "START", btn: BUTTON_START }].map(({ label, btn }) => (
          <button
            key={label}
            {...handlers(btn)}
            style={{
              background: "linear-gradient(180deg, #3a3a5c 0%, #22223a 100%)",
              boxShadow: "0 3px 0 #0a0a18, 0 0 12px rgba(100,100,200,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
              border: "1px solid #4a4a6a",
            }}
            className="rounded-full w-20 h-7 text-[10px] font-semibold tracking-widest text-slate-300 uppercase active:translate-y-[2px] active:shadow-none transition-all duration-75 select-none"
          >
            {label}
          </button>
        ))}
      </div>

      {/* D-Pad + A/B */}
      <div className="flex justify-between items-center px-2">
        {/* D-Pad */}
        <div className="relative w-36 h-36">
          <div className="absolute top-1/2 left-0 w-full h-12 -translate-y-1/2 rounded-lg" style={{ background: "#1e1e32", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }} />
          <div className="absolute left-1/2 top-0 h-full w-12 -translate-x-1/2 rounded-lg" style={{ background: "#1e1e32", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-sm z-10" style={{ background: "#252540" }} />

          {/* Diagonals */}
          <button {...diagHandlers(BUTTON_UP, BUTTON_LEFT)} className="absolute top-0 left-0 w-10 h-10 z-20 flex items-center justify-center select-none active:brightness-75" style={{ background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2L10 2L2 10Z" fill="#475569"/></svg>
          </button>
          <button {...diagHandlers(BUTTON_UP, BUTTON_RIGHT)} className="absolute top-0 right-0 w-10 h-10 z-20 flex items-center justify-center select-none active:brightness-75" style={{ background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M10 2L10 10L2 2Z" fill="#475569"/></svg>
          </button>
          <button {...diagHandlers(BUTTON_DOWN, BUTTON_LEFT)} className="absolute bottom-0 left-0 w-10 h-10 z-20 flex items-center justify-center select-none active:brightness-75" style={{ background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 10L2 2L10 10Z" fill="#475569"/></svg>
          </button>
          <button {...diagHandlers(BUTTON_DOWN, BUTTON_RIGHT)} className="absolute bottom-0 right-0 w-10 h-10 z-20 flex items-center justify-center select-none active:brightness-75" style={{ background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M10 10L2 10L10 2Z" fill="#475569"/></svg>
          </button>

          {/* UP/DOWN/LEFT/RIGHT */}
          <button {...handlers(BUTTON_UP)} className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 z-20 flex items-center justify-center rounded-t-lg" style={{ background: "linear-gradient(180deg, #2e2e50 0%, #1e1e38 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2L13 12H1L7 2Z" fill="#94a3b8"/></svg>
          </button>
          <button {...handlers(BUTTON_DOWN)} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 z-20 flex items-center justify-center rounded-b-lg" style={{ background: "linear-gradient(0deg, #2e2e50 0%, #1e1e38 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 12L1 2H13L7 12Z" fill="#94a3b8"/></svg>
          </button>
          <button {...handlers(BUTTON_LEFT)} className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 z-20 flex items-center justify-center rounded-l-lg" style={{ background: "linear-gradient(90deg, #2e2e50 0%, #1e1e38 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7L12 1V13L2 7Z" fill="#94a3b8"/></svg>
          </button>
          <button {...handlers(BUTTON_RIGHT)} className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 z-20 flex items-center justify-center rounded-r-lg" style={{ background: "linear-gradient(270deg, #2e2e50 0%, #1e1e38 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M12 7L2 13V1L12 7Z" fill="#94a3b8"/></svg>
          </button>
        </div>

        {/* A / B */}
        <div className="relative w-36 h-36">
          <button {...handlers(BUTTON_A)} className="absolute bottom-2 left-2 rounded-full flex items-center justify-center select-none transition-all active:translate-y-[2px]" style={{ width: 60, height: 60, background: "linear-gradient(145deg, #dc2626, #991b1b)", boxShadow: "0 5px 0 #450a0a, 0 6px 16px rgba(220,38,38,0.4)", border: "1px solid #dc2626" }}>
            <span className="text-white font-bold text-xl">A</span>
          </button>
          <button {...handlers(BUTTON_B)} className="absolute top-2 right-2 rounded-full flex items-center justify-center select-none transition-all active:translate-y-[2px]" style={{ width: 56, height: 56, background: "linear-gradient(145deg, #7c3aed, #5b21b6)", boxShadow: "0 5px 0 #3b0764, 0 6px 16px rgba(124,58,237,0.4)", border: "1px solid #7c3aed" }}>
            <span className="text-white font-bold text-lg">B</span>
          </button>
        </div>
      </div>
    </>
  );

  const ArcadeLayout = () => (
    <div className="relative w-full max-w-[360px] mx-auto">
      {/* A/B on top */}
      <div className="flex justify-center gap-8 mb-3">
        <button {...handlers(BUTTON_B)} className="rounded-full flex items-center justify-center select-none transition-all active:translate-y-[2px]" style={{ width: 56, height: 56, background: "linear-gradient(145deg, #7c3aed, #5b21b6)", boxShadow: "0 5px 0 #3b0764, 0 6px 16px rgba(124,58,237,0.4)", border: "1px solid #7c3aed" }}>
          <span className="text-white font-bold text-lg">B</span>
        </button>
        <button {...handlers(BUTTON_A)} className="rounded-full flex items-center justify-center select-none transition-all active:translate-y-[2px]" style={{ width: 60, height: 60, background: "linear-gradient(145deg, #dc2626, #991b1b)", boxShadow: "0 5px 0 #450a0a, 0 6px 16px rgba(220,38,38,0.4)", border: "1px solid #dc2626" }}>
          <span className="text-white font-bold text-xl">A</span>
        </button>
      </div>

      {/* Big D-Pad centered */}
      <div className="relative w-44 h-44 mx-auto">
        <div className="absolute top-1/2 left-0 w-full h-14 -translate-y-1/2 rounded-xl" style={{ background: "#1e1e32", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)" }} />
        <div className="absolute left-1/2 top-0 h-full w-14 -translate-x-1/2 rounded-xl" style={{ background: "#1e1e32", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded z-10" style={{ background: "#252540" }} />

        {/* Directions - bigger buttons */}
        <button {...handlers(BUTTON_UP)} className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 z-20 flex items-center justify-center rounded-t-xl" style={{ background: "linear-gradient(180deg, #3e3e60 0%, #2e2e48 100%)" }}>
          <svg width="16" height="16" viewBox="0 0 14 14"><path d="M7 2L13 12H1L7 2Z" fill="#94a3b8"/></svg>
        </button>
        <button {...handlers(BUTTON_DOWN)} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 z-20 flex items-center justify-center rounded-b-xl" style={{ background: "linear-gradient(0deg, #3e3e60 0%, #2e2e48 100%)" }}>
          <svg width="16" height="16" viewBox="0 0 14 14"><path d="M7 12L1 2H13L7 12Z" fill="#94a3b8"/></svg>
        </button>
        <button {...handlers(BUTTON_LEFT)} className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 z-20 flex items-center justify-center rounded-l-xl" style={{ background: "linear-gradient(90deg, #3e3e60 0%, #2e2e48 100%)" }}>
          <svg width="16" height="16" viewBox="0 0 14 14"><path d="M2 7L12 1V13L2 7Z" fill="#94a3b8"/></svg>
        </button>
        <button {...handlers(BUTTON_RIGHT)} className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 z-20 flex items-center justify-center rounded-r-xl" style={{ background: "linear-gradient(270deg, #3e3e60 0%, #2e2e48 100%)" }}>
          <svg width="16" height="16" viewBox="0 0 14 14"><path d="M12 7L2 13V1L12 7Z" fill="#94a3b8"/></svg>
        </button>

        {/* Diagonals in corners */}
        <button {...diagHandlers(BUTTON_UP, BUTTON_LEFT)} className="absolute top-1 left-1 w-12 h-12 z-20 flex items-center justify-center" style={{ background: "transparent" }}>
          <svg width="14" height="14" viewBox="0 0 12 12"><path d="M2 2L10 2L2 10Z" fill="#64748b"/></svg>
        </button>
        <button {...diagHandlers(BUTTON_UP, BUTTON_RIGHT)} className="absolute top-1 right-1 w-12 h-12 z-20 flex items-center justify-center" style={{ background: "transparent" }}>
          <svg width="14" height="14" viewBox="0 0 12 12"><path d="M10 2L10 10L2 2Z" fill="#64748b"/></svg>
        </button>
        <button {...diagHandlers(BUTTON_DOWN, BUTTON_LEFT)} className="absolute bottom-1 left-1 w-12 h-12 z-20 flex items-center justify-center" style={{ background: "transparent" }}>
          <svg width="14" height="14" viewBox="0 0 12 12"><path d="M2 10L2 2L10 10Z" fill="#64748b"/></svg>
        </button>
        <button {...diagHandlers(BUTTON_DOWN, BUTTON_RIGHT)} className="absolute bottom-1 right-1 w-12 h-12 z-20 flex items-center justify-center" style={{ background: "transparent" }}>
          <svg width="14" height="14" viewBox="0 0 12 12"><path d="M10 10L2 10L10 2Z" fill="#64748b"/></svg>
        </button>
      </div>

      {/* SL / ST compact at bottom */}
      <div className="flex justify-center gap-3 mt-3">
        <button {...handlers(BUTTON_SELECT)} className="rounded-md flex items-center justify-center select-none active:translate-y-[1px]" style={{ width: 44, height: 24, background: "#2a2a4a", border: "1px solid #3a3a6a" }}>
          <span className="text-slate-300 text-[9px] font-bold tracking-wider">SL</span>
        </button>
        <button {...handlers(BUTTON_START)} className="rounded-md flex items-center justify-center select-none active:translate-y-[1px]" style={{ width: 44, height: 24, background: "#2a2a4a", border: "1px solid #3a3a6a" }}>
          <span className="text-slate-300 text-[9px] font-bold tracking-wider">ST</span>
        </button>
      </div>
    </div>
  );

  // Landscape layout — controls float over left/right screen edges
  const LandscapeLayout = () => (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* D-Pad floats vertically centered on left */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 pointer-events-auto">
        <div className="relative w-36 h-36">
          <div className="absolute top-1/2 left-0 w-full h-12 -translate-y-1/2 rounded-lg" style={{ background: "#1e1e32", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }} />
          <div className="absolute left-1/2 top-0 h-full w-12 -translate-x-1/2 rounded-lg" style={{ background: "#1e1e32", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-sm z-10" style={{ background: "#252540" }} />
          
          {/* Diagonals */}
          <button {...diagHandlers(BUTTON_UP, BUTTON_LEFT)} className="absolute top-0 left-0 w-10 h-10 z-20 flex items-center justify-center select-none active:brightness-75" style={{ background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2L10 2L2 10Z" fill="#475569"/></svg>
          </button>
          <button {...diagHandlers(BUTTON_UP, BUTTON_RIGHT)} className="absolute top-0 right-0 w-10 h-10 z-20 flex items-center justify-center select-none active:brightness-75" style={{ background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M10 2L10 10L2 2Z" fill="#475569"/></svg>
          </button>
          <button {...diagHandlers(BUTTON_DOWN, BUTTON_LEFT)} className="absolute bottom-0 left-0 w-10 h-10 z-20 flex items-center justify-center select-none active:brightness-75" style={{ background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 10L2 2L10 10Z" fill="#475569"/></svg>
          </button>
          <button {...diagHandlers(BUTTON_DOWN, BUTTON_RIGHT)} className="absolute bottom-0 right-0 w-10 h-10 z-20 flex items-center justify-center select-none active:brightness-75" style={{ background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M10 10L2 10L10 2Z" fill="#475569"/></svg>
          </button>

          {/* Directions */}
          <button {...handlers(BUTTON_UP)} className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 z-20 flex items-center justify-center rounded-t-lg" style={{ background: "linear-gradient(180deg, #2e2e50 0%, #1e1e38 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2L13 12H1L7 2Z" fill="#94a3b8"/></svg>
          </button>
          <button {...handlers(BUTTON_DOWN)} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 z-20 flex items-center justify-center rounded-b-lg" style={{ background: "linear-gradient(0deg, #2e2e50 0%, #1e1e38 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 12L1 2H13L7 12Z" fill="#94a3b8"/></svg>
          </button>
          <button {...handlers(BUTTON_LEFT)} className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 z-20 flex items-center justify-center rounded-l-lg" style={{ background: "linear-gradient(90deg, #2e2e50 0%, #1e1e38 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7L12 1V13L2 7Z" fill="#94a3b8"/></svg>
          </button>
          <button {...handlers(BUTTON_RIGHT)} className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 z-20 flex items-center justify-center rounded-r-lg" style={{ background: "linear-gradient(270deg, #2e2e50 0%, #1e1e38 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M12 7L2 13V1L12 7Z" fill="#94a3b8"/></svg>
          </button>
        </div>
      </div>

      {/* Action buttons float vertically centered on right — diamond layout */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-auto">
        <div className="relative w-40 h-40">
          {/* A — top */}
          <button {...handlers(BUTTON_A)} className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center select-none transition-all active:translate-y-[2px]" style={{ width: 56, height: 56, background: "linear-gradient(145deg, #dc2626, #991b1b)", boxShadow: "0 5px 0 #450a0a, 0 6px 16px rgba(220,38,38,0.4)", border: "1px solid #dc2626" }}>
            <span className="text-white font-bold text-lg">A</span>
          </button>
          {/* B — left */}
          <button {...handlers(BUTTON_B)} className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center select-none transition-all active:translate-y-[2px]" style={{ width: 56, height: 56, background: "linear-gradient(145deg, #7c3aed, #5b21b6)", boxShadow: "0 5px 0 #3b0764, 0 6px 16px rgba(124,58,237,0.4)", border: "1px solid #7c3aed" }}>
            <span className="text-white font-bold text-lg">B</span>
          </button>
          {/* A turbo — right */}
          <button 
            onTouchStart={(e) => { e.preventDefault(); onTurboAStart?.(); }}
            onTouchEnd={(e) => { e.preventDefault(); onTurboAStop?.(); }}
            onMouseDown={onTurboAStart}
            onMouseUp={onTurboAStop}
            onMouseLeave={onTurboAStop}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center select-none transition-all active:translate-y-[2px]" 
            style={{ width: 56, height: 56, background: "linear-gradient(145deg, #f97316, #c2410c)", boxShadow: "0 5px 0 #9a3412, 0 6px 16px rgba(249,115,22,0.4)", border: "1px solid #f97316" }}
          >
            <span className="text-white font-bold text-sm">A⚡</span>
          </button>
          {/* B turbo — bottom */}
          <button 
            onTouchStart={(e) => { e.preventDefault(); onTurboBStart?.(); }}
            onTouchEnd={(e) => { e.preventDefault(); onTurboBStop?.(); }}
            onMouseDown={onTurboBStart}
            onMouseUp={onTurboBStop}
            onMouseLeave={onTurboBStop}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center select-none transition-all active:translate-y-[2px]" 
            style={{ width: 56, height: 56, background: "linear-gradient(145deg, #a855f7, #7e22ce)", boxShadow: "0 5px 0 #581c87, 0 6px 16px rgba(168,85,247,0.4)", border: "1px solid #a855f7" }}
          >
            <span className="text-white font-bold text-sm">B⚡</span>
          </button>
        </div>
      </div>

      {/* SL/ST float bottom-center */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto flex gap-4">
        <button {...handlers(BUTTON_SELECT)} className="rounded-md flex items-center justify-center select-none active:translate-y-[1px]" style={{ width: 48, height: 24, background: "#2a2a4a", border: "1px solid #3a3a6a" }}>
          <span className="text-slate-300 text-[9px] font-bold tracking-wider">SL</span>
        </button>
        <button {...handlers(BUTTON_START)} className="rounded-md flex items-center justify-center select-none active:translate-y-[1px]" style={{ width: 48, height: 24, background: "#2a2a4a", border: "1px solid #3a3a6a" }}>
          <span className="text-slate-300 text-[9px] font-bold tracking-wider">ST</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[420px] mx-auto px-5 pt-4 pb-5">
      {isLandscape ? <LandscapeLayout /> : (layout === "default" ? <DefaultLayout /> : <ArcadeLayout />)}
    </div>
  );
}
