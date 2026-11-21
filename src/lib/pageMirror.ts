/**
 * A live, inert copy of part of the page, for the Liquid Glass refraction.
 *
 * The copy is made once, then kept in step with the original change by change
 * (feed it MutationObserver records): edited text and attributes are written to
 * the matching copied node, and when children are added or removed only that
 * element's children are copied again. Updates land in the same frame as the
 * page's own, and cost only as much as what changed, so the glass never shows
 * a stale page, even while a new tab streams in or numbers count up.
 *
 * Copies carry no ids (they would clash with the page's) and are inert, so
 * nothing in them can be focused, clicked or read out.
 */
export class PageMirror {
  /** The copy of the source element; put it in the document. */
  readonly root: HTMLElement;
  // each original node → its copy (weak: dropped nodes are forgotten)
  private copies = new WeakMap<Node, Node>();

  constructor(private source: HTMLElement) {
    this.root = this.copy(source) as HTMLElement;
    this.root.setAttribute("inert", "");
  }

  /** Observer options that report every change apply() can mirror. */
  static readonly observe: MutationObserverInit = { subtree: true, childList: true, characterData: true, attributes: true };

  /** Copies a node and its subtree, without ids, remembering which copy is whose. */
  private copy(node: Node): Node {
    const c = node.cloneNode(true);
    if (c instanceof Element) {
      c.removeAttribute("id");
      c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    }
    this.link(node, c);
    return c;
  }

  private link(original: Node, copy: Node) {
    this.copies.set(original, copy);
    const a = original.childNodes;
    const b = copy.childNodes;
    for (let i = 0; i < a.length && i < b.length; i++) this.link(a[i], b[i]);
  }

  /**
   * Brings the copy up to date with a batch of mutation records. Changes to
   * the source element's own attributes are left out: they only move it (a
   * pull to refresh), and the caller positions the copy.
   */
  apply(records: MutationRecord[]) {
    // structure first: re-copy the children of each changed element, outermost only
    const changed = new Set<Node>();
    for (const r of records) if (r.type === "childList") changed.add(r.target);
    for (const t of changed) {
      if (!t.isConnected && t !== this.source) continue;
      let covered = false;
      for (const o of changed) if (o !== t && o.contains(t)) covered = true;
      if (covered) continue;
      const mine = this.copies.get(t);
      if (mine instanceof Element) mine.replaceChildren(...Array.from(t.childNodes, (n) => this.copy(n)));
    }

    // then values, read from the page as it is now (so the order of records doesn't matter)
    for (const r of records) {
      if (r.type === "characterData") {
        const mine = this.copies.get(r.target);
        if (mine) mine.nodeValue = r.target.nodeValue;
      } else if (r.type === "attributes" && r.target !== this.source && r.attributeName && r.attributeName !== "id") {
        const mine = this.copies.get(r.target);
        if (!(mine instanceof Element) || !(r.target instanceof Element)) continue;
        const ns = r.attributeNamespace;
        const local = r.attributeName.includes(":") ? r.attributeName.split(":")[1] : r.attributeName;
        const value = ns ? r.target.getAttributeNS(ns, local) : r.target.getAttribute(r.attributeName);
        if (value === null) {
          if (ns) mine.removeAttributeNS(ns, local);
          else mine.removeAttribute(r.attributeName);
        } else if (ns) mine.setAttributeNS(ns, r.attributeName, value);
        else mine.setAttribute(r.attributeName, value);
      }
    }
  }
}
