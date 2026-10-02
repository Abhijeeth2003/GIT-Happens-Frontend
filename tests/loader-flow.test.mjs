import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
const root = fileURLToPath(new URL("..", import.meta.url));

// Exercise the actual screen event handlers without requiring a browser or
// adding a test framework. Only the framework hooks and Next adapters are stubbed.
export function workspace({ screenSource, desktop = true } = {}) {
  const storage = new Map();
  const cache = new Map();
  const navigations = [];
  const image = props => jsxRuntime.jsx("img", { ...props });
  const link = props => jsxRuntime.jsx("a", { ...props });
  const react = {
    useState: value => [value, () => {}],
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  };
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} };
    cache.set(filename, compiledModule);
    const source = screenSource && filename === path.join(root, "app/loader/LoaderScreen.tsx") ? screenSource : fs.readFileSync(filename, "utf8");
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = name => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "next/image") return image;
      if (name === "next/link") return link;
      if (name === "next/navigation") return { useRouter: () => ({ push: url => navigations.push(url) }) };
      if (name.endsWith(".css")) return new Proxy({}, { get: (_target, key) => key === "__esModule" ? false : String(key) });
      const resolved = name.startsWith("@/") ? path.resolve(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (name.endsWith(".json")) return JSON.parse(fs.readFileSync(resolved, "utf8"));
      return load([resolved + ".ts", resolved + ".tsx"].find(file => fs.existsSync(file)));
    };
    const context = { module: compiledModule, exports: compiledModule.exports, require: localRequire, sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
    vm.runInNewContext(code, context, { filename });
    return compiledModule.exports;
  }
  const screen = load(path.join(root, "app/loader/LoaderScreen.tsx")).default;
  const state = load(path.join(root, "app/loader/state.ts"));
  function render(view) {
    const nodes = [];
    function walk(node) {
      if (node == null || typeof node === "boolean") return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (typeof node !== "object") return;
      if (!desktop && node.props?.["data-loader-desktop"]) return;
      if (typeof node.type === "function") { walk(node.type(node.props)); return; }
      nodes.push(node);
      walk(node.props?.children);
    }
    walk(screen({ view }));
    return nodes;
  }
  function text(node) {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node !== "object") return String(node);
    if (Array.isArray(node)) return node.map(text).join("");
    return text(node.props?.children);
  }
  function button(view, label) {
    const result = render(view).find(node => node.type === "button" && (text(node) === label || node.props["aria-label"] === label));
    assert.ok(result, `Button exists: ${label}`);
    return result.props;
  }
  return { render, text, state, navigations, button, storage, getLoaderSearchResults: load(path.join(root, "app/loader/LoaderDesktopChrome.tsx")).getLoaderSearchResults };
}

test("all nine screens render every design image with non-empty local assets", () => {
  const app = workspace();
  const routes = fs.readFileSync(path.join(root, "app/loader/routes.ts"), "utf8");
  const views = [...routes.matchAll(/^  "([^"]+)":/gm)].map(match => match[1]);
  assert.equal(views.length, 9);
  const renderedAssets = new Set();
  for (const view of views) {
    const nodes = app.render(view);
    assert.equal(nodes.filter(node => node.type === "h1").length, 1);
    for (const node of nodes.filter(node => node.type === "img")) {
      const asset = path.join(root, "public", node.props.src);
      assert.ok(fs.statSync(asset).size > 0, asset);
      assert.ok(node.props.fill || (node.props.width > 0 && node.props.height > 0));
      renderedAssets.add(node.props.src);
    }
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "app/loader/assets.json"), "utf8"));
  const providedAssets = Object.values(manifest).flatMap(assets => Object.values(assets).map(asset => asset.src));
  for (const asset of providedAssets) assert.ok(renderedAssets.has(asset), `Provided asset is used: ${asset}`);
});

test("shortfall quantity stays within 0–6 and blocks complete quantities", () => {
  const app = workspace();
  for (let i = 0; i < 4; i++) {
    const increase = app.button("report-shortfall", "Increase cases found");
    if (!increase.disabled) increase.onClick();
  }
  assert.equal(app.state.useLoaderState().quantity, 6);
  assert.equal(app.button("report-shortfall", "Send shortfall").disabled, true);
  for (let i = 0; i < 8; i++) {
    const decrease = app.button("report-shortfall", "Decrease cases found");
    if (!decrease.disabled) decrease.onClick();
  }
  assert.equal(app.state.useLoaderState().quantity, 0);
});

test("report, approval, departure, and reopening preserve the selected shortfall", () => {
  const app = workspace();
  app.button("report-shortfall", "Decrease cases found").onClick();
  const form = app.render("report-shortfall").find(node => node.type === "form" && node.props.role !== "search");
  form.props.onSubmit({ preventDefault() {} });
  assert.equal(app.state.useLoaderState().reported, true);
  assert.equal(app.state.useLoaderState().quantity, 3);
  assert.equal(app.navigations.at(-1), "/loader/trip-status");
  app.button("trip-status", "Check dispatch decision").onClick();
  assert.equal(app.state.useLoaderState().approved, true);
  assert.equal(app.navigations.at(-1), "/loader/partial-load-approved");
  app.button("partial-load-approved", "Review departure checks").onClick();
  assert.equal(app.navigations.at(-1), "/loader/departure-review");
  app.button("departure-review", "Mark ready for departure").onClick();
  assert.equal(app.state.useLoaderState().ready, true);
  assert.equal(app.button("departure-review", "Ready for departure").disabled, true);
  app.button("departure-review", "Reopen Load").onClick();
  assert.equal(app.state.useLoaderState().ready, false);
  assert.equal(app.state.useLoaderState().finalStopLoaded, false);
  assert.equal(app.state.useLoaderState().quantity, 3);
});

test("plan v3 acknowledgement persists across Loader screens", () => {
  const app = workspace();
  app.button("review-plan-changes", "Acknowledge v3").onClick();
  assert.equal(app.state.useLoaderState().acknowledged, true);
  assert.equal(app.navigations.at(-1), "/loader/plan-v3-acknowledged");
  const loads = app.render("loading-history").find(node => node.type === "a" && node.props["aria-current"] !== "page" && node.props.href === "/loader/plan-v3-acknowledged");
  assert.ok(loads);
});

test("desktop search resolves Loader vehicles and stops to their current workflow screens", () => {
  const app = workspace();
  assert.equal(app.getLoaderSearchResults("OUT047", "loading-queue", "trip-status")[0].view, "report-shortfall");
  assert.equal(app.getLoaderSearchResults("VEH008", "loading-queue", "trip-status")[0].view, "review-plan-changes");
  const history = app.getLoaderSearchResults("history", "plan-v3-acknowledged", "partial-load-approved");
  assert.equal(history[0].view, "loading-history");
  const status = app.getLoaderSearchResults("Trip status", "plan-v3-acknowledged", "partial-load-approved");
  assert.equal(status[0].view, "partial-load-approved");
  assert.equal(app.getLoaderSearchResults("  ", "loading-queue", "trip-status").length, 0);
  assert.equal(app.getLoaderSearchResults("unmatched vehicle", "loading-queue", "trip-status").length, 0);
});

test("desktop navigation retains the current approval and acknowledged-plan routes", () => {
  const app = workspace();
  app.state.updateLoaderState({ acknowledged: true, approved: true });
  const nodes = app.render("partial-load-approved");
  const nav = nodes.find(node => node.type === "nav" && node.props["aria-label"] === "Desktop Loader navigation");
  assert.ok(nav);
  const links = nav.props.children;
  assert.equal(links[0].props.href, "/loader/plan-v3-acknowledged");
  assert.equal(links[3].props.href, "/loader/partial-load-approved");
  assert.equal(links[3].props["aria-current"], "page");
});

test("acknowledging VEH008 does not report a VEH012 shortfall or pause the accepted plan", () => {
  const app = workspace();
  app.button("review-plan-changes", "Acknowledge v3").onClick();
  assert.equal(app.state.useLoaderState().reported, false);
  assert.ok(app.button("plan-v3-acknowledged", "Continue Loading"));
  const copy = app.text(app.render("review-plan-changes"));
  assert.ok(copy.includes("Plan v3 acknowledged"));
  assert.ok(!copy.includes("Loading paused"));
  assert.equal(app.button("review-plan-changes", "v3 acknowledged").disabled, true);
});

test("queue progress and dispatch status follow approval and reopening", () => {
  const app = workspace();
  app.button("trip-status", "Check dispatch decision").onClick();
  const approved = app.text(app.render("loading-queue"));
  assert.ok(approved.includes("partial load approved"));
  assert.ok(!approved.includes("dispatch reviewing"));
  app.button("partial-load-approved", "Review departure checks").onClick();
  app.button("departure-review", "Reopen Load").onClick();
  const queue = app.render("loading-queue");
  assert.equal(queue.find(node => node.props.role === "progressbar").props["aria-valuenow"], 2);
  assert.ok(app.text(queue).includes("2 of 4 stops loaded"));
  assert.ok(app.text(app.render("load-plan")).includes("2 of 4 loaded"));
});

test("a new shortfall invalidates previous loading completion and remains pending in history", () => {
  const app = workspace();
  app.state.updateLoaderState({ approved: true, ready: true, finalStopLoaded: true, quantity: 3 });
  app.render("report-shortfall").find(node => node.type === "form" && node.props.role !== "search").props.onSubmit({ preventDefault() {} });
  const state = app.state.useLoaderState();
  assert.equal(state.approved, false);
  assert.equal(state.ready, false);
  assert.equal(state.finalStopLoaded, false);
  const queue = app.text(app.render("loading-queue"));
  assert.ok(queue.includes("meat 3/6"));
  const history = app.text(app.render("loading-history"));
  assert.ok(history.includes("Dispatch decision pending"));
  assert.ok(!history.includes("Approved partial: meat 3/6"));
});

test("editing an unsent shortfall preserves the quantity already approved by dispatch", () => {
  const app = workspace();
  app.render("report-shortfall").find(node => node.type === "form" && node.props.role !== "search").props.onSubmit({ preventDefault() {} });
  app.button("trip-status", "Check dispatch decision").onClick();
  app.button("report-shortfall", "Decrease cases found").onClick();
  assert.equal(app.state.useLoaderState().quantity, 3);
  for (const view of ["loading-queue", "load-plan", "partial-load-approved", "loading-history"]) {
    assert.ok(/meat 4\/6/i.test(app.text(app.render(view))), `${view} retains submitted quantity`);
  }
  app.render("report-shortfall").find(node => node.type === "form" && node.props.role !== "search").props.onSubmit({ preventDefault() {} });
  assert.ok(app.text(app.render("trip-status")).includes("Meat 3/6"));
  assert.equal(app.state.useLoaderState().approved, false);
});

test("existing tab sessions retain approved quantities when a new report is edited", () => {
  const app = workspace();
  const saved = { ...app.state.useLoaderState(), reported: true, approved: true };
  delete saved.reportedQuantity;
  app.storage.set("waypoint-loader-session", JSON.stringify(saved));
  app.button("report-shortfall", "Decrease cases found").onClick();
  assert.equal(app.state.useLoaderState().quantity, 3);
  assert.equal(app.state.useLoaderState().reportedQuantity, 4);
  assert.ok(app.text(app.render("partial-load-approved")).includes("Meat 4/6"));
});
