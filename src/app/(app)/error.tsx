"use client";

import { ErrorCard } from "@/components/errors/ErrorCard";

/** A dashboard page failed: the navbar stays, the page area explains and offers a retry. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorCard error={error} retry={retry} home={{ href: "/overview", label: "Go to your dashboard" }} />;
}
