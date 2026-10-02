"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { DashboardIcon } from "../../components/dashboard-ui";
import { loaderHref, type LoaderView } from "./routes";
import s from "./desktop.module.css";

type SearchTarget = { label: string; detail: string; view: LoaderView };
export function getLoaderSearchResults(query: string, loadTab: LoaderView, statusView: LoaderView): SearchTarget[] {
  const targets: SearchTarget[] = [
    { label: "Loading queue", detail: "Peliyagoda DC · Dock 3 · all assigned vehicles", view: loadTab },
    { label: "VEH012 · Load plan", detail: "Bay 3 · Gampaha · Trip 1", view: "load-plan" },
    { label: "OUT047 · Report a shortfall", detail: "Stop 2 · Kadawatha · chilled meat", view: "report-shortfall" },
    { label: "VEH008 · Review plan changes", detail: "Bay 5 · Colombo · plan v3", view: "review-plan-changes" },
    { label: "Loading history", detail: "Released loads, flags and plan changes", view: "loading-history" },
    { label: "VEH012 · Trip status", detail: "Dispatch decision and partial load approval", view: statusView },
    { label: "VEH012 · Departure review", detail: "Pre-departure checks and driver handover", view: "departure-review" },
  ];
  const normalized = query.trim().toLowerCase();
  return normalized ? targets.filter(target => `${target.label} ${target.detail}`.toLowerCase().includes(normalized)) : [];
}

export function LoaderDesktopHeader({ active, loadTab, statusView, onNavigate, onProfile, profileExpanded }: { active: "Loads" | "Flags" | "History" | "Status"; loadTab: LoaderView; statusView: LoaderView; onNavigate: (view: LoaderView) => void; onProfile: () => void; profileExpanded: boolean }) {
  const [query, setQuery] = useState("");
  const results = getLoaderSearchResults(query, loadTab, statusView);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results[0]) onNavigate(results[0].view);
  }
  const tabs: { label: typeof active; view: LoaderView }[] = [{ label: "Loads", view: loadTab }, { label: "Flags", view: "report-shortfall" }, { label: "History", view: "loading-history" }, { label: "Status", view: statusView }];
  return <header className={s.header} data-loader-desktop="header">
    <div className="dashboard-nav flex min-h-12 min-w-0 items-center gap-2 rounded-full border border-white/95 px-[11px] py-[7px]">
      <Link href={loaderHref(loadTab)} className="flex shrink-0 items-center gap-2 pr-2" aria-label="Waypoint Flow Loader home"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm"><DashboardIcon name="logo" /></span><span><strong className="block text-[14px] font-extrabold leading-[15px] tracking-[-.4px] text-[#0f172a]">Waypoint Flow</strong><span className="block pt-[2px] text-[9px] font-bold leading-[13px] tracking-[.45px] text-[#64748b]">DOCK LOADER</span></span></Link>
      <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
      <nav aria-label="Desktop Loader navigation" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">{tabs.map(tab => <Link key={tab.label} href={loaderHref(tab.view)} aria-current={active === tab.label ? "page" : undefined} className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[12px] ${active === tab.label ? "dashboard-orange font-bold text-[#0f172a]" : "font-medium text-[#475569] hover:bg-white/75"}`}>{tab.label}</Link>)}</nav>
    </div>
    <div className="dashboard-nav flex h-12 w-[379px] items-center gap-1 rounded-full border border-white/95 p-[7px]">
      <form role="search" className={s.search} onSubmit={search} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setQuery(""); }}>
        <label className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-full border border-white/80 bg-white/60 px-3"><DashboardIcon name="search" /><input className="min-w-0 w-full bg-transparent text-[12px] text-[#334155] outline-none placeholder:text-[#94a3b8]" type="search" aria-label="Search Loader vehicles and stops" placeholder="Search loads, vehicles…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setQuery(""); }} /></label>
        {query.trim() && <div className={s.results}><p className={s.resultsLabel}>{results.length ? "Loader results" : "No matching loads or screens"}</p>{results.map(result => <Link key={result.view} href={loaderHref(result.view)}><strong>{result.label}</strong><span>{result.detail}</span></Link>)}</div>}
      </form>
      <button type="button" className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/70" aria-label="View Loader flags" onClick={() => onNavigate("report-shortfall")}><DashboardIcon name="bell" /><span className="absolute right-0 top-0 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#ff7a1a] text-[8px] font-extrabold text-[#0f172a] ring-2 ring-white">1</span></button>
      <button type="button" className="ml-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#ff7a1a] text-[11px] font-bold text-white ring-2 ring-[#ff7a1a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600" aria-label="Loader profile: R. Perera" aria-expanded={profileExpanded} onClick={onProfile}>RP</button>
    </div>
  </header>;
}

export function LoaderDesktopFooter() {
  return <footer className={s.footer} data-loader-desktop="footer"><div className={s.footerStatus}><span><i aria-hidden="true" />Telemetry Core: Active</span><span className={s.separator}>•</span><span>Loader Sync: Synced</span><span className={s.separator}>•</span><span className={s.mono}>Dock: 3 · Peliyagoda DC</span></div><div className={`${s.footerVersion} ${s.mono}`}><span>R. Perera · Dock Loader</span><span>© 2026 Waypoint Group</span></div></footer>;
}
