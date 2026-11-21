import { afterEach, describe, expect, it } from "vitest";
import { PageMirror } from "../pageMirror";

/** A page column with a mirror kept in step by a MutationObserver (records taken synchronously). */
function setup(html: string) {
  const source = document.createElement("main");
  source.innerHTML = html;
  document.body.append(source);
  const mirror = new PageMirror(source);
  document.body.append(mirror.root);
  const mo = new MutationObserver(() => {});
  mo.observe(source, PageMirror.observe);
  const sync = () => mirror.apply(mo.takeRecords());
  return { source, mirror, sync };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PageMirror", () => {
  it("copies the page without ids, and makes the copy inert", () => {
    const { mirror } = setup('<section id="kpis"><h1 id="t">Overview</h1></section>');
    expect(mirror.root.textContent).toBe("Overview");
    expect(mirror.root.querySelector("[id]")).toBeNull();
    expect(mirror.root.hasAttribute("inert")).toBe(true);
  });

  it("shows a new tab's content as soon as the page swaps it in", () => {
    const { source, mirror, sync } = setup("<div class='page'><h1>Overview</h1></div>");
    source.querySelector(".page")!.innerHTML = "<h1>Reports</h1><p>Weekly</p>";
    sync();
    expect(mirror.root.querySelector("h1")!.textContent).toBe("Reports");
    expect(mirror.root.querySelector("p")!.textContent).toBe("Weekly");
  });

  it("follows numbers counting up, text node by text node", () => {
    const { source, mirror, sync } = setup("<b>0</b>");
    const text = source.querySelector("b")!.firstChild!;
    for (const n of ["120", "860", "1,234"]) {
      text.nodeValue = n;
      sync();
    }
    expect(mirror.root.querySelector("b")!.textContent).toBe("1,234");
  });

  it("mirrors attribute changes and removals, but never ids", () => {
    const { source, mirror, sync } = setup('<a class="tab" data-active="false" title="x">Overview</a>');
    const a = source.querySelector("a")!;
    a.setAttribute("data-active", "true");
    a.className = "tab on";
    a.removeAttribute("title");
    a.id = "now-has-id";
    sync();
    const copy = mirror.root.querySelector("a")!;
    expect(copy.getAttribute("data-active")).toBe("true");
    expect(copy.className).toBe("tab on");
    expect(copy.hasAttribute("title")).toBe(false);
    expect(copy.hasAttribute("id")).toBe(false);
  });

  it("keeps up with changes inside newly added content", () => {
    const { source, mirror, sync } = setup("<div class='slot'></div>");
    source.querySelector(".slot")!.innerHTML = "<span>Loading</span>";
    sync();
    source.querySelector(".slot span")!.textContent = "Loaded";
    sync();
    expect(mirror.root.querySelector(".slot")!.textContent).toBe("Loaded");
  });

  it("handles removals and changes nested inside a rebuilt element in one batch", () => {
    const { source, mirror, sync } = setup("<ul><li>a</li><li>b</li></ul>");
    const ul = source.querySelector("ul")!;
    ul.lastElementChild!.remove();
    ul.firstElementChild!.textContent = "A";
    ul.append(Object.assign(document.createElement("li"), { textContent: "c" }));
    sync();
    expect([...mirror.root.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["A", "c"]);
  });

  it("ignores the column's own attributes, which only move it", () => {
    const { source, mirror, sync } = setup("<p>x</p>");
    source.style.transform = "translate3d(0, 40px, 0)";
    source.dataset.anim = "true";
    sync();
    expect(mirror.root.style.transform).toBe("");
    expect(mirror.root.dataset.anim).toBeUndefined();
  });

  it("mirrors chart attributes on SVG elements", () => {
    const { source, mirror, sync } = setup('<svg><path d="M0 0L1 1"></path></svg>');
    source.querySelector("path")!.setAttribute("d", "M0 0L5 5");
    sync();
    expect(mirror.root.querySelector("path")!.getAttribute("d")).toBe("M0 0L5 5");
  });
});
