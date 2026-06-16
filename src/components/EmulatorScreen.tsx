"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GamePad from "./GamePad";

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

  return (
    <div className="fixed inset-0 flex flex-col items-center" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)" }}>
      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="self-start mt-2 ml-3 z-50 text-gray-600 text-xs px-2 py-1 rounded border border-gray-800 active:bg-gray-800"
      >
        ← BACK
      </button>

      {/* Screen area — pinned to top */}
      <div className="w-full px-3 mt-1">
        <div className="relative w-full max-w-[400px] mx-auto aspect-[256/240] bg-gray-950 rounded-xl border-2 border-gray-800 overflow-hidden shadow-[0_0_30px_rgba(0,255,0,0.05)]">
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

      {/* Custom gamepad — pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <GamePad onButtonDown={handleButtonDown} onButtonUp={handleButtonUp} />
      </div>
    </div>
  );
}
