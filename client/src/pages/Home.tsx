/**
 * Chronos design reminder: Instrument Panel Dossier. This workspace treats execution data as evidence:
 * a dark graphite field, cyan temporal focus, amber causal divergence, and disciplined monospaced metadata.
 */
import { scaleLinear } from "d3";
import {
  Activity,
  ArrowDownToLine,
  Braces,
  ChevronDown,
  CircleHelp,
  Database,
  FileClock,
  GitCompareArrows,
  HardDrive,
  Layers3,
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

type EventKind = "checkpoint" | "mutation" | "request" | "exception" | "query" | "message";

type TraceEvent = {
  id: string;
  offset: number;
  label: string;
  detail: string;
  kind: EventKind;
  lane: number;
};

const traceEvents: TraceEvent[] = [
  { id: "EVT-0001", offset: 0, label: "Request accepted", detail: "POST /checkout", kind: "request", lane: 1 },
  { id: "EVT-0002", offset: 420, label: "Cart hydrated", detail: "cart.items → 3", kind: "mutation", lane: 2 },
  { id: "EVT-0003", offset: 880, label: "Pricing snapshot", detail: "currency = USD", kind: "checkpoint", lane: 1 },
  { id: "EVT-0004", offset: 1360, label: "Inventory query", detail: "sku: WD-4831", kind: "query", lane: 3 },
  { id: "EVT-0005", offset: 1770, label: "Tax resolver", detail: "region = US-CA", kind: "mutation", lane: 2 },
  { id: "EVT-0006", offset: 2210, label: "Promotion applied", detail: "discount → -15.00", kind: "mutation", lane: 1 },
  { id: "EVT-0007", offset: 2640, label: "Subtotal diverged", detail: "expected 113.50 · got 98.50", kind: "exception", lane: 3 },
  { id: "EVT-0008", offset: 3060, label: "Payment intent", detail: "amount = 98.50", kind: "request", lane: 2 },
  { id: "EVT-0009", offset: 3490, label: "Ledger write", detail: "transaction pending", kind: "message", lane: 1 },
  { id: "EVT-0010", offset: 3910, label: "Invariant failed", detail: "order.total ≠ receipt.total", kind: "exception", lane: 3 },
  { id: "EVT-0011", offset: 4290, label: "Compensation", detail: "payment intent canceled", kind: "mutation", lane: 2 },
  { id: "EVT-0012", offset: 4700, label: "Request completed", detail: "status = 422", kind: "checkpoint", lane: 1 },
];

const eventStyle: Record<EventKind, { fill: string; line: string; text: string; label: string }> = {
  checkpoint: { fill: "#35d6e8", line: "#35d6e8", text: "text-[#35d6e8]", label: "checkpoint" },
  mutation: { fill: "#86bd9a", line: "#86bd9a", text: "text-[#86bd9a]", label: "state mutation" },
  request: { fill: "#8e9ca5", line: "#8e9ca5", text: "text-[#c7d0d4]", label: "request" },
  exception: { fill: "#f1b55a", line: "#f1b55a", text: "text-[#f1b55a]", label: "divergence" },
  query: { fill: "#9bb5ff", line: "#9bb5ff", text: "text-[#9bb5ff]", label: "query" },
  message: { fill: "#c594eb", line: "#c594eb", text: "text-[#c594eb]", label: "message" },
};

const stateFrames = [
  { subtotal: "$128.50", tax: "$10.28", total: "$138.78", discount: "$0.00", cartItems: 3, status: "evaluating" },
  { subtotal: "$113.50", tax: "$10.28", total: "$123.78", discount: "-$15.00", cartItems: 3, status: "evaluating" },
  { subtotal: "$98.50", tax: "$10.28", total: "$108.78", discount: "-$30.00", cartItems: 3, status: "invariant failed" },
  { subtotal: "$98.50", tax: "$8.87", total: "$107.37", discount: "-$30.00", cartItems: 3, status: "compensating" },
];

const navItems = [
  { icon: Activity, label: "Traces", active: true },
  { icon: Database, label: "Recordings" },
  { icon: GitCompareArrows, label: "Comparisons" },
  { icon: FileClock, label: "Replays" },
];

function offsetLabel(offset: number) {
  return `+${(offset / 1000).toFixed(2)}s`;
}

function StateRow({ label, value, changed, subtle }: { label: string; value: string | number; changed?: boolean; subtle?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2.5 last:border-0">
      <span className="mono text-[11px] text-slate-400">{label}</span>
      <span className={`mono text-[12px] ${changed ? "text-[#f1b55a]" : subtle ? "text-slate-400" : "text-slate-100"}`}>{value}</span>
    </div>
  );
}

export default function Home() {
  const [selectedIndex, setSelectedIndex] = useState(9);
  const [referenceIndex, setReferenceIndex] = useState(5);
  const [compareIndex, setCompareIndex] = useState(9);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState(true);
  const [activeTab, setActiveTab] = useState<"state" | "diff">("state");
  const [replayOpen, setReplayOpen] = useState(false);

  const selectedEvent = traceEvents[selectedIndex];
  const selectedFrame = stateFrames[Math.min(3, Math.max(0, Math.floor(selectedIndex / 3)))];
  const referenceFrame = stateFrames[Math.min(3, Math.max(0, Math.floor(referenceIndex / 3)))];

  const x = useMemo(() => scaleLinear().domain([0, 4700]).range([34, 956]), []);
  const tracePath = useMemo(() => {
    return traceEvents.map((event, index) => `${index === 0 ? "M" : "L"} ${x(event.offset)} ${48 + event.lane * 30}`).join(" ");
  }, [x]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setSelectedIndex((current) => {
        if (current >= compareIndex) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 600);
    return () => window.clearInterval(interval);
  }, [isPlaying, compareIndex]);

  const setA = () => {
    setReferenceIndex(selectedIndex);
    toast.success(`Reference point A set at ${offsetLabel(selectedEvent.offset)}`);
  };

  const setB = () => {
    setCompareIndex(selectedIndex);
    toast.success(`Comparison point B set at ${offsetLabel(selectedEvent.offset)}`);
  };

  const jumpToDivergence = () => {
    setSelectedIndex(6);
    setActiveTab("diff");
    toast("Jumped to the first observed divergence.");
  };

  return (
    <div className="chronos-shell flex min-h-screen text-slate-100">
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0b0f13]/92 lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.08] px-6">
          <img src="/manus-storage/chronos-time-index-logo_cf424f88.png" alt="Chronos" className="h-9 w-9 object-contain" />
          <div>
            <div className="text-[17px] font-semibold tracking-[-0.05em] text-slate-100">chronos</div>
            <div className="technical-label mt-0.5 text-[8px] text-slate-500">debugger / 01</div>
          </div>
        </div>

        <nav className="px-3 py-5">
          <p className="technical-label px-3 pb-2 text-slate-600">Investigation</p>
          <div className="space-y-1">
            {navItems.map(({ icon: Icon, label, active }) => (
              <button key={label} className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition ${active ? "border-l-2 border-[#35d6e8] bg-[#35d6e8]/[0.07] text-[#eafafd]" : "border-l-2 border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`} onClick={() => !active && toast.info(`${label} is represented in this focused prototype.`)}>
                <Icon className={`h-4 w-4 ${active ? "text-[#35d6e8]" : "text-slate-500 group-hover:text-slate-300"}`} />
                {label}
              </button>
            ))}
          </div>
          <p className="technical-label px-3 pb-2 pt-8 text-slate-600">Workspace</p>
          <div className="space-y-1">
            <button className="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-left text-[13px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200" onClick={() => toast.info("Team configuration is not needed for this prototype.")}><Layers3 className="h-4 w-4 text-slate-500" /> Team scope</button>
            <button className="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-left text-[13px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200" onClick={() => toast.info("Recording policies are summarized in the footer panel.")}><HardDrive className="h-4 w-4 text-slate-500" /> Storage policy</button>
          </div>
        </nav>

        <div className="mt-auto border-t border-white/[0.08] p-4">
          <div className="hairline-card dot-grid p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-200"><ShieldCheck className="h-3.5 w-3.5 text-[#86bd9a]" /> Selective capture</div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Changes only. Payloads are redacted before they leave the process.</p>
          </div>
          <button className="mt-4 flex w-full items-center gap-3 px-2 text-[12px] text-slate-500 transition hover:text-slate-200" onClick={() => toast.info("Preferences panel is available in the complete product.")}><Settings2 className="h-4 w-4" /> Preferences</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-[76px] items-center justify-between border-b border-white/[0.08] bg-[#11171c]/80 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <img src="/manus-storage/chronos-time-index-logo_cf424f88.png" alt="Chronos" className="h-8 w-8 object-contain lg:hidden" />
            <div className="hidden items-center gap-2 text-[12px] text-slate-500 sm:flex"><span>Traces</span><ChevronDown className="h-3.5 w-3.5" /><span className="text-slate-700">/</span><span className="mono text-slate-300">checkout-service</span></div>
            <div className="sm:hidden"><div className="text-[14px] font-semibold">checkout-service</div><div className="technical-label text-[8px] text-slate-500">trace investigation</div></div>
            <div className="hidden h-5 w-px bg-white/[0.09] md:block" />
            <div className="hidden items-center gap-2 md:flex"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#86bd9a] opacity-35" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#86bd9a]" /></span><span className="technical-label text-[9px] text-[#a7d9b4]">Recording</span></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="hidden h-9 items-center gap-2 border border-white/[0.1] bg-white/[0.03] px-3 text-[11px] text-slate-300 transition hover:border-white/[0.22] hover:bg-white/[0.06] md:flex" onClick={() => toast.info("Search is available across every state capture in the production build.")}><Search className="h-3.5 w-3.5" /> Search trace <span className="mono rounded border border-white/[0.1] px-1.5 py-0.5 text-[9px] text-slate-500">⌘ K</span></button>
            <button className="flex h-9 items-center gap-2 border border-white/[0.11] bg-white/[0.04] px-3 text-[11px] text-slate-300 transition hover:border-white/[0.24] hover:bg-white/[0.08]" onClick={() => { setRecording((value) => !value); toast.success(recording ? "Recording paused for checkout-service." : "Recording resumed for checkout-service."); }}>
              {recording ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} <span className="hidden sm:inline">{recording ? "Pause" : "Resume"}</span>
            </button>
            <button className="flex h-9 items-center gap-2 bg-[#35d6e8] px-3 text-[11px] font-semibold text-[#071619] transition hover:bg-[#75e5ef] active:scale-[0.97]" onClick={() => toast.success("A durable trace bookmark was created.")}><ArrowDownToLine className="h-3.5 w-3.5" /><span className="hidden sm:inline">Bookmark</span></button>
          </div>
        </header>

        <div className="mx-auto max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <section className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <div className="flex items-center gap-2"><span className="technical-label text-[#35d6e8]">Trace / 1482</span><span className="h-1 w-1 rounded-full bg-slate-600" /><span className="technical-label text-slate-500">prod-us-east-1</span></div>
              <h1 className="mt-2 text-[25px] font-semibold tracking-[-0.04em] text-slate-100 sm:text-[30px]">Payment total drift in checkout flow</h1>
              <p className="mt-1.5 max-w-2xl text-[13px] text-slate-400">A single request, captured from ingress to compensation. Move through time to reconstruct the first incorrect state.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center border border-white/[0.1] bg-[#0c1014]/70 p-1">
                <button onClick={setA} className="mono px-2.5 py-1.5 text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white">A <span className="ml-1 text-[#35d6e8]">{offsetLabel(traceEvents[referenceIndex].offset)}</span></button>
                <div className="h-4 w-px bg-white/[0.1]" />
                <button onClick={setB} className="mono px-2.5 py-1.5 text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white">B <span className="ml-1 text-[#f1b55a]">{offsetLabel(traceEvents[compareIndex].offset)}</span></button>
              </div>
              <button className="flex items-center gap-2 border border-[#f1b55a]/30 bg-[#f1b55a]/[0.08] px-3 py-2 text-[11px] font-medium text-[#f4c579] transition hover:bg-[#f1b55a]/[0.14]" onClick={jumpToDivergence}><GitCompareArrows className="h-3.5 w-3.5" /> First divergence</button>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              <section className="chronos-panel relative overflow-hidden">
                <img src="/manus-storage/chronos-trace-atlas_8f5d8b5b.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12] mix-blend-screen" />
                <div className="relative border-b border-white/[0.09] px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3"><Waypoints className="h-4 w-4 text-[#35d6e8]" /><div><p className="technical-label text-slate-400">Execution timeline</p><p className="mt-1 text-[11px] text-slate-500">12 semantic events · 4.70 seconds captured</p></div></div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#35d6e8]" /> reference</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#f1b55a]" /> divergence</span></div>
                  </div>
                </div>
                <div className="relative overflow-x-auto px-2 py-4 sm:px-4">
                  <svg viewBox="0 0 990 206" className="h-[210px] min-w-[760px] w-full" role="img" aria-label="Interactive execution event timeline">
                    {[78, 108, 138].map((y) => <line key={y} x1="34" x2="956" y1={y} y2={y} stroke="rgba(212,232,237,0.09)" strokeDasharray="2 5" />)}
                    {[0, 1000, 2000, 3000, 4000, 4700].map((tick) => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1="42" y2="164" stroke="rgba(212,232,237,0.07)" /><text x={x(tick)} y="188" fill="#69777e" fontSize="10" textAnchor="middle" fontFamily="IBM Plex Mono">{offsetLabel(tick)}</text></g>)}
                    <path d={tracePath} fill="none" stroke="rgba(110, 142, 150, 0.48)" strokeWidth="1.35" />
                    <line x1={x(traceEvents[referenceIndex].offset)} x2={x(traceEvents[referenceIndex].offset)} y1="32" y2="165" stroke="#35d6e8" strokeWidth="1" strokeDasharray="3 3" opacity="0.9" />
                    <line x1={x(traceEvents[compareIndex].offset)} x2={x(traceEvents[compareIndex].offset)} y1="32" y2="165" stroke="#f1b55a" strokeWidth="1" strokeDasharray="3 3" opacity="0.9" />
                    <rect x={x(traceEvents[referenceIndex].offset)} y="20" width="19" height="13" fill="#35d6e8" rx="1" /><text x={x(traceEvents[referenceIndex].offset) + 9.5} y="30" fill="#071619" fontSize="8" textAnchor="middle" fontWeight="700" fontFamily="IBM Plex Mono">A</text>
                    <rect x={x(traceEvents[compareIndex].offset) - 19} y="20" width="19" height="13" fill="#f1b55a" rx="1" /><text x={x(traceEvents[compareIndex].offset) - 9.5} y="30" fill="#261a06" fontSize="8" textAnchor="middle" fontWeight="700" fontFamily="IBM Plex Mono">B</text>
                    {traceEvents.map((event, index) => {
                      const isSelected = index === selectedIndex;
                      const y = 48 + event.lane * 30;
                      return <g key={event.id} onClick={() => setSelectedIndex(index)} className="cursor-pointer">
                        {isSelected && <circle cx={x(event.offset)} cy={y} r="13" fill={eventStyle[event.kind].fill} opacity="0.12" />}
                        <circle cx={x(event.offset)} cy={y} r={isSelected ? 6 : 4.5} fill={eventStyle[event.kind].fill} stroke={isSelected ? "#f4fbfc" : "#101419"} strokeWidth={isSelected ? 2 : 1.5} />
                        {event.kind === "exception" && <circle cx={x(event.offset)} cy={y} r="9" fill="none" stroke="#f1b55a" strokeWidth="1" opacity="0.55" />}
                      </g>;
                    })}
                    <line x1={x(selectedEvent.offset)} x2={x(selectedEvent.offset)} y1="40" y2="166" stroke="#e8edf0" strokeWidth="1" opacity="0.55" />
                  </svg>
                </div>
                <div className="relative flex flex-col justify-between gap-3 border-t border-white/[0.09] bg-[#0c1014]/65 px-5 py-3 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex items-center gap-3"><div className={`h-2 w-2 rounded-full ${eventStyle[selectedEvent.kind].text.replace("text-", "bg-")}`} style={{ backgroundColor: eventStyle[selectedEvent.kind].fill }} /><span className="mono text-[11px] text-slate-200">{selectedEvent.id}</span><span className="text-[11px] text-slate-400">{selectedEvent.label}</span><span className="mono hidden text-[10px] text-slate-600 md:inline">{selectedEvent.detail}</span></div>
                  <div className="mono text-[11px] text-[#35d6e8]">{offsetLabel(selectedEvent.offset)}</div>
                </div>
              </section>

              <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="chronos-panel overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/[0.09] px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3"><Braces className="h-4 w-4 text-[#35d6e8]" /><div><p className="technical-label text-slate-400">State inspector</p><p className="mt-1 text-[11px] text-slate-500">Captured at {offsetLabel(selectedEvent.offset)} · {selectedEvent.id}</p></div></div>
                    <button className="text-slate-500 transition hover:text-slate-200" onClick={() => toast.info("The state inspector can be expanded in the complete product.")}><MoreHorizontal className="h-4 w-4" /></button>
                  </div>
                  <div className="flex border-b border-white/[0.09] px-5 sm:px-6">
                    {(["state", "diff"] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`technical-label relative px-0 py-3.5 mr-6 transition ${activeTab === tab ? "text-[#35d6e8]" : "text-slate-600 hover:text-slate-300"}`}>{tab === "state" ? "Snapshot" : "A / B Diff"}{activeTab === tab && <span className="absolute bottom-0 left-0 h-px w-full bg-[#35d6e8]" />}</button>)}
                  </div>
                  <div className="grid divide-y divide-white/[0.08] p-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:p-6">
                    <div className="pr-0 sm:pr-6">
                      <p className="technical-label text-[9px] text-slate-600">order</p>
                      <StateRow label="cart.items" value={selectedFrame.cartItems} />
                      <StateRow label="subtotal" value={selectedFrame.subtotal} changed={activeTab === "diff" && selectedFrame.subtotal !== referenceFrame.subtotal} />
                      <StateRow label="discount" value={selectedFrame.discount} changed={activeTab === "diff" && selectedFrame.discount !== referenceFrame.discount} />
                      <StateRow label="tax" value={selectedFrame.tax} changed={activeTab === "diff" && selectedFrame.tax !== referenceFrame.tax} />
                      <StateRow label="total" value={selectedFrame.total} changed={activeTab === "diff" && selectedFrame.total !== referenceFrame.total} />
                    </div>
                    <div className="pt-5 sm:pl-6 sm:pt-0">
                      <p className="technical-label text-[9px] text-slate-600">execution</p>
                      <StateRow label="request.id" value="req_01HTV3J9" />
                      <StateRow label="currency" value="USD" />
                      <StateRow label="promotion.code" value="SPRING15" changed={activeTab === "diff"} />
                      <StateRow label="payment.status" value={selectedIndex > 9 ? "canceled" : "pending"} subtle />
                      <StateRow label="invariant" value={selectedFrame.status} changed={selectedIndex >= 6} />
                    </div>
                  </div>
                </div>

                <div className="chronos-panel relative overflow-hidden p-5 sm:p-6">
                  <img src="/manus-storage/chronos-divergence-study_ea667452.png" alt="" className="pointer-events-none absolute -right-8 -top-5 h-[210px] w-[160px] object-cover opacity-30 mix-blend-screen" />
                  <div className="relative"><div className="flex items-center gap-2"><GitCompareArrows className="h-4 w-4 text-[#f1b55a]" /><p className="technical-label text-slate-400">Divergence analysis</p></div>
                    <div className="mt-7 border-l border-[#f1b55a] pl-4"><p className="text-[13px] font-medium text-slate-100">Promotion was applied twice.</p><p className="mt-2 text-[11px] leading-relaxed text-slate-400">The second mutation re-used the original subtotal instead of the discounted snapshot.</p></div>
                    <div className="mt-6 flex items-center justify-between border-y border-white/[0.08] py-3"><span className="technical-label text-[9px] text-slate-600">First observed</span><span className="mono text-[11px] text-[#f1b55a]">+2.64s</span></div>
                    <button className="mt-5 flex items-center gap-2 text-[11px] font-medium text-[#f1b55a] transition hover:text-[#ffd48d]" onClick={jumpToDivergence}>Inspect causal chain <SkipForward className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="chronos-panel overflow-hidden xl:sticky xl:top-6 xl:h-[calc(100vh-124px)]">
              <div className="flex items-center justify-between border-b border-white/[0.09] px-5 py-4"><div><p className="technical-label text-slate-400">Event ledger</p><p className="mt-1 text-[11px] text-slate-500">Chronological, semantic changes</p></div><span className="mono text-[10px] text-slate-600">12 / 12</span></div>
              <div className="max-h-[470px] overflow-y-auto xl:max-h-[calc(100vh-326px)]">
                {traceEvents.map((event, index) => {
                  const selected = index === selectedIndex;
                  return <button key={event.id} onClick={() => setSelectedIndex(index)} className={`relative flex w-full items-start gap-3 border-b border-white/[0.07] px-5 py-3.5 text-left transition ${selected ? "bg-[#35d6e8]/[0.07]" : "hover:bg-white/[0.035]"}`}>
                    {selected && <span className="absolute left-0 top-0 h-full w-px bg-[#35d6e8]" />}
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: eventStyle[event.kind].fill }} />
                    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className={`text-[12px] font-medium ${selected ? "text-slate-100" : "text-slate-300"}`}>{event.label}</span><span className={`mono shrink-0 text-[10px] ${selected ? "text-[#35d6e8]" : "text-slate-600"}`}>{offsetLabel(event.offset)}</span></span><span className="mt-1 block truncate mono text-[10px] text-slate-500">{event.detail}</span></span>
                  </button>;
                })}
              </div>
              <div className="border-t border-white/[0.09] bg-[#0b0f13]/55 p-4">
                <div className="flex items-center justify-between"><div><p className="technical-label text-[9px] text-slate-500">Capture policy</p><p className="mt-1 text-[11px] text-slate-300">Selective changes · 128 MB budget</p></div><button className="text-slate-500 hover:text-slate-200" onClick={() => toast.info("Storage policy is set to a 128 MB rolling budget.")}><CircleHelp className="h-4 w-4" /></button></div>
              </div>
            </aside>
          </div>

          <section className="chronos-panel mt-5 overflow-hidden">
            <div className="flex flex-col gap-5 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center border border-[#35d6e8]/30 bg-[#35d6e8]/[0.08]"><Play className="ml-0.5 h-4 w-4 text-[#35d6e8]" /></div><div><p className="technical-label text-slate-400">Segment replay</p><p className="mt-1 text-[11px] text-slate-500">Rebuild selected execution events against a controlled process.</p></div></div>
              <div className="flex flex-wrap items-center gap-2"><button className="flex h-9 items-center gap-2 border border-white/[0.1] bg-white/[0.03] px-3 text-[11px] text-slate-300 transition hover:bg-white/[0.07]" onClick={() => setSelectedIndex(Math.max(referenceIndex, selectedIndex - 1))}><SkipBack className="h-3.5 w-3.5" /> Step</button><button className="flex h-9 items-center gap-2 bg-[#35d6e8] px-3 text-[11px] font-semibold text-[#061619] transition hover:bg-[#72e6ef] active:scale-[0.97]" onClick={() => { setReplayOpen(true); setIsPlaying((value) => !value); }}>{isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{isPlaying ? "Pause replay" : "Replay A → B"}</button><button className="grid h-9 w-9 place-items-center border border-white/[0.1] text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100" onClick={() => { setSelectedIndex(compareIndex); setIsPlaying(false); }}><SkipForward className="h-3.5 w-3.5" /></button></div>
            </div>
            {replayOpen && <div className="flex items-center justify-between gap-4 border-t border-white/[0.08] bg-[#0c1014]/55 px-5 py-3 sm:px-6"><div className="flex min-w-0 items-center gap-3"><img src="/manus-storage/chronos-replay-window_b38cce86.png" alt="" className="h-9 w-12 border border-white/[0.1] object-cover opacity-80" /><span className="mono truncate text-[10px] text-slate-400">replaying {offsetLabel(traceEvents[referenceIndex].offset)} → {offsetLabel(traceEvents[compareIndex].offset)} · deterministic sandbox</span></div><button onClick={() => { setReplayOpen(false); setIsPlaying(false); }} className="text-slate-500 transition hover:text-slate-100"><X className="h-4 w-4" /></button></div>}
          </section>
        </div>
      </main>
    </div>
  );
}
