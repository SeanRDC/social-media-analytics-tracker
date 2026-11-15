"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Range } from "@/lib/data/types";

interface RangeState {
  range: Range;
  setRange: (r: Range) => void;
}

const RangeContext = createContext<RangeState>({ range: 30, setRange: () => {} });

export function RangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<Range>(30);
  const value = useMemo(() => ({ range, setRange }), [range]);
  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRange(): RangeState {
  return useContext(RangeContext);
}

export const RANGE_OPTIONS = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
] as const satisfies readonly { value: Range; label: string }[];
