/*
 * Chronos design reminder: Instrument Panel Dossier. This data contract mirrors a forensic trace archive:
 * semantic event labels, precise offsets, and flat variable paths that can be compared without visual guesswork.
 */

export type EventKind = "checkpoint" | "mutation" | "request" | "exception" | "query" | "message";
export type SnapshotValue = string | number | boolean | null;
export type Snapshot = Record<string, SnapshotValue>;

export type TraceEvent = {
  id: string;
  offset: number;
  label: string;
  detail: string;
  kind: EventKind;
  lane: number;
  snapshot: Snapshot;
};

export type TraceRecord = {
  id: string;
  traceNumber: number;
  title: string;
  summary: string;
  service: string;
  route: string;
  environment: string;
  status: number;
  durationMs: number;
  capturedAt: string;
  severity: "nominal" | "watch" | "critical";
  host: string;
  events: TraceEvent[];
};

const baseState: Snapshot = {
  "order.subtotal": "0.00",
  "order.discount": "0.00",
  "order.total": "0.00",
  "order.currency": "USD",
  "order.items": 3,
  "execution.paymentStatus": "pending",
  "execution.invariant": "pending",
};

function state(overrides: Snapshot): Snapshot {
  return { ...baseState, ...overrides };
}

function event(
  id: string,
  offset: number,
  label: string,
  detail: string,
  kind: EventKind,
  lane: number,
  snapshot: Snapshot,
): TraceEvent {
  return { id, offset, label, detail, kind, lane, snapshot };
}

const checkoutControlEvents: TraceEvent[] = [
  event("CTRL-0001", 0, "Request accepted", "POST /checkout", "request", 1, state({})),
  event("CTRL-0002", 390, "Cart hydrated", "cart.items → 3", "mutation", 2, state({ "order.subtotal": "128.50" })),
  event("CTRL-0003", 780, "Pricing snapshot", "currency = USD", "checkpoint", 1, state({ "order.subtotal": "128.50", "order.currency": "USD" })),
  event("CTRL-0004", 1180, "Inventory query", "sku: WD-4831", "query", 3, state({ "order.subtotal": "128.50", "order.currency": "USD" })),
  event("CTRL-0005", 1610, "Tax resolver", "region = US-CA", "mutation", 2, state({ "order.subtotal": "128.50", "order.currency": "USD" })),
  event("CTRL-0006", 2040, "Promotion applied", "discount → -15.00", "mutation", 1, state({ "order.subtotal": "113.50", "order.discount": "-15.00", "order.total": "123.78", "order.currency": "USD" })),
  event("CTRL-0007", 2490, "Receipt prepared", "receipt.total = 123.78", "checkpoint", 3, state({ "order.subtotal": "113.50", "order.discount": "-15.00", "order.total": "123.78", "execution.invariant": "satisfied" })),
  event("CTRL-0008", 2860, "Payment intent", "amount = 123.78", "request", 2, state({ "order.subtotal": "113.50", "order.discount": "-15.00", "order.total": "123.78", "execution.invariant": "satisfied" })),
  event("CTRL-0009", 3240, "Ledger write", "transaction captured", "message", 1, state({ "order.subtotal": "113.50", "order.discount": "-15.00", "order.total": "123.78", "execution.paymentStatus": "captured", "execution.invariant": "satisfied" })),
  event("CTRL-0010", 3540, "Response serialized", "status = 200", "checkpoint", 2, state({ "order.subtotal": "113.50", "order.discount": "-15.00", "order.total": "123.78", "execution.paymentStatus": "captured", "execution.invariant": "satisfied" })),
];

const checkoutDriftEvents: TraceEvent[] = [
  ...checkoutControlEvents.slice(0, 5).map((item) => ({ ...item, id: item.id.replace("CTRL", "EVT") })),
  event("EVT-0006", 2210, "Promotion applied", "discount → -30.00", "mutation", 1, state({ "order.subtotal": "98.50", "order.discount": "-30.00", "order.total": "108.78", "order.currency": "USD" })),
  event("EVT-0007", 2640, "Subtotal diverged", "expected 113.50 · got 98.50", "exception", 3, state({ "order.subtotal": "98.50", "order.discount": "-30.00", "order.total": "108.78", "execution.invariant": "failed" })),
  event("EVT-0008", 3060, "Payment intent", "amount = 98.50", "request", 2, state({ "order.subtotal": "98.50", "order.discount": "-30.00", "order.total": "108.78", "execution.invariant": "failed" })),
  event("EVT-0009", 3490, "Ledger write", "transaction pending", "message", 1, state({ "order.subtotal": "98.50", "order.discount": "-30.00", "order.total": "108.78", "execution.invariant": "failed" })),
  event("EVT-0010", 3910, "Invariant failed", "order.total ≠ receipt.total", "exception", 3, state({ "order.subtotal": "98.50", "order.discount": "-30.00", "order.total": "108.78", "execution.paymentStatus": "pending", "execution.invariant": "failed" })),
  event("EVT-0011", 4290, "Compensation", "payment intent canceled", "mutation", 2, state({ "order.subtotal": "98.50", "order.discount": "-30.00", "order.total": "108.78", "execution.paymentStatus": "canceled", "execution.invariant": "failed" })),
  event("EVT-0012", 4700, "Request completed", "status = 422", "checkpoint", 1, state({ "order.subtotal": "98.50", "order.discount": "-30.00", "order.total": "108.78", "execution.paymentStatus": "canceled", "execution.invariant": "failed" })),
];

const addressMismatchEvents: TraceEvent[] = [
  event("ADDR-0001", 0, "Request accepted", "POST /checkout", "request", 1, state({})),
  event("ADDR-0002", 420, "Cart hydrated", "cart.items → 3", "mutation", 2, state({ "order.subtotal": "128.50" })),
  event("ADDR-0003", 900, "Address normalized", "postal = 94107", "mutation", 1, state({ "order.subtotal": "128.50" })),
  event("ADDR-0004", 1320, "Tax resolver", "region = US-CA", "query", 3, state({ "order.subtotal": "128.50", "execution.invariant": "watch" })),
  event("ADDR-0005", 1740, "Tax mismatch", "expected 10.28 · got 0.00", "exception", 3, state({ "order.subtotal": "128.50", "order.total": "128.50", "execution.invariant": "failed" })),
  event("ADDR-0006", 2210, "Checkout held", "manual review required", "message", 2, state({ "order.subtotal": "128.50", "order.total": "128.50", "execution.invariant": "failed" })),
  event("ADDR-0007", 2880, "Request completed", "status = 409", "checkpoint", 1, state({ "order.subtotal": "128.50", "order.total": "128.50", "execution.invariant": "failed" })),
];

const paymentTimeoutEvents: TraceEvent[] = [
  event("PAY-0001", 0, "Request accepted", "POST /charge", "request", 1, state({})),
  event("PAY-0002", 510, "Intent hydrated", "amount = 75.00", "mutation", 2, state({ "order.total": "75.00" })),
  event("PAY-0003", 1210, "Risk query", "provider = atlas", "query", 3, state({ "order.total": "75.00" })),
  event("PAY-0004", 2460, "Provider timeout", "upstream > 2s", "exception", 3, state({ "order.total": "75.00", "execution.invariant": "watch" })),
  event("PAY-0005", 4080, "Retry scheduled", "attempt = 2", "message", 2, state({ "order.total": "75.00", "execution.invariant": "watch" })),
  event("PAY-0006", 6210, "Request completed", "status = 504", "checkpoint", 1, state({ "order.total": "75.00", "execution.invariant": "failed" })),
];

export const traceRecords: TraceRecord[] = [
  {
    id: "trace-1482",
    traceNumber: 1482,
    title: "Payment total drift in checkout flow",
    summary: "Promotion mutation reused a pre-discount subtotal.",
    service: "checkout-service",
    route: "POST /checkout",
    environment: "prod-us-east-1",
    status: 422,
    durationMs: 4700,
    capturedAt: "2 min ago",
    severity: "critical",
    host: "checkout-7f96c6b8d9-rp2lx",
    events: checkoutDriftEvents,
  },
  {
    id: "trace-1479",
    traceNumber: 1479,
    title: "Control checkout · promotion single-apply",
    summary: "Nominal baseline with the same cart and pricing inputs.",
    service: "checkout-service",
    route: "POST /checkout",
    environment: "prod-us-east-1",
    status: 200,
    durationMs: 3540,
    capturedAt: "7 min ago",
    severity: "nominal",
    host: "checkout-7f96c6b8d9-km4qf",
    events: checkoutControlEvents,
  },
  {
    id: "trace-1468",
    traceNumber: 1468,
    title: "Tax resolver returned an incomplete region",
    summary: "Address normalization completed, but the tax snapshot was empty.",
    service: "checkout-service",
    route: "POST /checkout",
    environment: "staging-us-west-2",
    status: 409,
    durationMs: 2880,
    capturedAt: "14 min ago",
    severity: "watch",
    host: "checkout-5c1e9a2f4f-j4s9m",
    events: addressMismatchEvents,
  },
  {
    id: "trace-1420",
    traceNumber: 1420,
    title: "Payment provider timeout after retry",
    summary: "Upstream risk provider exceeded the request budget twice.",
    service: "payments-service",
    route: "POST /charge",
    environment: "prod-eu-west-1",
    status: 504,
    durationMs: 6210,
    capturedAt: "31 min ago",
    severity: "critical",
    host: "payments-84a1c5d9b7-2kglx",
    events: paymentTimeoutEvents,
  },
];

export const defaultTraceId = traceRecords[0].id;
export const defaultCompareTraceId = traceRecords[1].id;

export const eventStyle: Record<EventKind, { fill: string; text: string; label: string }> = {
  checkpoint: { fill: "#35d6e8", text: "text-[#35d6e8]", label: "checkpoint" },
  mutation: { fill: "#86bd9a", text: "text-[#86bd9a]", label: "state mutation" },
  request: { fill: "#8e9ca5", text: "text-[#c7d0d4]", label: "request" },
  exception: { fill: "#f1b55a", text: "text-[#f1b55a]", label: "divergence" },
  query: { fill: "#9bb5ff", text: "text-[#9bb5ff]", label: "query" },
  message: { fill: "#c594eb", text: "text-[#c594eb]", label: "message" },
};

export function offsetLabel(offset: number) {
  return `+${(offset / 1000).toFixed(2)}s`;
}

export function formatDuration(durationMs: number) {
  return `${(durationMs / 1000).toFixed(2)}s`;
}

export function getTrace(id: string) {
  return traceRecords.find((trace) => trace.id === id) ?? traceRecords[0];
}

export function formatSnapshotValue(value: SnapshotValue | undefined) {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export const semanticEventCount = traceRecords.reduce((total, trace) => total + trace.events.length, 0);
