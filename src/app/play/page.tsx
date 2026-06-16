"use client";

import { Suspense } from "react";
import EmulatorScreen from "@/components/EmulatorScreen";

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen" />}>
      <EmulatorScreen />
    </Suspense>
  );
}
