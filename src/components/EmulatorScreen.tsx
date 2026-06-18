"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GamePad from "./GamePad";

type LayoutType = "default" | "arcade";

const FRAMEBUFFER_SIZE = 256 * 240;

// Audio ring buffer constants
// NES APU outputs ~1789772.5 Hz / 2 = ~894886 clocks/sec
// jsnes calls onAudioSample at 44100 Hz output rate
// Ring buffer: large enough to hold ~6 frames of samples without overflow
const SAMPLE_COUNT = 8192; // must be power of 2
const SAMPLE_MASK = SAMPLE_COUNT - 1;
const SCRIPT_BUFFER = 2048; // ScriptProcessor chunk size

export default function EmulatorScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const romPath = searchParams.get("rom") || "/roms/Super Contra.nes";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nesRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutType>("default");
  const [showMenu, setShowMenu] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  
  // Turbo button states - refs for intervals
  const turboARef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turboBRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pixel buffer: Uint32Array view over ImageData for fast writes
  const imageDataRef = useRef<ImageData | null>(null);
  const framebufferU32Ref = useRef<Uint32Array | null>(null);

  // Audio ring buffer (separate L/R, cursor-based, no dynamic allocation)
  const audioSamplesL = useRef(new Float32Array(SAMPLE_COUNT));
  const audioSamplesR = useRef(new Float32Array(SAMPLE_COUNT));
  const audioWriteCursor = useRef(0);
  const audioReadCursor = useRef(0);

  const onFrame = useCallback((buffer: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!imageDataRef.current) {
      imageDataRef.current = ctx.createImageData(256, 240);
      framebufferU32Ref.current = new Uint32Array(imageDataRef.current.data.buffer);
    }

    const fb = framebufferU32Ref.current!;
    for (let i = 0; i < FRAMEBUFFER_SIZE; i++) {
      fb[i] = 0xff000000 | buffer[i];
    }
    ctx.putImageData(imageDataRef.current, 0, 0);
  }, []);

  const onAudioSample = useCallback((left: number, right: number) => {
    const w = audioWriteCursor.current;
    const nextW = (w + 1) & SAMPLE_MASK;
    // Only write if not overrunning read (ring buffer full protection)
    if (nextW !== audioReadCursor.current) {
      audioSamplesL.current[w] = left;
      audioSamplesR.current[w] = right;
      audioWriteCursor.current = nextW;
    }
  }, []);

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 44100,
      latencyHint: "interactive",
    });
    audioCtxRef.current = ctx;

    const scriptNode = ctx.createScriptProcessor(SCRIPT_BUFFER, 0, 2);
    scriptNode.onaudioprocess = (e) => {
      const outL = e.outputBuffer.getChannelData(0);
      const outR = e.outputBuffer.getChannelData(1);
      let r = audioReadCursor.current;
      const w = audioWriteCursor.current;

      for (let i = 0; i < outL.length; i++) {
        if (r === w) {
          // Underrun: output silence (clean, no pop)
          outL[i] = 0;
          outR[i] = 0;
        } else {
          outL[i] = audioSamplesL.current[r];
          outR[i] = audioSamplesR.current[r];
          r = (r + 1) & SAMPLE_MASK;
        }
      }
      audioReadCursor.current = r;
    };

    scriptNode.connect(ctx.destination);
    scriptNodeRef.current = scriptNode;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const jsnesModule = await import("jsnes");
        const NES = jsnesModule.NES || (jsnesModule as any).default?.NES;

        const nes = new NES({ onFrame, onAudioSample });
        nesRef.current = nes;

        const response = await fetch(romPath);
        if (!response.ok) throw new Error(`ROM not found: ${romPath}`);
        const arrayBuffer = await response.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        let romData = "";
        for (let i = 0; i < uint8.length; i++) {
          romData += String.fromCharCode(uint8[i]);
        }

        if (cancelled) return;

        nes.loadROM(romData);
        setLoaded(true);

        // Start audio on first user gesture
        const startAudio = () => {
          initAudio();
          audioCtxRef.current?.resume();
        };
        document.addEventListener("touchstart", startAudio, { once: true });
        document.addEventListener("mousedown", startAudio, { once: true });

        // Run NES logic on a fixed interval for stable audio sample generation.
        // RAF is used only to flush the latest rendered frame to canvas.
        // This decouples audio timing from display refresh rate jitter.
        intervalRef.current = setInterval(() => {
          if (!cancelled && nesRef.current) {
            try {
              nesRef.current.frame();
            } catch {
              // jsnes can throw internally on stop/reset — ignore
            }
          }
        }, 1000 / 60.098);

        // RAF just repaints — canvas is already updated by onFrame inside frame()
        const repaint = () => {
          rafRef.current = requestAnimationFrame(repaint);
        };
        rafRef.current = requestAnimationFrame(repaint);

      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load ROM");
      }
    };

    init();

    return () => {
      cancelled = true;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
      nesRef.current = null;
      scriptNodeRef.current?.disconnect();
      scriptNodeRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, [romPath, onFrame, onAudioSample, initAudio]);

  // Orientation detection
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Button handlers
  const handleButtonDown = useCallback((button: number) => {
    if (nesRef.current) {
      nesRef.current.buttonDown(1, button);
    }
  }, []);

  const handleButtonUp = useCallback((button: number) => {
    if (nesRef.current) {
      nesRef.current.buttonUp(1, button);
    }
  }, []);

  // Turbo button handlers - A for auto-fire, B for continuous jump
  const startTurboA = useCallback(() => {
    if (turboARef.current) return;
    // Rapid fire A button every 50ms (20 times per second)
    turboARef.current = setInterval(() => {
      if (nesRef.current) {
        nesRef.current.buttonDown(1, 0); // BUTTON_A = 0
        setTimeout(() => nesRef.current?.buttonUp(1, 0), 25);
      }
    }, 50);
  }, []);

  const stopTurboA = useCallback(() => {
    if (turboARef.current) {
      clearInterval(turboARef.current);
      turboARef.current = null;
      if (nesRef.current) nesRef.current.buttonUp(1, 0);
    }
  }, []);

  const startTurboB = useCallback(() => {
    if (turboBRef.current) return;
    // Continuous hold B button (for jumping/running)
    if (nesRef.current) nesRef.current.buttonDown(1, 1); // BUTTON_B = 1
    turboBRef.current = setInterval(() => {
      // Keep B pressed, re-press every 100ms to ensure it stays active
      if (nesRef.current) nesRef.current.buttonDown(1, 1);
    }, 100);
  }, []);

  const stopTurboB = useCallback(() => {
    if (turboBRef.current) {
      clearInterval(turboBRef.current);
      turboBRef.current = null;
      if (nesRef.current) nesRef.current.buttonUp(1, 1);
    }
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)" }}>
      {/* Top bar with BACK and Layout selector */}
      <div className={`w-full flex justify-between items-start px-3 z-50 ${isLandscape ? "absolute top-2 left-0" : "pt-2"}`}>
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 text-xs px-2 py-1 rounded border border-gray-800 active:bg-gray-800"
        >
          ← BACK
        </button>

        {/* Layout Selector - hidden in landscape */}
        {!isLandscape && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-xs text-slate-400 bg-slate-800/80 hover:bg-slate-700 px-2 py-1 rounded border border-slate-600"
            >
              Layout ▼
            </button>
            {showMenu && (
              <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-600 rounded shadow-lg py-1 min-w-[100px]">
                <button
                  onClick={() => { setLayout("default"); setShowMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs ${layout === "default" ? "text-green-400 bg-slate-700" : "text-slate-300 hover:bg-slate-700"}`}
                >
                  Default
                </button>
                <button
                  onClick={() => { setLayout("arcade"); setShowMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs ${layout === "arcade" ? "text-green-400 bg-slate-700" : "text-slate-300 hover:bg-slate-700"}`}
                >
                  Arcade
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Screen area — height constrained in landscape so controls don't overlap */}
      <div className={isLandscape ? "flex items-center justify-center" : "w-full px-3 mt-1"} style={isLandscape ? { marginTop: 10 } : undefined}>
        <div
          className="relative aspect-[256/240] bg-gray-950 rounded-xl border-2 border-gray-800 overflow-hidden shadow-[0_0_30px_rgba(0,255,0,0.05)]"
          style={isLandscape
            ? { height: "calc(100vh - 60px)" }
            : { width: "100%", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}
        >
          <canvas
            ref={canvasRef}
            width={256}
            height={240}
            className="w-full h-full image-rendering-pixelated"
            style={{ imageRendering: "pixelated" }}
          />
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-green-400 text-sm animate-pulse">
                Loading...
              </span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <span className="text-red-400 text-sm text-center">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom gamepad — pinned to bottom (portrait) or floating over edges (landscape) */}
      <GamePad 
        onButtonDown={handleButtonDown} 
        onButtonUp={handleButtonUp} 
        layout={layout}
        isLandscape={isLandscape}
        onTurboAStart={startTurboA}
        onTurboAStop={stopTurboA}
        onTurboBStart={startTurboB}
        onTurboBStop={stopTurboB}
      />
    </div>
  );
}
