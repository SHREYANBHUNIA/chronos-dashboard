/*
 * Chronos design reminder: Instrument Panel Dossier. This page is an evidence board:
 * graphite surfaces, cyan temporal focus, amber divergence, Space Grotesk + IBM Plex Mono.
 */
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  Braces,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  FileClock,
  GitCompareArrows,
  HardDrive,
  Layers3,
  ListFilter,
  MoreHorizontal,
  Pause,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Waypoints,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  defaultCompareTraceId,
  defaultTraceId,
  eventStyle,
  formatDuration,
  formatSnapshotValue,
  getTrace,
  offsetLabel,
  type Snapshot,
  type SnapshotValue,
  type TraceEvent,
  type TraceRecord,
  traceRecords,
} from "@/lib/traceData";

type WorkspaceView = "traces" | "investigate" | "comparisons";
type InspectorTab = "state" | "diff";

type VariableDiff = {
  path: string;
  expected: SnapshotValue | undefined;
  actual: SnapshotValue | undefined;
  status: "changed" | "added" | "removed";
};

type DiffResult = {
  changed: VariableDiff[];
  firstDivergenceIndex: number | null;
  firstDivergenceEvent: TraceEvent | null;
};

const navItems = [
  { icon: Activity, label: "Traces", view: "traces" as const },
  { icon: Database, label: "Recordings", view: "recordings" as const },
  { icon: GitCompareArrows, label: "Comparisons", view: "comparisons" as const },
  { icon: FileClock, label: "Replays", view: "replays" as const },
];

function compareSnapshots(expected: Snapshot, actual: Snapshot): VariableDiff[] {
  const paths = Array.from(new Set([...Object.keys(expected), ...Object.keys(actual)])).sort();
  return paths.flatMap((path) => {
    const expectedValue = expected[path];
    const actualValue = actual[path];
    if (expectedValue === actualValue) return [];
    return [{
      path,
      expected: expectedValue,
      actual: actualValue,
      status: expectedValue === undefined ? "added" : actualValue === undefined ? "removed" : "changed",
    }];
  });
}

function diffTraces(expected: TraceRecord, actual: TraceRecord): DiffResult {
  const commonLength = Math.min(expected.events.length, actual.events.length);
  let firstDivergenceIndex: number | null = null;
  for (let index = 0; index < commonLength; index += 1) {
    if (compareSnapshots(expected.events[index].snapshot, actual.events[index].snapshot).length > 0) {
      firstDivergenceIndex = index;
      break;
    }
  }
  if (firstDivergenceIndex === null && expected.events.length !== actual.events.length) firstDivergenceIndex = commonLength;
  return {
    changed: compareSnapshots(expected.events.at(-1)?.snapshot ?? {}, actual.events.at(-1)?.snapshot ?? {}),
    firstDivergenceIndex,
    firstDivergenceEvent: firstDivergenceIndex === null ? null : actual.events[firstDivergenceIndex] ?? null,
  };
}

function projectX(offset: number, duration: number) {
  return 34 + (offset / Math.max(duration, 1)) * 922;
}

function valueWithDollar(value: SnapshotValue | undefined) {
  if (value === undefined || value === null || value === "") return "—";
  const stringValue = String(value);
  return stringValue.startsWith("$") || stringValue.startsWith("-") ? stringValue : `$${stringValue}`;
}

function SeverityMark({ severity }: { severity: TraceRecord["severity"] }) {
  const config = {
    critical: { label: "critical", className: "text-[#f1b55a] border-[#f1b55a]/30 bg-[#f1b55a]/[0.08]" },
    watch: { label: "watch", className: "text-[#9bb5ff] border-[#9bb5ff]/30 bg-[#9bb5ff]/[0.08]" },
    nominal: { label: "nominal", className: "text-[#86bd9a] border-[#86bd9a]/30 bg-[#86bd9a]/[0.08]" },
  }[severity];
  return <span className={`technical-label border px-2 py-1 text-[8px] ${config.className}`}>{config.label}</span>;
}

function StateRow({ label, value, changed, subtle }: { label: string; value: string | number; changed?: boolean; subtle?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2.5 last:border-0">
      <span className="mono text-[11px] text-slate-400">{label}</span>
      <span className={`mono text-[12px] ${changed ? "text-[#f1b55a]" : subtle ? "text-slate-400" : "text-slate-100"}`}>{value}</span>
    </div>
  );
}

function ShellSidebar({ view, setView }: { view: WorkspaceView; setView: (next: WorkspaceView) => void }) {
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0b0f13]/92 lg:flex">
      <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.08] px-6">
        <img src="/manus-storage/chronos-time-index-logo_cf424f88.png" alt="Chronos" className="h-9 w-9 object-contain" />
        <div><div className="text-[17px] font-semibold tracking-[-0.05em] text-slate-100">chronos</div><div className="technical-label mt-0.5 text-[8px] text-slate-500">debugger / 01</div></div>
      </div>
      <nav className="px-3 py-5">
        <p className="technical-label px-3 pb-2 text-slate-600">Investigation</p>
        <div className="space-y-1">
          {navItems.map(({ icon: Icon, label, view: itemView }) => {
            const active = itemView === "traces" ? view === "traces" || view === "investigate" : itemView === view;
            return <button key={label} className={`group flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-[13px] transition ${active ? "border-[#35d6e8] bg-[#35d6e8]/[0.07] text-[#eafafd]" : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`} onClick={() => {
              if (itemView === "traces" || itemView === "comparisons") setView(itemView);
              else toast.info(`${label} controls are represented in the investigation view.`);
            }}><Icon className={`h-4 w-4 ${active ? "text-[#35d6e8]" : "text-slate-500 group-hover:text-slate-300"}`} />{label}{label === "Traces" && <span className="mono ml-auto text-[9px] text-slate-600">{traceRecords.length}</span>}</button>;
          })}
        </div>
        <p className="technical-label px-3 pb-2 pt-8 text-slate-600">Workspace</p>
        <div className="space-y-1">
          <button className="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-left text-[13px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200" onClick={() => toast.info("Team configuration is not needed for this prototype.")}><Layers3 className="h-4 w-4 text-slate-500" />Team scope</button>
          <button className="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-left text-[13px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200" onClick={() => toast.info("Recording policies are summarized in the footer panel.")}><HardDrive className="h-4 w-4 text-slate-500" />Storage policy</button>
        </div>
      </nav>
      <div className="mt-auto border-t border-white/[0.08] p-4">
        <div className="hairline-card dot-grid p-3"><div className="flex items-center gap-2 text-[11px] font-medium text-slate-200"><ShieldCheck className="h-3.5 w-3.5 text-[#86bd9a]" />Selective capture</div><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Changes only. Payloads are redacted before they leave the process.</p></div>
        <button className="mt-4 flex w-full items-center gap-3 px-2 text-[12px] text-slate-500 transition hover:text-slate-200" onClick={() => toast.info("Preferences panel is available in the complete product.")}><Settings2 className="h-4 w-4" />Preferences</button>
      </div>
    </aside>
  );
}

function Header({ view, activeTrace, recording, setRecording, setView }: { view: WorkspaceView; activeTrace: TraceRecord; recording: boolean; setRecording: (next: boolean) => void; setView: (next: WorkspaceView) => void }) {
  return <header className="flex h-[76px] items-center justify-between border-b border-white/[0.08] bg-[#11171c]/80 px-5 backdrop-blur-xl sm:px-8">
    <div className="flex min-w-0 items-center gap-3 sm:gap-5"><img src="/manus-storage/chronos-time-index-logo_cf424f88.png" alt="Chronos" className="h-8 w-8 object-contain lg:hidden" /><button className="hidden items-center gap-2 text-[12px] text-slate-500 transition hover:text-slate-200 sm:flex" onClick={() => setView("traces")}><span>Traces</span><ChevronDown className="h-3.5 w-3.5" /><span className="text-slate-700">/</span><span className="mono text-slate-300">{activeTrace.service}</span></button><div className="sm:hidden"><div className="text-[14px] font-semibold">{view === "comparisons" ? "trace comparison" : activeTrace.service}</div><div className="technical-label text-[8px] text-slate-500">{view === "traces" ? "trace archive" : view === "comparisons" ? "diff engine" : "trace investigation"}</div></div><div className="hidden h-5 w-px bg-white/[0.09] md:block" /><div className="hidden items-center gap-2 md:flex"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#86bd9a] opacity-35" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#86bd9a]" /></span><span className="technical-label text-[9px] text-[#a7d9b4]">{recording ? "Recording" : "Paused"}</span></div></div>
    <div className="flex items-center gap-2 sm:gap-3"><button className="hidden h-9 items-center gap-2 border border-white/[0.1] bg-white/[0.03] px-3 text-[11px] text-slate-300 transition hover:border-white/[0.22] hover:bg-white/[0.06] md:flex" onClick={() => toast.info("Search is available across every captured request.")}><Search className="h-3.5 w-3.5" />Search traces <span className="mono rounded border border-white/[0.1] px-1.5 py-0.5 text-[9px] text-slate-500">⌘ K</span></button><button className="flex h-9 items-center gap-2 border border-white/[0.11] bg-white/[0.04] px-3 text-[11px] text-slate-300 transition hover:border-white/[0.24] hover:bg-white/[0.08]" onClick={() => { setRecording(!recording); toast.success(recording ? "Recording paused." : "Recording resumed."); }}>{recording ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{recording ? "Pause" : "Resume"}</span></button><button className="flex h-9 items-center gap-2 bg-[#35d6e8] px-3 text-[11px] font-semibold text-[#071619] transition hover:bg-[#75e5ef] active:scale-[0.97]" onClick={() => toast.success("A durable trace bookmark was created.")}><ArrowDownToLine className="h-3.5 w-3.5" /><span className="hidden sm:inline">Bookmark</span></button></div>
  </header>;
}

function TraceCard({ trace, active, onInspect, onCompare }: { trace: TraceRecord; active: boolean; onInspect: () => void; onCompare: () => void }) {
  return <div className={`group relative border border-white/[0.09] bg-[#11171c]/80 p-5 transition hover:border-[#35d6e8]/40 hover:bg-[#141c22] ${active ? "border-l-2 border-l-[#35d6e8]" : ""}`}><button className="absolute inset-0 text-left" aria-label={`Inspect ${trace.title}`} onClick={onInspect} /><div className="relative pointer-events-none flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${trace.severity === "critical" ? "bg-[#f1b55a]" : trace.severity === "watch" ? "bg-[#9bb5ff]" : "bg-[#86bd9a]"}`} /><div><div className="flex flex-wrap items-center gap-2"><span className="technical-label text-[#35d6e8]">TRACE / {trace.traceNumber}</span><SeverityMark severity={trace.severity} /></div><h3 className="mt-2 text-[14px] font-medium leading-snug text-slate-100">{trace.title}</h3><p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-slate-500">{trace.summary}</p></div></div><span className="mono shrink-0 text-[10px] text-slate-600">{trace.capturedAt}</span></div><div className="relative mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-white/[0.07] pt-4 sm:grid-cols-4"><div><p className="technical-label text-[8px] text-slate-600">route</p><p className="mono mt-1 text-[10px] text-slate-300">{trace.route}</p></div><div><p className="technical-label text-[8px] text-slate-600">status</p><p className={`mono mt-1 text-[10px] ${trace.status >= 400 ? "text-[#f1b55a]" : "text-[#86bd9a]"}`}>{trace.status}</p></div><div><p className="technical-label text-[8px] text-slate-600">duration</p><p className="mono mt-1 text-[10px] text-slate-300">{formatDuration(trace.durationMs)}</p></div><div><p className="technical-label text-[8px] text-slate-600">events</p><p className="mono mt-1 text-[10px] text-slate-300">{trace.events.length} semantic</p></div></div><div className="relative mt-4 flex items-center justify-between gap-3"><span className="mono text-[9px] text-slate-600">{trace.environment} · {trace.host}</span><button className="pointer-events-auto flex items-center gap-1.5 border border-[#35d6e8]/30 bg-[#35d6e8]/[0.08] px-2.5 py-1.5 text-[10px] font-medium text-[#8deaf2] transition hover:bg-[#35d6e8]/[0.15]" onClick={(event) => { event.stopPropagation(); onCompare(); }}><GitCompareArrows className="h-3 w-3" />Compare</button></div></div>;
}

function TracesView({ activeTraceId, setActiveTraceId, setView, setCompareTraceId }: { activeTraceId: string; setActiveTraceId: (id: string) => void; setView: (view: WorkspaceView) => void; setCompareTraceId: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = traceRecords.filter((trace) => `${trace.title} ${trace.service} ${trace.route} ${trace.environment}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><section className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><div className="flex items-center gap-2"><span className="technical-label text-[#35d6e8]">TRACE ARCHIVE / 04</span><span className="h-1 w-1 rounded-full bg-slate-600" /><span className="technical-label text-slate-500">captured requests</span></div><h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-slate-100 sm:text-[34px]">Recorded traces</h1><p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-400">Select a request to reconstruct its execution, or stage any two traces for a variable-level divergence study.</p></div><div className="flex items-center gap-2"><div className="flex items-center gap-2 border border-white/[0.1] bg-[#0c1014]/80 px-3 py-2"><Search className="h-3.5 w-3.5 text-slate-500" /><input aria-label="Filter traces" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter traces" className="w-32 bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-600 sm:w-44" /></div><button className="grid h-9 w-9 place-items-center border border-white/[0.1] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white" onClick={() => toast.info("Filters can be expanded with service, environment, or status predicates.")}><ListFilter className="h-4 w-4" /></button></div></section><div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="hairline-card dot-grid p-4"><p className="technical-label text-[9px] text-slate-600">active archive</p><p className="mt-2 text-[22px] font-semibold text-slate-100">{traceRecords.length}</p><p className="mt-1 text-[10px] text-slate-500">requests retained in fixture store</p></div><div className="hairline-card dot-grid p-4"><p className="technical-label text-[9px] text-slate-600">semantic events</p><p className="mt-2 text-[22px] font-semibold text-[#35d6e8]">{traceRecords.reduce((sum, trace) => sum + trace.events.length, 0)}</p><p className="mt-1 text-[10px] text-slate-500">state-changing points indexed</p></div><div className="hairline-card dot-grid p-4"><p className="technical-label text-[9px] text-slate-600">diff engine</p><p className="mt-2 text-[22px] font-semibold text-[#f1b55a]">ready</p><p className="mt-1 text-[10px] text-slate-500">pair any two traces below</p></div></div><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Waypoints className="h-4 w-4 text-[#35d6e8]" /><p className="technical-label text-slate-400">Captured request ledger</p></div><span className="mono text-[10px] text-slate-600">{filtered.length} / {traceRecords.length} visible</span></div><div className="space-y-3">{filtered.map((trace) => <TraceCard key={trace.id} trace={trace} active={trace.id === activeTraceId} onInspect={() => { setActiveTraceId(trace.id); setView("investigate"); }} onCompare={() => { setCompareTraceId(trace.id); setView("comparisons"); }} />)}</div>{filtered.length === 0 && <div className="chronos-panel p-10 text-center"><p className="technical-label text-slate-500">No matching traces</p><p className="mt-2 text-[12px] text-slate-400">Try a service, route, or environment name.</p></div>}</div>;
}

function CompareSelector({ label, color, value, onChange, exclude }: { label: string; color: string; value: string; onChange: (id: string) => void; exclude: string }) {
  return <label className="flex min-w-0 flex-1 flex-col gap-2"><span className="technical-label text-[9px]" style={{ color }}>{label}</span><div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none border border-white/[0.1] bg-[#0c1014] px-3 py-2.5 pr-8 text-[11px] text-slate-200 outline-none transition focus:border-[#35d6e8]/60">{traceRecords.filter((trace) => trace.id !== exclude || trace.id === value).map((trace) => <option key={trace.id} value={trace.id}>TRACE / {trace.traceNumber} · {trace.service}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" /></div></label>;
}

function ComparisonView({ activeTraceId, compareTraceId, setActiveTraceId, setCompareTraceId, inspectDivergence }: { activeTraceId: string; compareTraceId: string; setActiveTraceId: (id: string) => void; setCompareTraceId: (id: string) => void; inspectDivergence: () => void }) {
  const observed = getTrace(activeTraceId);
  const baseline = getTrace(compareTraceId);
  const result = useMemo(() => diffTraces(baseline, observed), [baseline, observed]);
  const divergenceEvent = result.firstDivergenceEvent;
  return <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><section className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><div className="flex items-center gap-2"><span className="technical-label text-[#f1b55a]">DIFF ENGINE / A↔B</span><span className="h-1 w-1 rounded-full bg-slate-600" /><span className="technical-label text-slate-500">cross-trace analysis</span></div><h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-slate-100 sm:text-[34px]">Compare two traces</h1><p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-400">Align semantic event streams, compare state snapshots, and locate the first variable path that departed from the baseline.</p></div><button className="flex items-center gap-2 self-start border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/[0.07]" onClick={() => { setActiveTraceId(compareTraceId); setCompareTraceId(activeTraceId); toast.success("Trace roles swapped."); }}><ArrowLeftRight className="h-3.5 w-3.5" />Swap traces</button></section><section className="chronos-panel mb-5 p-5 sm:p-6"><div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end"><CompareSelector label="A · baseline / expected" color="#35d6e8" value={compareTraceId} onChange={setCompareTraceId} exclude={activeTraceId} /><div className="hidden place-items-center pb-2 md:grid"><span className="grid h-8 w-8 place-items-center border border-white/[0.1] bg-white/[0.03] text-slate-500">↔</span></div><CompareSelector label="B · observed / actual" color="#f1b55a" value={activeTraceId} onChange={setActiveTraceId} exclude={compareTraceId} /></div></section><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="min-w-0 space-y-5"><section className="grid gap-3 md:grid-cols-2"><div className="chronos-panel overflow-hidden"><div className="border-b border-white/[0.09] px-5 py-4"><div className="flex items-center justify-between"><p className="technical-label text-[#35d6e8]">A / baseline</p><span className="mono text-[10px] text-slate-600">TRACE / {baseline.traceNumber}</span></div><h2 className="mt-2 text-[14px] font-medium text-slate-100">{baseline.title}</h2><p className="mt-1 text-[11px] text-slate-500">{baseline.route} · {baseline.environment}</p></div><div className="divide-y divide-white/[0.07]">{baseline.events.map((event, index) => <div key={event.id} className={`flex items-center gap-3 px-5 py-3 ${index === result.firstDivergenceIndex ? "bg-[#f1b55a]/[0.08]" : ""}`}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: eventStyle[event.kind].fill }} /><span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{event.label}</span><span className="mono text-[9px] text-slate-600">{offsetLabel(event.offset)}</span></div>)}</div></div><div className="chronos-panel overflow-hidden"><div className="border-b border-white/[0.09] px-5 py-4"><div className="flex items-center justify-between"><p className="technical-label text-[#f1b55a]">B / observed</p><span className="mono text-[10px] text-slate-600">TRACE / {observed.traceNumber}</span></div><h2 className="mt-2 text-[14px] font-medium text-slate-100">{observed.title}</h2><p className="mt-1 text-[11px] text-slate-500">{observed.route} · {observed.environment}</p></div><div className="divide-y divide-white/[0.07]">{observed.events.map((event, index) => <div key={event.id} className={`flex items-center gap-3 px-5 py-3 ${index === result.firstDivergenceIndex ? "bg-[#f1b55a]/[0.08]" : ""}`}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: eventStyle[event.kind].fill }} /><span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{event.label}</span><span className="mono text-[9px] text-slate-600">{offsetLabel(event.offset)}</span></div>)}</div></div></section><section className="chronos-panel overflow-hidden"><div className="flex flex-col gap-3 border-b border-white/[0.09] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-3"><Braces className="h-4 w-4 text-[#f1b55a]" /><div><p className="technical-label text-slate-400">Variable diff</p><p className="mt-1 text-[11px] text-slate-500">Final snapshots · {result.changed.length} changed paths</p></div></div><span className="technical-label border border-[#f1b55a]/30 bg-[#f1b55a]/[0.08] px-2 py-1 text-[8px] text-[#f4c579]">{result.changed.length ? "state mismatch" : "identical state"}</span></div><div className="divide-y divide-white/[0.07]">{result.changed.map((item) => <div key={item.path} className="grid gap-2 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center sm:px-6"><div><p className="mono text-[11px] text-slate-200">{item.path}</p><p className="technical-label mt-1 text-[8px] text-slate-600">{item.status}</p></div><div><p className="technical-label text-[8px] text-slate-600">expected / A</p><p className="mono mt-1 text-[11px] text-[#35d6e8]">{formatSnapshotValue(item.expected)}</p></div><div><p className="technical-label text-[8px] text-slate-600">actual / B</p><p className="mono mt-1 text-[11px] text-[#f1b55a]">{formatSnapshotValue(item.actual)}</p></div><span className="grid h-6 w-6 place-items-center border border-[#f1b55a]/30 text-[#f1b55a]">≠</span></div>)}{result.changed.length === 0 && <div className="px-6 py-10 text-center text-[12px] text-slate-500">No variable-level changes detected in the final snapshots.</div>}</div></section></div><aside className="chronos-panel h-fit overflow-hidden xl:sticky xl:top-6"><div className="border-b border-white/[0.09] px-5 py-4"><p className="technical-label text-slate-400">Divergence report</p><p className="mt-1 text-[11px] text-slate-500">Earliest snapshot mismatch</p></div><div className="p-5"><div className="border-l border-[#f1b55a] pl-4"><p className="text-[13px] font-medium text-slate-100">{divergenceEvent ? divergenceEvent.label : "No divergence found"}</p><p className="mt-2 text-[11px] leading-relaxed text-slate-400">{divergenceEvent ? "The observed trace first departs from the baseline at this semantic event. Inspect the exact variables and continue through the causal chain." : "The two selected traces resolve to the same captured state."}</p></div>{divergenceEvent && <><div className="mt-6 grid grid-cols-2 gap-3 border-y border-white/[0.08] py-4"><div><p className="technical-label text-[8px] text-slate-600">first event</p><p className="mono mt-1 text-[11px] text-[#f1b55a]">{divergenceEvent.id}</p></div><div><p className="technical-label text-[8px] text-slate-600">observed at</p><p className="mono mt-1 text-[11px] text-[#f1b55a]">{offsetLabel(divergenceEvent.offset)}</p></div></div><button className="mt-5 flex w-full items-center justify-center gap-2 bg-[#f1b55a] px-3 py-2.5 text-[11px] font-semibold text-[#261a06] transition hover:bg-[#ffd48d] active:scale-[0.98]" onClick={inspectDivergence}>Inspect divergence <SkipForward className="h-3.5 w-3.5" /></button></>}</div></aside></div></div>;
}

function InvestigationView({ trace, compareTrace, selectedIndex, setSelectedIndex, referenceIndex, setReferenceIndex, compareIndex, setCompareIndex, activeTab, setActiveTab, isPlaying, setIsPlaying, recording, setRecording, replayOpen, setReplayOpen, setView, jumpToDivergence }: { trace: TraceRecord; compareTrace: TraceRecord; selectedIndex: number; setSelectedIndex: (index: number) => void; referenceIndex: number; setReferenceIndex: (index: number) => void; compareIndex: number; setCompareIndex: (index: number) => void; activeTab: InspectorTab; setActiveTab: (tab: InspectorTab) => void; isPlaying: boolean; setIsPlaying: (playing: boolean) => void; recording: boolean; setRecording: (next: boolean) => void; replayOpen: boolean; setReplayOpen: (open: boolean) => void; setView: (view: WorkspaceView) => void; jumpToDivergence: () => void }) {
  const events = trace.events;
  const selectedEvent = events[Math.min(selectedIndex, events.length - 1)] ?? events[0];
  const referenceEvent = events[Math.min(referenceIndex, events.length - 1)] ?? events[0];
  const compareEvent = events[Math.min(compareIndex, events.length - 1)] ?? events[events.length - 1];
  const selectedSnapshot = selectedEvent?.snapshot ?? {};
  const temporalChanges = compareSnapshots(referenceEvent?.snapshot ?? {}, selectedSnapshot);
  const crossTraceResult = useMemo(() => diffTraces(compareTrace, trace), [compareTrace, trace]);
  const tracePath = events.map((event, index) => `${index === 0 ? "M" : "L"} ${projectX(event.offset, trace.durationMs)} ${48 + event.lane * 30}`).join(" ");
  const setA = () => { setReferenceIndex(selectedIndex); toast.success(`Baseline point A set at ${offsetLabel(selectedEvent.offset)}`); };
  const setB = () => { setCompareIndex(selectedIndex); toast.success(`Comparison point B set at ${offsetLabel(selectedEvent.offset)}`); };
  return <div className="mx-auto max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><section className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><div className="flex items-center gap-2"><button className="technical-label text-[#35d6e8] transition hover:text-[#8deaf2]" onClick={() => setView("traces")}>Trace / {trace.traceNumber}</button><span className="h-1 w-1 rounded-full bg-slate-600" /><span className="technical-label text-slate-500">{trace.environment}</span></div><h1 className="mt-2 text-[25px] font-semibold tracking-[-0.04em] text-slate-100 sm:text-[30px]">{trace.title}</h1><p className="mt-1.5 max-w-2xl text-[13px] text-slate-400">{trace.summary} Move through time to reconstruct the first incorrect state.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center border border-white/[0.1] bg-[#0c1014]/70 p-1"><button onClick={setA} className="mono px-2.5 py-1.5 text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white">A <span className="ml-1 text-[#35d6e8]">{offsetLabel(referenceEvent.offset)}</span></button><div className="h-4 w-px bg-white/[0.1]" /><button onClick={setB} className="mono px-2.5 py-1.5 text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white">B <span className="ml-1 text-[#f1b55a]">{offsetLabel(compareEvent.offset)}</span></button></div><button className="flex items-center gap-2 border border-[#f1b55a]/30 bg-[#f1b55a]/[0.08] px-3 py-2 text-[11px] font-medium text-[#f4c579] transition hover:bg-[#f1b55a]/[0.14]" onClick={jumpToDivergence}><GitCompareArrows className="h-3.5 w-3.5" />First divergence</button><button className="flex items-center gap-2 border border-[#35d6e8]/30 bg-[#35d6e8]/[0.08] px-3 py-2 text-[11px] font-medium text-[#8deaf2] transition hover:bg-[#35d6e8]/[0.14]" onClick={() => setView("comparisons")}><ArrowLeftRight className="h-3.5 w-3.5" />Compare trace</button></div></section><div className="mb-5 flex flex-wrap items-center gap-2 border-y border-white/[0.08] bg-[#0c1014]/45 px-4 py-3"><span className="technical-label text-[9px] text-slate-600">active trace</span><span className="mono text-[10px] text-slate-200">TRACE / {trace.traceNumber}</span><span className="text-slate-700">·</span><span className="mono text-[10px] text-slate-500">{trace.route}</span><span className="text-slate-700">·</span><span className="mono text-[10px] text-slate-500">{trace.status}</span><span className="ml-auto flex items-center gap-2 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-[#86bd9a]" />{events.length} semantic events captured</span></div><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="min-w-0 space-y-5"><section className="chronos-panel relative overflow-hidden"><img src="/manus-storage/chronos-trace-atlas_8f5d8b5b.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12] mix-blend-screen" /><div className="relative border-b border-white/[0.09] px-5 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Waypoints className="h-4 w-4 text-[#35d6e8]" /><div><p className="technical-label text-slate-400">Execution timeline</p><p className="mt-1 text-[11px] text-slate-500">{events.length} semantic events · {formatDuration(trace.durationMs)} captured</p></div></div><div className="flex items-center gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#35d6e8]" /> baseline</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#f1b55a]" /> divergence</span></div></div></div><div className="relative overflow-x-auto px-2 py-4 sm:px-4"><svg viewBox="0 0 990 206" className="h-[210px] min-w-[760px] w-full" role="img" aria-label={`Interactive execution event timeline for trace ${trace.traceNumber}`}><line x1="34" x2="956" y1="78" y2="78" stroke="rgba(212,232,237,0.09)" strokeDasharray="2 5" /><line x1="34" x2="956" y1="108" y2="108" stroke="rgba(212,232,237,0.09)" strokeDasharray="2 5" /><line x1="34" x2="956" y1="138" y2="138" stroke="rgba(212,232,237,0.09)" strokeDasharray="2 5" />{[0, 1, 2, 3, 4].map((tick) => { const value = (trace.durationMs / 4) * tick; return <g key={tick}><line x1={projectX(value, trace.durationMs)} x2={projectX(value, trace.durationMs)} y1="42" y2="164" stroke="rgba(212,232,237,0.07)" /><text x={projectX(value, trace.durationMs)} y="188" fill="#69777e" fontSize="10" textAnchor="middle" fontFamily="IBM Plex Mono">{offsetLabel(value)}</text></g>; })}<path d={tracePath} fill="none" stroke="rgba(110,142,150,0.48)" strokeWidth="1.35" /><line x1={projectX(referenceEvent.offset, trace.durationMs)} x2={projectX(referenceEvent.offset, trace.durationMs)} y1="32" y2="165" stroke="#35d6e8" strokeWidth="1" strokeDasharray="3 3" opacity="0.9" /><line x1={projectX(compareEvent.offset, trace.durationMs)} x2={projectX(compareEvent.offset, trace.durationMs)} y1="32" y2="165" stroke="#f1b55a" strokeWidth="1" strokeDasharray="3 3" opacity="0.9" />{events.map((event, index) => { const x = projectX(event.offset, trace.durationMs); const y = 48 + event.lane * 30; const selected = index === selectedIndex; return <g key={event.id} onClick={() => setSelectedIndex(index)} className="cursor-pointer">{selected && <circle cx={x} cy={y} r="13" fill={eventStyle[event.kind].fill} opacity="0.12" />}<circle cx={x} cy={y} r={selected ? 6 : 4.5} fill={eventStyle[event.kind].fill} stroke={selected ? "#f4fbfc" : "#101419"} strokeWidth={selected ? 2 : 1.5} />{event.kind === "exception" && <circle cx={x} cy={y} r="9" fill="none" stroke="#f1b55a" strokeWidth="1" opacity="0.55" />}</g>; })}<line x1={projectX(selectedEvent.offset, trace.durationMs)} x2={projectX(selectedEvent.offset, trace.durationMs)} y1="40" y2="166" stroke="#e8edf0" strokeWidth="1" opacity="0.55" /></svg></div><div className="relative flex flex-col justify-between gap-3 border-t border-white/[0.09] bg-[#0c1014]/65 px-5 py-3 sm:flex-row sm:items-center sm:px-6"><div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: eventStyle[selectedEvent.kind].fill }} /><span className="mono text-[11px] text-slate-200">{selectedEvent.id}</span><span className="text-[11px] text-slate-400">{selectedEvent.label}</span><span className="mono hidden text-[10px] text-slate-600 md:inline">{selectedEvent.detail}</span></div><div className="mono text-[11px] text-[#35d6e8]">{offsetLabel(selectedEvent.offset)}</div></div></section><section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="chronos-panel overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.09] px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><Braces className="h-4 w-4 text-[#35d6e8]" /><div><p className="technical-label text-slate-400">State inspector</p><p className="mt-1 text-[11px] text-slate-500">Captured at {offsetLabel(selectedEvent.offset)} · {selectedEvent.id}</p></div></div><button className="text-slate-500 transition hover:text-slate-200" onClick={() => toast.info("The state inspector can be expanded in the complete product.")}><MoreHorizontal className="h-4 w-4" /></button></div><div className="flex border-b border-white/[0.09] px-5 sm:px-6">{(["state", "diff"] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`technical-label relative mr-6 px-0 py-3.5 transition ${activeTab === tab ? "text-[#35d6e8]" : "text-slate-600 hover:text-slate-300"}`}>{tab === "state" ? "Snapshot" : "A / B Diff"}{activeTab === tab && <span className="absolute bottom-0 left-0 h-px w-full bg-[#35d6e8]" />}</button>)}</div>{activeTab === "diff" && <div className="border-b border-[#f1b55a]/20 bg-[#f1b55a]/[0.05] px-5 py-3 sm:px-6"><div className="flex items-center justify-between gap-3"><span className="technical-label text-[9px] text-[#f1b55a]">{temporalChanges.length} temporal changes at A → selected</span><span className="mono text-[10px] text-slate-500">{offsetLabel(referenceEvent.offset)} → {offsetLabel(selectedEvent.offset)}</span></div></div>}<div className="grid divide-y divide-white/[0.08] p-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:p-6"><div className="pr-0 sm:pr-6"><p className="technical-label text-[9px] text-slate-600">order</p><StateRow label="cart.items" value={formatSnapshotValue(selectedSnapshot["order.items"])} /><StateRow label="subtotal" value={valueWithDollar(selectedSnapshot["order.subtotal"])} changed={activeTab === "diff" && temporalChanges.some((item) => item.path === "order.subtotal")} /><StateRow label="discount" value={valueWithDollar(selectedSnapshot["order.discount"])} changed={activeTab === "diff" && temporalChanges.some((item) => item.path === "order.discount")} /><StateRow label="currency" value={formatSnapshotValue(selectedSnapshot["order.currency"])} subtle /><StateRow label="total" value={valueWithDollar(selectedSnapshot["order.total"])} changed={activeTab === "diff" && temporalChanges.some((item) => item.path === "order.total")} /></div><div className="pt-5 sm:pl-6 sm:pt-0"><p className="technical-label text-[9px] text-slate-600">execution</p><StateRow label="request.id" value={`req_${trace.traceNumber}`} /><StateRow label="payment.status" value={formatSnapshotValue(selectedSnapshot["execution.paymentStatus"])} subtle /><StateRow label="invariant" value={formatSnapshotValue(selectedSnapshot["execution.invariant"])} changed={selectedSnapshot["execution.invariant"] === "failed"} /><StateRow label="compare.trace" value={`TRACE / ${compareTrace.traceNumber}`} subtle /></div></div>{activeTab === "diff" && <div className="border-t border-white/[0.08] px-5 py-4 sm:px-6"><div className="flex items-center justify-between gap-3"><p className="technical-label text-[9px] text-slate-600">Cross-trace baseline</p><button className="text-[10px] text-[#35d6e8] transition hover:text-[#8deaf2]" onClick={() => setView("comparisons")}>Open full diff →</button></div><p className="mt-2 text-[11px] text-slate-400">{crossTraceResult.firstDivergenceEvent ? `TRACE / ${compareTrace.traceNumber} first diverges from this trace at ${crossTraceResult.firstDivergenceEvent.id}.` : "No cross-trace divergence detected."}</p></div>}</div><div className="chronos-panel relative overflow-hidden p-5 sm:p-6"><img src="/manus-storage/chronos-divergence-study_ea667452.png" alt="" className="pointer-events-none absolute -right-8 -top-5 h-[210px] w-[160px] object-cover opacity-30 mix-blend-screen" /><div className="relative"><div className="flex items-center gap-2"><GitCompareArrows className="h-4 w-4 text-[#f1b55a]" /><p className="technical-label text-slate-400">Divergence analysis</p></div><div className="mt-7 border-l border-[#f1b55a] pl-4"><p className="text-[13px] font-medium text-slate-100">{crossTraceResult.firstDivergenceEvent ? crossTraceResult.firstDivergenceEvent.label : "No divergence detected."}</p><p className="mt-2 text-[11px] leading-relaxed text-slate-400">{crossTraceResult.firstDivergenceEvent ? `Baseline TRACE / ${compareTrace.traceNumber} and observed TRACE / ${trace.traceNumber} separate here. The diff engine found ${crossTraceResult.changed.length} changed final-state paths.` : "The selected baseline and observed trace resolve to the same captured state."}</p></div><div className="mt-6 flex items-center justify-between border-y border-white/[0.08] py-3"><span className="technical-label text-[9px] text-slate-600">First observed</span><span className="mono text-[11px] text-[#f1b55a]">{crossTraceResult.firstDivergenceEvent ? offsetLabel(crossTraceResult.firstDivergenceEvent.offset) : "—"}</span></div><button className="mt-5 flex items-center gap-2 text-[11px] font-medium text-[#f1b55a] transition hover:text-[#ffd48d]" onClick={jumpToDivergence}>Inspect causal chain <SkipForward className="h-3.5 w-3.5" /></button></div></div></section></div><aside className="chronos-panel overflow-hidden xl:sticky xl:top-6 xl:h-[calc(100vh-124px)]"><div className="flex items-center justify-between border-b border-white/[0.09] px-5 py-4"><div><p className="technical-label text-slate-400">Event ledger</p><p className="mt-1 text-[11px] text-slate-500">Chronological, semantic changes</p></div><span className="mono text-[10px] text-slate-600">{events.length} / {events.length}</span></div><div className="max-h-[470px] overflow-y-auto xl:max-h-[calc(100vh-326px)]">{events.map((event, index) => { const selected = index === selectedIndex; return <button key={event.id} onClick={() => setSelectedIndex(index)} className={`relative flex w-full items-start gap-3 border-b border-white/[0.07] px-5 py-3.5 text-left transition ${selected ? "bg-[#35d6e8]/[0.07]" : "hover:bg-white/[0.035]"}`}>{selected && <span className="absolute left-0 top-0 h-full w-px bg-[#35d6e8]" />}<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: eventStyle[event.kind].fill }} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className={`text-[12px] font-medium ${selected ? "text-slate-100" : "text-slate-300"}`}>{event.label}</span><span className={`mono shrink-0 text-[10px] ${selected ? "text-[#35d6e8]" : "text-slate-600"}`}>{offsetLabel(event.offset)}</span></span><span className="mt-1 block truncate mono text-[10px] text-slate-500">{event.detail}</span></span></button>; })}</div><div className="border-t border-white/[0.09] bg-[#0b0f13]/55 p-4"><div className="flex items-center justify-between"><div><p className="technical-label text-[9px] text-slate-500">Capture policy</p><p className="mt-1 text-[11px] text-slate-300">Selective changes · 128 MB budget</p></div><button className="text-slate-500 hover:text-slate-200" onClick={() => toast.info("Storage policy is set to a 128 MB rolling budget.")}><CircleHelp className="h-4 w-4" /></button></div></div></aside></div><section className="chronos-panel mt-5 overflow-hidden"><div className="flex flex-col gap-5 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center border border-[#35d6e8]/30 bg-[#35d6e8]/[0.08]"><Play className="ml-0.5 h-4 w-4 text-[#35d6e8]" /></div><div><p className="technical-label text-slate-400">Segment replay</p><p className="mt-1 text-[11px] text-slate-500">Rebuild selected events against a controlled process.</p></div></div><div className="flex flex-wrap items-center gap-2"><button className="flex h-9 items-center gap-2 border border-white/[0.1] bg-white/[0.03] px-3 text-[11px] text-slate-300 transition hover:bg-white/[0.07]" onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}><SkipBack className="h-3.5 w-3.5" />Step back</button><button className="flex h-9 items-center gap-2 bg-[#35d6e8] px-3 text-[11px] font-semibold text-[#061619] transition hover:bg-[#72e6ef] active:scale-[0.97]" onClick={() => { setReplayOpen(true); setIsPlaying(!isPlaying); }}>{isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{isPlaying ? "Pause replay" : "Replay A → B"}</button><button className="grid h-9 w-9 place-items-center border border-white/[0.1] text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100" onClick={() => { setSelectedIndex(Math.min(compareIndex, events.length - 1)); setIsPlaying(false); }}><SkipForward className="h-3.5 w-3.5" /></button></div></div>{replayOpen && <div className="flex items-center justify-between gap-4 border-t border-white/[0.08] bg-[#0c1014]/55 px-5 py-3 sm:px-6"><div className="flex min-w-0 items-center gap-3"><img src="/manus-storage/chronos-replay-window_b38cce86.png" alt="" className="h-9 w-12 border border-white/[0.1] object-cover opacity-80" /><span className="mono truncate text-[10px] text-slate-400">replaying {offsetLabel(referenceEvent.offset)} → {offsetLabel(compareEvent.offset)} · deterministic sandbox</span></div><button onClick={() => { setReplayOpen(false); setIsPlaying(false); }} className="text-slate-500 transition hover:text-slate-100"><X className="h-4 w-4" /></button></div>}</section></div>;
}

export default function Home() {
  const [view, setView] = useState<WorkspaceView>("traces");
  const [activeTraceId, setActiveTraceId] = useState(defaultTraceId);
  const [compareTraceId, setCompareTraceId] = useState(defaultCompareTraceId);
  const [selectedIndex, setSelectedIndex] = useState(6);
  const [referenceIndex, setReferenceIndex] = useState(5);
  const [compareIndex, setCompareIndex] = useState(6);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState(true);
  const [activeTab, setActiveTab] = useState<InspectorTab>("state");
  const [replayOpen, setReplayOpen] = useState(false);
  const activeTrace = useMemo(() => getTrace(activeTraceId), [activeTraceId]);
  const compareTrace = useMemo(() => getTrace(compareTraceId), [compareTraceId]);

  useEffect(() => {
    const lastIndex = Math.max(0, activeTrace.events.length - 1);
    setSelectedIndex(Math.min(activeTrace.events.length > 6 ? 6 : lastIndex, lastIndex));
    setReferenceIndex(Math.min(5, lastIndex));
    setCompareIndex(Math.min(6, lastIndex));
    setIsPlaying(false);
    setReplayOpen(false);
  }, [activeTraceId, activeTrace.events.length]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setSelectedIndex((current) => {
        if (current >= Math.min(compareIndex, activeTrace.events.length - 1)) { setIsPlaying(false); return current; }
        return current + 1;
      });
    }, 600);
    return () => window.clearInterval(interval);
  }, [isPlaying, compareIndex, activeTrace.events.length]);

  const jumpToDivergence = () => {
    const result = diffTraces(compareTrace, activeTrace);
    const index = result.firstDivergenceIndex ?? 0;
    setSelectedIndex(Math.min(index, activeTrace.events.length - 1));
    setActiveTab("diff");
    setView("investigate");
    toast("Jumped to the first variable divergence.");
  };

  const inspectCrossTraceDivergence = () => {
    const result = diffTraces(compareTrace, activeTrace);
    setSelectedIndex(Math.min(result.firstDivergenceIndex ?? 0, activeTrace.events.length - 1));
    setActiveTab("diff");
    setView("investigate");
    toast.success(`Inspecting TRACE / ${activeTrace.traceNumber} at its first divergence.`);
  };

  return <div className="chronos-shell flex min-h-screen text-slate-100"><ShellSidebar view={view} setView={setView} /><main className="min-w-0 flex-1"><Header view={view} activeTrace={activeTrace} recording={recording} setRecording={setRecording} setView={setView} />{view === "traces" && <TracesView activeTraceId={activeTraceId} setActiveTraceId={setActiveTraceId} setView={setView} setCompareTraceId={setCompareTraceId} />}{view === "comparisons" && <ComparisonView activeTraceId={activeTraceId} compareTraceId={compareTraceId} setActiveTraceId={setActiveTraceId} setCompareTraceId={setCompareTraceId} inspectDivergence={inspectCrossTraceDivergence} />}{view === "investigate" && <InvestigationView trace={activeTrace} compareTrace={compareTrace} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} referenceIndex={referenceIndex} setReferenceIndex={setReferenceIndex} compareIndex={compareIndex} setCompareIndex={setCompareIndex} activeTab={activeTab} setActiveTab={setActiveTab} isPlaying={isPlaying} setIsPlaying={setIsPlaying} recording={recording} setRecording={setRecording} replayOpen={replayOpen} setReplayOpen={setReplayOpen} setView={setView} jumpToDivergence={jumpToDivergence} />}</main></div>;
}
