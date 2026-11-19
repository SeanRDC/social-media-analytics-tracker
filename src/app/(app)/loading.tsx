import s from "./loading.module.css";

/** Placeholder while a page's numbers load, so moving between pages is instant. */
export default function Loading() {
  return (
    <div className={s.wrap} role="status" aria-label="Loading">
      <span className={`${s.sk} ${s.wide}`} />
      <span className={s.sk} />
      <span className={s.sk} />
      <span className={s.sk} />
    </div>
  );
}
