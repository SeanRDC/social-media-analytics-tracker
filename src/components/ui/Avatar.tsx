interface Props {
  size?: number;
  label?: string;
  className?: string;
  /** The person's photo; without one, the placeholder art is shown. */
  src?: string | null;
}

/** Account avatar: the uploaded photo when there is one, otherwise the placeholder art. */
export function Avatar({ size = 34, label, className, src }: Props) {
  const frame = { width: size, height: size, borderRadius: "50%", position: "relative", overflow: "hidden", background: "#141416", flex: "none", display: "block" } as const;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny same-origin photo; next/image adds nothing here
    return <img src={src} alt={label ?? ""} width={size} height={size} className={className} style={{ ...frame, objectFit: "cover" }} />;
  }
  return (
    <span className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={frame}>
      <i className="lens" style={{ width: "100%", left: 0, top: 0 }} />
    </span>
  );
}
