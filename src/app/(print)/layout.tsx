import type { ReactNode } from "react";

/** Print views: no app chrome, just the document. */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return children;
}
