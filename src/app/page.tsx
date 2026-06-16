"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RomFile {
  name: string;
  path: string;
}

export default function GameSelector() {
  const router = useRouter();
  const [roms, setRoms] = useState<RomFile[]>([]);

  useEffect(() => {
    fetch("/api/roms")
      .then((res) => res.json())
      .then((data) => setRoms(data))
      .catch(() => {
        // Fallback: hardcoded ROM list for static export
        setRoms([
          { name: "Super Mario Bros", path: "/roms/Mario Bros.nes" },
          { name: "Arkanoid", path: "/roms/Arkanoid.nes" },
          { name: "Pac-Man", path: "/roms/Pac-Man.nes" },
          { name: "Bugs Bunny Crazy Castle", path: "/roms/Bugs Bunny Crazy Castle.nes" },
          { name: "The Jungle Book", path: "/roms/Jungle Book.nes" },
          { name: "Super Contra", path: "/roms/Super C.nes" },
          { name: "Dragon Fighter", path: "/roms/Dragon Fighter.nes" },
          { name: "Shadow of the Ninja", path: "/roms/Shadow of the Ninja.nes" },
          { name: "CrossFire", path: "/roms/CrossFire.nes" },
          { name: "Prince of Persia", path: "/roms/Prince of Persia.nes" },
        ]);
      });
  }, []);

  const handleSelect = (rom: RomFile) => {
    const encoded = encodeURIComponent(rom.path);
    router.push(`/play?rom=${encoded}`);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-green-400 mb-2 tracking-wider">
        NES PLAYER
      </h1>
      <p className="text-gray-500 text-sm mb-8">Select a game to play</p>

      <div
        className="w-full max-w-sm space-y-3"
        style={roms.length > 5 ? { maxHeight: "calc(5 * 72px)", overflowY: "auto", paddingRight: "4px" } : {}}
      >
        {roms.map((rom) => (
          <button
            key={rom.path}
            onClick={() => handleSelect(rom)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-5 py-4 text-left hover:bg-gray-800 hover:border-green-500 transition-all active:scale-95"
          >
            <span className="text-white font-medium text-lg">{rom.name}</span>
          </button>
        ))}

        {roms.length === 0 && (
          <p className="text-gray-600 text-center">
            No ROMs found. Place .nes files in /public/roms/
          </p>
        )}
      </div>

      <p className="text-gray-700 text-xs mt-10">
        Place .nes ROM files in the /public/roms/ folder
      </p>
    </div>
  );
}
