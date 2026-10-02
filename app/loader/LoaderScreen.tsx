"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode, type FormEvent } from "react";
import { DashboardButton, GlassPanel } from "../../components/dashboard-ui";
import { loaderHref, loaderScreens, type LoaderView } from "./routes";
import { updateLoaderState, useLoaderState } from "./state";
import assetData from "./assets.json";
import s from "./loader.module.css";
import { LoaderDesktopFooter, LoaderDesktopHeader } from "./LoaderDesktopChrome";

type Asset = { src: string; width: number; height: number };
type Assets = Record<string, Asset>;
type Tone = "green" | "orange" | "amber" | "red" | "blue" | "gray";
const assetSets = assetData as Record<string, Assets>;

function Icon({ assets, name }: { assets: Assets; name: string }) {
  const asset = assets[name];
  if (!asset) throw new Error(`Missing Loader design asset: ${name}`);
  return <Image {...asset} alt="" unoptimized className={s.icon} />;
}
function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <GlassPanel className={`${s.glass} ${className}`}>{children}</GlassPanel>;
}
function Chip({ children, tone = "gray", icon }: { children: ReactNode; tone?: Tone; icon?: ReactNode }) {
  return <span className={`${s.chip} ${s[tone]}`}>{icon}{children}</span>;
}
function Action({ children, onClick, icon, tone = "light", disabled = false, type = "button" }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; tone?: "light" | "primary" | "danger" | "call"; disabled?: boolean; type?: "button" | "submit" }) {
  return <DashboardButton type={type} disabled={disabled} onClick={onClick} className={`${s.button} ${tone !== "light" ? s[tone] : ""}`}>{icon}{children}</DashboardButton>;
}
function Title({ children, subtitle }: { children: ReactNode; subtitle: ReactNode }) {
  return <div className={s.title}><h1>{children}</h1><p>{subtitle}</p></div>;
}
function Section({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return <section><h2 className={s.sectionHeader}>{title}{detail && <span>{detail}</span>}</h2>{children}</section>;
}
function Tile({ children, tone, large = false }: { children: ReactNode; tone?: Tone; large?: boolean }) {
  return <span className={`${s.tile} ${tone ? s[tone] : ""} ${large ? s.largeTile : ""}`}>{children}</span>;
}
function Row({ title, detail, icon, end, onClick, children }: { title: string; detail?: ReactNode; icon?: ReactNode; end?: ReactNode; onClick?: () => void; children?: ReactNode }) {
  const content = <>{icon}<span className={s.copy}><strong>{title}</strong>{detail && <span className={`${s.detail} block`}>{detail}</span>}{children}</span>{end}</>;
  return onClick ? <button type="button" className={`${s.row} ${s.rowButton}`} onClick={onClick}>{content}</button> : <div className={s.row}>{content}</div>;
}

export default function LoaderScreen({ view }: { view: LoaderView }) {
  const router = useRouter();
  const state = useLoaderState();
  const loadQuantity = state.reported ? state.reportedQuantity ?? state.quantity : state.quantity;
  const screen = loaderScreens[view];
  const assets = assetSets[screen.node];
  const icon = (name: string) => <Icon assets={assets} name={name} />;
  const go = (next: LoaderView) => router.push(loaderHref(next));
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [earlier, setEarlier] = useState<string | null>(null);
  const home = view === "loading-queue" || view === "plan-v3-acknowledged" || view === "loading-history";
  const report = view === "report-shortfall";
  const status = ["trip-status", "partial-load-approved", "departure-review"].includes(view);
  const background = Object.values(assets).find(asset => asset.src.endsWith(".png"))!;
  const loadTab = state.acknowledged || view === "plan-v3-acknowledged" ? "plan-v3-acknowledged" : "loading-queue";
  const statusView = state.ready || view === "departure-review" ? "departure-review" : state.approved || view === "partial-load-approved" ? "partial-load-approved" : "trip-status";
  const flagNavIcon = view === "load-plan" || status ? "imgIconFlag1" : view === "loading-history" ? "imgIconFlag2" : report ? "imgIconFlag1" : "imgIconFlag";

  function summary(history = false) {
    return <div className={s.summary}>{(history ? [["3", "Released", s.greenText], ["1", "Flags raised", s.redText], ["1", "Plan change", "text-[#cc8c00]"]] : [["5", "Assigned", ""], ["1", "Loading", s.orangeText], ["1", "Attention", s.redText]]).map(([value, label, color]) => <Panel key={label} className={s.stat}><strong className={color}>{value}</strong><span>{label}</span></Panel>)}</div>;
  }

  function queue() {
    const acknowledged = view === "plan-v3-acknowledged" || state.acknowledged;
    const reported = state.reported;
    const loadedStops = state.finalStopLoaded ? 4 : 2;
    const loadStatus = state.ready ? "ready to depart" : state.approved ? "partial load approved" : reported ? "awaiting dispatch" : "Loading now";
    const shortfallStatus = state.approved ? `meat ${loadQuantity}/6 · partial approved` : reported ? `meat ${loadQuantity}/6 · shortfall sent · dispatch reviewing` : `meat ${loadQuantity}/6 · ${6 - loadQuantity} short to report`;
    return <><Title subtitle={`Peliyagoda DC · Dock 3 · Tue 29 Sep, ${screen.time}`}>Loads</Title>{summary()}<div className={`${s.columns} ${s.queueColumns}`}>
      <Panel className={s.attention}><div className={`${s.between} ${s.small}`}><Chip tone="orange" icon={icon("imgIconClock")}>Bay 3 · {loadStatus}</Chip><span className={s.depart}>Departs 03:30</span></div><div className={`${s.flex} ${s.activeVehicle}`}><Tile large>{icon("imgIconTruck")}</Tile><div className={s.copy}><strong>VEH012 · Reefer Truck</strong><p className={s.detail}>Fresh → Gampaha · Trip 1 · 4 stops</p></div></div><div className={`${s.between} ${s.small}`}><strong>{loadedStops} of 4 stops loaded</strong><span className={s.detail}>Chilled 2–4 °C</span></div><div className={s.progress} role="progressbar" aria-label="Stops loaded" aria-valuenow={loadedStops} aria-valuemin={0} aria-valuemax={4}><span style={{ width: `${loadedStops / 4 * 100}%` }} /></div><p className={s.attentionLine}>{icon("imgAttentionIndicator")}Stop 2 · {shortfallStatus}</p><Action tone="primary" icon={icon("imgIconChev")} onClick={() => go(reported ? statusView : "load-plan")}>{reported ? "Check Trip Status" : "Continue Loading"}</Action></Panel>
    <Section title="Dock queue" detail={acknowledged ? "Plan v3 current · 03:15" : "Plan v3 · 03:12"}><Panel className={s.list}>
      <Row title="VEH008 · Dry-box Truck" detail="Fresh ambient → Colombo · 5 stops" icon={<Tile tone="amber">{icon("imgIconRefresh")}</Tile>} end={<><span className={s.rowEnd}><strong>03:35</strong><Chip tone="amber">{acknowledged ? "v3 accepted" : "Plan changed"}</Chip></span>{icon("imgIconChev1")}</>} onClick={() => go("review-plan-changes")} />
      <Row title="VEH027 · Reefer Truck" detail="Fresh → Gampaha · 4 stops" icon={<Tile>{icon("imgIconCheck")}</Tile>} end={<span className={s.rowEnd}><strong>03:30</strong><Chip tone="green">Ready</Chip></span>} />
      <Row title="VEH019 · Reefer Van" detail="Fresh → Colombo (van-only) · 3 stops" icon={<Tile>{icon("imgIconClock1")}</Tile>} end={<span className={s.rowEnd}><strong>03:45</strong><Chip>Queued</Chip></span>} />
      <Row title="VEH044 · Dry-box Truck" detail="Style → Colombo mall bays · 3 stops" icon={<Tile>{icon("imgFrame")}</Tile>} end={<span className={s.rowEnd}><strong>08:30</strong><Chip>Later</Chip></span>} />
    </Panel></Section>
      <Link className={`${s.glass} ${s.historyShortcut}`} href={loaderHref("loading-history")}><Tile tone="green">{icon("imgFrame1")}</Tile><span className={s.copy}><strong>Shift history</strong><span className={`${s.detail} block`}>Released loads, flags sent and plan changes</span></span><span>History {icon("imgIconChev")}</span></Link>
    </div></>;
  }

  function loadPlan() {
    return <><Title subtitle="Waypoint Fresh → Gampaha · Trip 1">VEH012</Title><div className={s.columns}><div className={s.stack}>
      <Panel className={s.capacity}><div className={s.wrap}><Chip tone="blue" icon={icon("imgIconTruck")}>Reefer truck</Chip><Chip tone="blue" icon={icon("imgIconSnow")}>Chilled 2–4 °C</Chip></div><p>Departs 03:30 · Plan v3 current</p></Panel>
      <Panel className={s.info}>{icon("imgIconInfo")}<p>Reverse load: Stop 4 first at the front wall; Stop 1 last by the door.</p></Panel>
      <Panel className={s.loadHeader}><span>LOAD ORDER</span><Chip tone="green" icon={icon("imgIconCheck")}>{state.finalStopLoaded ? 4 : 2} of 4 loaded</Chip></Panel>
    </div><div className={`${s.stack} ${s.loadGrid}`}>
      {[{ number: 1, title: "Stop 4 · OUT058 Ja-Ela", detail: "18 chilled + 6 ambient cases" }, { number: 2, title: "Stop 3 · OUT052 Kiribathgoda", detail: "22 chilled + 10 ambient cases" }].map(stop => <Panel key={stop.number}><div className={s.flex}><span className={`${s.loadNumber} ${s.loaded}`}><span>LOAD</span><strong>{stop.number}</strong></span><span className={s.copy}><strong>{stop.title}</strong><p className={s.detail}>{stop.detail}</p></span><Chip tone="green">Loaded</Chip></div></Panel>)}
      <Panel className={s.attention}><div className={s.flex}><span className={`${s.loadNumber} ${s.pending}`}><span>LOAD</span><strong>3</strong></span><span className={s.copy}><strong>Stop 2 · OUT047 Kadawatha</strong><p className={s.detail}>Meat {loadQuantity}/6 · {state.approved ? "partial approved" : state.reported ? "dispatch reviewing" : `${6 - loadQuantity} short to report`}</p></span><Chip tone={state.approved ? "green" : "orange"}>{state.approved ? "Approved" : "Attention"}</Chip></div>
      <div className={s.items}>{[["Chilled · dairy", "12 / 12", true], ["Chilled · meat", `${loadQuantity} / 6`, false], ["Ambient · dry goods", "9 / 9", true]].map(([label, count, done]) => <div className={s.item} key={String(label)}><span className={`${s.circle} ${done ? s.checked : ""}`}>{done && icon("imgIconCheck1")}</span><span>{label}</span><strong className={done ? "" : s.orangeText}>{count}</strong></div>)}</div>
      <div className={s.actions}><Action tone="danger" icon={icon("imgIconFlag")} onClick={() => go(state.reported ? statusView : "report-shortfall")}>{state.reported ? "View shortfall" : `Report ${6 - loadQuantity} short`}</Action><Action icon={icon("imgIconCheck2")} disabled={!state.approved} onClick={() => { updateLoaderState({ finalStopLoaded: true }); go("departure-review"); }}>Loaded</Action></div></Panel>
      <Panel><div className={s.flex}><span className={s.loadNumber}><span>LOAD</span><strong>4</strong></span><span className={s.copy}><strong>Stop 1 · OUT041 Gampaha Town</strong><p className={s.detail}>16 chilled + 8 ambient cases</p></span><Chip tone={state.finalStopLoaded ? "green" : "gray"}>{state.finalStopLoaded ? "Loaded" : "Waiting"}</Chip></div></Panel>
    </div></div></>;
  }

  function shortfall() {
    const reasons = [{ title: "Missing item", detail: "Line not staged at all", icon: "imgIconBox1" }, { title: "Damaged", detail: "Crushed, leaking or torn", icon: "imgIconAlert" }, { title: "Short quantity", detail: "Fewer cases than planned", icon: "imgIconMinus" }];
    const quantity = state.reason === "Missing item" ? 0 : state.quantity;
    function send(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (quantity >= 6) { setNotice("Reduce the quantity found to report a shortfall."); return; }
      updateLoaderState({ quantity, reportedQuantity: quantity, reported: true, approved: false, ready: false, finalStopLoaded: false });
      go("trip-status");
    }
    return <><Title subtitle={`Report ${6 - quantity} missing cases before VEH012 leaves. Departure waits for dispatch’s decision.`}>Report a shortfall</Title><form onSubmit={send}><div className={s.columns}><div className={s.stack}>
      <Panel><div className={s.flex}><Tile large>{icon("imgIconBox")}</Tile><span className={s.copy}><strong>Stop 2 · OUT047 Kadawatha</strong><p className={s.detail}>Meat · 6 cases planned</p></span><Chip tone="blue" icon={icon("imgIconSnow")}>Chilled</Chip></div></Panel>
      <Section title="What's wrong"><Panel className={s.list}><div role="radiogroup" aria-label="Shortfall reason">{reasons.map(reason => <button type="button" role="radio" aria-checked={state.reason === reason.title} key={reason.title} className={`${s.row} ${s.rowButton}`} onClick={() => updateLoaderState({ reason: reason.title })}><Tile tone={state.reason === reason.title ? "orange" : undefined}>{icon(reason.icon)}</Tile><span className={s.copy}><strong>{reason.title}</strong><span className={`${s.detail} block`}>{reason.detail}</span></span>{state.reason === reason.title && icon("imgIconCheck")}</button>)}</div></Panel></Section>
      <Section title="Quantity"><Panel><div className={s.between}><div className={s.quantity}><strong aria-live="polite">{quantity} cases found</strong><p className={s.detail}>of 6 planned</p></div><div className={s.stepper}><button type="button" aria-label="Decrease cases found" disabled={quantity === 0 || state.reason === "Missing item"} onClick={() => updateLoaderState({ quantity: Math.max(0, quantity - 1) })}>{icon("imgIconMinus1")}</button><span /><button type="button" aria-label="Increase cases found" disabled={quantity === 6 || state.reason === "Missing item"} onClick={() => updateLoaderState({ quantity: Math.min(6, quantity + 1) })}>{icon("imgIconPlus")}</button></div></div><div className="mt-3"><Chip tone="amber" icon={icon("imgIconAlert1")}>Short {6 - quantity} cases</Chip></div></Panel></Section>
    </div><div className={s.stack}><Panel><label className={s.field}><span>Note</span><textarea aria-label="Shortfall note" value={state.note} onChange={event => updateLoaderState({ note: event.target.value })} maxLength={1000} /></label></Panel>
      <Section title="Who sees this"><Panel className={s.list}><Row title="Dispatcher · Nimal Perera" detail="Reviews the shortage and decides whether to source the cases, approve a partial load, or re-plan." icon={<Tile>{icon("imgIconUser")}</Tile>} /><Row title="Driver and store manager" detail="See the revised quantity only after dispatch approves the plan." icon={<Tile>{icon("imgIconPin")}</Tile>} /></Panel></Section>
      <Action type="submit" tone="primary" disabled={quantity === 6} icon={icon("imgIconFlag")}>Send shortfall</Action>
    </div></div></form></>;
  }

  function changes() {
    return <><Title subtitle="VEH008 · Colombo · plan v2 → v3 at 03:12">Plan changed</Title><div className={s.columns}><div className={s.stack}>
      <Panel className={s.warning}><div className={s.flex}><Tile tone="amber" large>{icon("imgIconRefresh")}</Tile><strong className="text-[17px] leading-[22px]">{state.acknowledged ? "Plan v3 acknowledged" : "Loading paused · review v3"}</strong></div><p className={s.warnCopy}>{state.acknowledged ? "You accepted the removals, additions and new order. Continue loading against plan v3." : "Your printed v2 list is outdated. Review the removals, additions and new order before continuing."}</p><div className="mt-3"><Chip tone={state.acknowledged ? "green" : "red"} icon={icon("imgIconAlert")}>{state.acknowledged ? "Loading can continue" : "Loading paused"}</Chip></div></Panel>
      <Section title="What changed" detail="3 changes"><Panel className={s.list}><Row title="Unload OUT019 Borella · 14 cases" detail="Deferred · return 14 to Staging S2" icon={<Tile tone="red">{icon("imgIconArrowdown")}</Tile>} /><Row title="Add OUT023 Maradana · 9 cases" detail="From VEH031 · collect at Staging S4" icon={<Tile>{icon("imgIconArrowup")}</Tile>} /><Row title="Reorder OUT021 Wellawatte" detail="Now stop 3, so load it 3rd instead of 2nd." icon={<Tile>{icon("imgIconRefresh1")}</Tile>} /></Panel></Section>
    </div><div className={s.stack}><Section title="New load order"><Panel className={s.list}>{[{ title: "Load 1 · Stop 5 · OUT027 Dehiwala", detail: "Already loaded — keep", label: "Keep", tone: "green" }, { title: "Load 2 · Stop 4 · OUT023 Maradana", detail: "New — 9 cases from Staging S4", label: "Add", tone: "green" }, { title: "Load 3 · Stop 3 · OUT021 Wellawatte", detail: "Was load 2 — move behind Maradana", label: "Move", tone: "blue" }, { title: "Load 4 · Stop 2 · OUT016 Kollupitiya", detail: "Not loaded yet", label: "Next", tone: "gray" }, { title: "Load 5 · Stop 1 · OUT012 Fort", detail: "Not loaded yet", label: "Next", tone: "gray" }].map((stop, index) => <Row key={stop.title} title={stop.title} detail={stop.detail} end={<Chip tone={stop.tone as Tone} icon={index === 0 ? icon("imgIconCheck") : undefined}>{stop.label}</Chip>} />)}</Panel></Section>
      <Action tone="primary" disabled={state.acknowledged} icon={icon("imgIconCheck1")} onClick={() => { updateLoaderState({ acknowledged: true }); go("plan-v3-acknowledged"); }}>{state.acknowledged ? "v3 acknowledged" : "Acknowledge v3"}</Action>
      <Action tone="call" icon={icon("imgIconCall")} onClick={() => setNotice("Dispatch contact: Nimal Perera. Use your dock’s dispatch channel to discuss the plan changes.")}>Call Dispatch</Action>
    </div></div></>;
  }

  function trip() {
    const departure = view === "departure-review";
    const approved = departure || view === "partial-load-approved" || state.approved;
    const quantity = state.reported ? loadQuantity : 4;
    const short = 6 - quantity;
    const check = departure ? "imgIconCheck1" : "imgIconCheck";
    const pending = departure ? check : "imgIconFlagPending1";
    return <div className={s.columns}><div className={s.stack}>
      <Panel className={s.hero}><span className={`${s.heroMark} ${departure ? s.successMark : ""}`}>{icon(departure ? "imgIconCheck" : "imgIconFlagPending")}</span><h1>{state.ready && departure ? "Ready for departure" : departure ? "Loading complete" : approved ? "Partial load approved" : "Waiting for dispatch"}</h1><p>{departure ? "VEH012 · Trip 1 → Gampaha · loaded 03:27 · target 03:30" : approved ? "VEH012 · Trip 1 · Final checks next" : "VEH012 · Trip 1 · Departure on hold"}</p></Panel>
      <Section title={departure ? "Pre-departure checks" : "Trip checks"}><Panel className={s.list}><Row title={departure ? "4 stops prepared in sequence" : approved ? "4 of 4 stops prepared" : "3 of 4 stops prepared"} detail={departure ? "Approved partial included at Stop 2" : approved ? `Stop 2 revised to meat ${quantity}/6 · Trip 2 top-up` : `Stop 2 has ${quantity} of 6 meat cases`} icon={<Tile>{icon("imgIconLayers")}</Tile>} end={icon(pending)} /><Row title="Reefer at 3 °C" detail="Target 2–4 °C for chilled goods" icon={<Tile>{icon("imgIconThermo")}</Tile>} end={icon(check)} /><Row title={departure ? "Run sheet on driver's phone" : approved ? "Driver route updated" : "Driver route awaits update"} detail={departure ? "Downloaded — works without signal" : approved ? "Revised quantity downloaded for offline use" : "Revised quantity follows dispatch approval"} icon={<Tile>{icon("imgIconPhone")}</Tile>} end={icon(pending)} /></Panel></Section>
    </div><div className={s.stack}><Section title={approved ? "Approved shortfall" : "Open shortfall"}><Panel className={s.warning}><div className={s.flex}><Tile tone="amber">{icon(departure ? "imgIconFlag" : "imgIconFlagPending1")}</Tile><span className={s.copy}><strong>Stop 2 · OUT047 · {departure ? "partial approved" : `${short} cases short`}</strong><p className={s.detail}>Meat {quantity}/6 · {approved ? `${short} short · top up on Trip 2` : "reported to dispatch"}</p></span></div><div className="mt-3"><Chip tone={departure ? "green" : "amber"} icon={icon(departure ? "imgIconCheck2" : "imgIconFlagPending2")}>{departure ? "Dispatch approved · store notified" : approved ? "Approved · store notified" : "Dispatcher decision pending"}</Chip></div></Panel></Section>
      <Section title={departure ? "Handover" : "Next step"}><Panel className={s.list}><Row title={departure ? "Kasun Fernando · Driver" : "Dispatcher · Nimal Perera"} detail={departure ? "Confirmed pickup on his phone" : approved ? "Approved 03:20 · load finished 03:27" : "Checking stock or partial approval"} icon={<Tile>{icon("imgIconUser")}</Tile>} end={<Chip tone={departure ? "green" : "amber"} icon={icon(departure ? "imgIconCheck2" : "imgIconFlagPending2")}>{departure ? "03:28" : approved ? "Approved" : "Pending"}</Chip>} /></Panel></Section>
      <Action tone="primary" disabled={state.ready && departure} icon={icon(departure ? "imgIconTruck" : "imgIconFlag")} onClick={() => {
        if (departure) { updateLoaderState({ ready: true, approved: true, finalStopLoaded: true }); setNotice("VEH012 is ready for departure. The handover is recorded in loading history."); }
        else if (approved) { updateLoaderState({ approved: true, finalStopLoaded: true }); go("departure-review"); }
        else { updateLoaderState({ approved: true, reported: true, reportedQuantity: quantity, finalStopLoaded: true }); go("partial-load-approved"); }
      }}>{departure ? state.ready ? "Ready for departure" : "Mark ready for departure" : approved ? "Review departure checks" : "Check dispatch decision"}</Action>
      <Action onClick={() => { if (departure) updateLoaderState({ ready: false, finalStopLoaded: false }); go(approved && !departure ? loadTab : "load-plan"); }}>{departure ? "Reopen Load" : approved ? "Back to loads" : "Back to load plan"}</Action>
    </div></div>;
  }

  function history() {
    const shortfallResolved = !state.reported || state.approved;
    return <><Title subtitle="Peliyagoda DC · all bays">History</Title>{summary(true)}<div className={`${s.columns} ${s.historyColumns}`}>
      <Section title="Released · Tue 29 Sep" detail="Newest first"><Panel className={s.list}>{[
        { title: "VEH008 · Dry-box truck", detail: "Fresh ambient → Colombo · 5 of 5 stops", by: "Loaded by N. Silva · reloaded to plan v3", time: "03:52", label: "Plan v3", tone: "amber", icon: "imgIconRefresh" },
        { title: "VEH012 · Reefer truck", detail: "Fresh → Gampaha · 4 of 4 stops", by: "Loaded by R. Perera · 1 flag sent", time: "03:31", label: "1 flag", tone: "red", icon: "imgIconFlag" },
        { title: "VEH027 · Reefer truck", detail: "Fresh → Gampaha · 4 of 4 stops", by: "Loaded by N. Silva · no issues", time: "03:26", label: "Clean", tone: "green", icon: "imgIconCheck" },
      ].map((record, index) => <Row key={record.title} title={record.title} detail={record.detail} icon={<Tile>{icon("imgIconTruck")}</Tile>} end={<><span className={s.rowEnd}><strong>{record.time}</strong><Chip tone={record.tone as Tone} icon={icon(record.icon)}>{record.label}</Chip></span>{index === 0 && icon("imgIconChev")}</>}><span className={`${s.detail} ${s.flex} mt-1`}>{icon("imgIconUser")}{record.by}</span></Row>)}</Panel></Section>
      <Section title="Activity · Flags & plan changes"><Panel className={s.list}><Row title={`OUT047 Kadawatha · ${state.reported ? 6 - loadQuantity : 2} cases short`} detail="VEH012 · Chilled meat · flagged 03:14" icon={<Tile tone="red">{icon("imgIconFlag1")}</Tile>} end={<Chip tone={shortfallResolved ? "green" : "amber"} icon={icon("imgIconCheck1")}>{shortfallResolved ? "Resolved" : "Pending"}</Chip>}><p className={s.activity}>{shortfallResolved ? `Approved partial: meat ${state.reported ? loadQuantity : 4}/6 · store notified · Trip 2 top-up` : `Dispatch decision pending · meat ${loadQuantity}/6 reported`}</p></Row><Row title="OUT019 Borella · 14 cases unloaded" detail="VEH008 · Plan v3 removed this stop · 03:15" icon={<Tile tone="amber">{icon("imgIconRefresh1")}</Tile>} end={<Chip tone="blue">Recorded</Chip>}><p className={s.activity}>Returned to Staging S2 · deferred by Dispatch</p></Row></Panel></Section>
      <Section title="Earlier"><Panel className={s.list}>{[["Fri 25 Sep", "11 loads released · 1 flag"], ["Thu 24 Sep", "12 loads released · no flags"]].map(([day, detail]) => <Row key={day} title={day} detail={detail} icon={<Tile>{icon("imgIconCal")}</Tile>} end={icon("imgIconChev")} onClick={() => setEarlier(earlier === day ? null : day)} />)}</Panel>{earlier && <Panel className={s.historyDay}><strong>{earlier}</strong><p className={s.detail}>All scheduled loads released. Loader attribution and recorded flags are retained for this shift.</p></Panel>}</Section>
      <p className={s.footnote}>{icon("imgIconInfo")}Every record shows who loaded it, because the dock tablet is shared between loaders.</p></div></>;
  }

  return <div className={s.stage} data-loader-screen={view}>
    <Image src={background.src} alt="" fill sizes="100vw" unoptimized priority className={s.backdrop} />
    <div className={s.shell}><LoaderDesktopHeader active={report ? "Flags" : status ? "Status" : view === "loading-history" ? "History" : "Loads"} loadTab={loadTab} statusView={statusView} onNavigate={go} onProfile={() => setMenu(!menu)} profileExpanded={menu} /><div className={s.statusBar} aria-hidden="true"><span>{screen.time}</span><span className={s.signals}><span className={s.signal}><i /><i /><i /><i /></span>{icon("imgIconWifi")}<span className={s.battery} /></span></div>
      <header className={`${s.glass} ${s.header}`}><div className={s.headerLeft}>{home ? <span className={`${s.iconButton} ${s.brand}`}>{icon("imgSvg")}</span> : <Link href={loaderHref(report ? "load-plan" : loadTab)} aria-label={report ? "Cancel shortfall report" : "Back to loads"} className={s.iconButton}>{icon(report ? "imgIconX" : "imgIconBack")}</Link>}<div><p className={s.headerTitle}>{home ? "Waypoint Flow" : report ? "Report shortfall" : view === "review-plan-changes" ? "VEH008 · Bay 5" : "VEH012 · Bay 3"}</p><p className={s.eyebrow}>{screen.toolbar}</p></div></div>{!report && <div className={s.headerRight}><Chip tone="green" icon={icon("imgEllipse")}>Synced</Chip><button type="button" className={`${s.iconButton} ${home ? s.profile : ""}`} aria-label={home ? "Loader profile: R. Perera" : "More Loader options"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{home ? "RP" : icon("imgIconMore")}</button></div>}</header>
      {menu && <Panel className={s.menu}><p className="px-2 pb-2 font-semibold">R. Perera · Dock Loader</p><Link href={loaderHref("loading-history")}>Loading history</Link><Link href={loaderHref("review-plan-changes")}>Review plan changes</Link><Link href="/sign-in">Sign out</Link></Panel>}
      <main>{view === "loading-queue" || view === "plan-v3-acknowledged" ? queue() : view === "load-plan" ? loadPlan() : report ? shortfall() : view === "review-plan-changes" ? changes() : view === "loading-history" ? history() : trip()}{notice && <p role="status" className={`${s.notice} mt-4`}>{notice}</p>}</main>
      <nav aria-label="Loader navigation" className={s.nav}><div className={s.navCapsule}><Link href={loaderHref(loadTab)} className={`${s.tab} ${!report && !status && view !== "loading-history" ? s.tabActive : ""}`} aria-current={!report && !status && view !== "loading-history" ? "page" : undefined}>{icon("imgIconList")}Loads</Link><Link href={loaderHref("report-shortfall")} className={`${s.tab} ${report ? s.tabActive : ""}`} aria-current={report ? "page" : undefined}>{icon(flagNavIcon)}Flags</Link><Link href={loaderHref("loading-history")} className={`${s.tab} ${view === "loading-history" ? s.tabActive : ""}`} aria-current={view === "loading-history" ? "page" : undefined}>{icon("imgIconHistory")}History</Link></div><Link href={loaderHref(statusView)} className={`${s.tab} ${s.statusTab} ${status ? s.statusActive : ""}`} aria-current={status ? "page" : undefined}>{icon("imgIconTripStatus")}Status</Link></nav>
      <div className={s.homeIndicator} aria-hidden="true" />
      <LoaderDesktopFooter />
    </div>
  </div>;
}
