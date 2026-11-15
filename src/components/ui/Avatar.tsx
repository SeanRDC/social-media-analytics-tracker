interface Props {
  size?: number;
  label?: string;
  className?: string;
}

/** Account avatar. Uses the lens artwork until real profile images come from the backend. */
export function Avatar({ size = 34, label, className }: Props) {
  return (
    <span
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, borderRadius: "50%", position: "relative", overflow: "hidden", background: "#0b1220", flex: "none", display: "block" }}
    >
      <i className="lens" style={{ width: "100%", left: 0, top: 0 }} />
    </span>
  );
}
