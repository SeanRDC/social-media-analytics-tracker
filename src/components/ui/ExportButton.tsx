"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "./ExportButton.module.css";

type State = "idle" | "working" | "done";

interface Props {
  format: "PDF" | "CSV";
  report: string;
}

/**
 * One continuous control: download icon → spinner → check → back to idle.
 * The prototype simulates preparation; the backend phase produces the real file.
 */
export function ExportButton({ format, report }: Props) {
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState(state === "working" ? "done" : "idle"), state === "working" ? 1200 : 2500);
    return () => window.clearTimeout(t);
  }, [state]);

  return (
    <>
      <button
        type="button"
        className={`${s.btn} ${s[state]}`}
        aria-label={`Export ${report} as ${format}`}
        aria-busy={state === "working"}
        disabled={state !== "idle"}
        onClick={() => setState("working")}
      >
        <span className={s.icon} aria-hidden="true">
          {state === "working" ? <span className={s.spinner} /> : <Icon name={state === "done" ? "check" : "download"} size={15} strokeWidth={1.8} />}
        </span>
        {state === "done" ? "Ready" : format}
      </button>
      <span role="status" className="sr-only">
        {state === "done" ? `${report} ${format} is ready` : ""}
      </span>
    </>
  );
}
