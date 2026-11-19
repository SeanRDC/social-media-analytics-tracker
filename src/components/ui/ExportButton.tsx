"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "./ExportButton.module.css";

type State = "idle" | "working" | "done";

interface Props {
  format: "PDF" | "CSV";
  report: string;
  /** The CSV download, or the print-ready page for PDF. */
  href: string;
  /** No imported data yet: shown, but not usable. */
  disabled?: boolean;
}

/**
 * One continuous control: download icon → spinner → check → back to idle.
 * CSV downloads in place; PDF opens the print-ready report in a new tab.
 */
export function ExportButton({ format, report, href, disabled = false }: Props) {
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState(state === "working" ? "done" : "idle"), state === "working" ? 1200 : 2500);
    return () => window.clearTimeout(t);
  }, [state]);

  if (disabled) {
    return (
      <span className={`${s.btn} ${s.off}`} role="img" aria-disabled="true" aria-label={`Export ${report} as ${format}: nothing to export yet`} title="Nothing to export yet">
        <span className={s.icon} aria-hidden="true">
          <Icon name="download" size={15} strokeWidth={1.8} />
        </span>
        <span aria-hidden="true">{format}</span>
      </span>
    );
  }

  return (
    <>
      <a
        href={href}
        {...(format === "CSV" ? { download: "" } : { target: "_blank", rel: "noopener" })}
        className={`${s.btn} ${s[state]}`}
        aria-label={`Export ${report} as ${format}`}
        aria-busy={state === "working"}
        aria-disabled={state !== "idle"}
        onClick={(e) => {
          if (state !== "idle") e.preventDefault();
          else setState("working");
        }}
      >
        <span className={s.icon} aria-hidden="true">
          {state === "working" ? <span className={s.spinner} /> : <Icon name={state === "done" ? "check" : "download"} size={15} strokeWidth={1.8} />}
        </span>
        {state === "done" ? "Ready" : format}
      </a>
      <span role="status" className="sr-only">
        {state === "done" ? `${report} ${format} is ready` : ""}
      </span>
    </>
  );
}
