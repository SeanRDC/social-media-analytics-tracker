"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "./Print.module.css";

/** Opens the print dialog once the report has loaded (Save as PDF lives there), and again on demand. */
export function PrintButton() {
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    let left = false;
    // print once the web fonts have loaded, so the PDF uses them
    void document.fonts.ready.then(() => {
      if (!left) window.print();
    });
    return () => {
      left = true;
    };
  }, []);
  return (
    <button type="button" className={s.print} onClick={() => window.print()}>
      <Icon name="download" size={15} strokeWidth={1.8} />
      Save as PDF
    </button>
  );
}
