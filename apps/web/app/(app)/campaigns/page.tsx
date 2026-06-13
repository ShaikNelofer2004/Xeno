"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Megaphone, Zap, X, BarChart2, TrendingUp,
  CheckSquare, GitCompare, ArrowRight,
  FileText, Plus, Pencil, Trash2, Send, Loader2,
  Calendar, Filter, Square
} from "lucide-react";
import CampaignWizard from "./CampaignWizard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell,
  CartesianGrid, Legend,
} from "recharts";

/* ─── Types ──────────────────────────────────────────────────────── */
interface Campaign {
  id: string; name: string; channel: string; status: string;
  total_recipients: number; launched_at: string | null;
  message_template?: string;
  segment_id?: string;
  segments?: { name: string };
}
interface Segment {
  id: string; name: string; customer_count: number;
}
interface CampStats {
  id: string; name: string; channel: string;
  total: number; delivered_total: number;
  delivery_rate: number; open_rate: number; click_rate: number;
  orders_placed: number; revenue_attributed: number; failed: number;
}

/* ─── Constants ──────────────────────────────────────────────────── */
const CH_COLOR: Record<string, string> = { whatsapp: "#25d366", sms: "#f59e0b", email: "#3b82f6", rcs: "#8b5cf6" };
const CH_EMOJI: Record<string, string> = { whatsapp: "", sms: "", email: "", rcs: "" };
const COMPARE_PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a78bfa", "#3b82f6"];

/* ─── Tooltip ────────────────────────────────────────────────────── */
const CT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={`${p.name}-${i}`} style={{ color: p.fill ?? p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value?.toLocaleString()}{p.unit ?? ""}</strong>
        </div>
      ))}
    </div>
  );
};

/* ─── Generate Report Modal ─────────────────────────────────────── */
function GenerateReportModal({ allCampaigns, onClose }: { allCampaigns: Campaign[]; onClose: () => void }) {
  const now = new Date();
  const [filterType, setFilterType]     = useState<"all" | "date" | "month" | "year">("all");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [selMonth, setSelMonth]         = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [selYear, setSelYear]           = useState(String(now.getFullYear()));
  const [pickedIds, setPickedIds]       = useState<Set<string>>(new Set());
  const [report, setReport]             = useState<CampStats[] | null>(null);
  const [generating, setGenerating]     = useState(false);

  // Filter campaigns by date criteria
  const filtered = allCampaigns.filter(c => {
    if (!c.launched_at) return filterType === "all";
    const d = new Date(c.launched_at);
    if (filterType === "all")   return true;
    if (filterType === "date")  return (!dateFrom || d >= new Date(dateFrom)) && (!dateTo || d <= new Date(dateTo + "T23:59:59"));
    if (filterType === "month") return d.getFullYear() === Number(selYear) && (d.getMonth() + 1) === Number(selMonth);
    if (filterType === "year")  return d.getFullYear() === Number(selYear);
    return true;
  });

  const togglePick = (id: string) => setPickedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const pickAll   = () => setPickedIds(new Set(filtered.map(c => c.id)));
  const pickNone  = () => setPickedIds(new Set());

  const generate = async () => {
    const ids = pickedIds.size > 0 ? Array.from(pickedIds) : filtered.map(c => c.id);
    if (!ids.length) return;
    setGenerating(true);
    const results = await Promise.all(
      ids.map(id => {
        const camp = allCampaigns.find(c => c.id === id)!;
        return api.get<any>(`/api/campaigns/${id}/stats`)
          .then(s => ({ ...s, id, name: camp.name, channel: camp.channel }))
          .catch(() => null);
      })
    );
    setReport(results.filter(Boolean) as CampStats[]);
    setGenerating(false);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Aggregate totals
  const totals = report ? {
    revenue:  report.reduce((s, r) => s + r.revenue_attributed, 0),
    orders:   report.reduce((s, r) => s + r.orders_placed, 0),
    sent:     report.reduce((s, r) => s + r.total, 0),
    delivered:report.reduce((s, r) => s + r.delivered_total, 0),
    avgDel:   report.length ? Math.round(report.reduce((s, r) => s + r.delivery_rate, 0) / report.length) : 0,
    avgOpen:  report.length ? Math.round(report.reduce((s, r) => s + r.open_rate, 0) / report.length) : 0,
    avgClick: report.length ? Math.round(report.reduce((s, r) => s + r.click_rate, 0) / report.length) : 0,
  } : null;

  const revenueChartData = report?.map((r, i) => ({ name: r.name.slice(0, 16) + (r.name.length > 16 ? "…" : ""), revenue: r.revenue_attributed, orders: r.orders_placed, fill: COMPARE_PALETTE[i % COMPARE_PALETTE.length] })) ?? [];
  const rateChartData   = report?.map((r, i) => ({ name: r.name.slice(0, 12) + "…", delivery: r.delivery_rate, open: r.open_rate, click: r.click_rate, fill: COMPARE_PALETTE[i % COMPARE_PALETTE.length] })) ?? [];

  const YEARS  = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 50, animation: "fadeIn 0.2s ease" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(900px, 94vw)", background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)", zIndex: 60, overflowY: "auto", boxShadow: "-12px 0 60px rgba(0,0,0,0.15)", animation: "slideInPanel 0.28s ease", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(167,139,250,0.03))", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backdropFilter: "blur(12px)", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(99,102,241,0.12)", borderRadius: 10, padding: 8 }}><FileText size={18} color="#6366f1" /></div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Generate Campaign Report</h2>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>Filter by date · select campaigns · view analytics</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "8px 10px", cursor: "pointer", display: "flex" }}>
            <X size={15} color="var(--color-text-muted)" />
          </button>
        </div>

        <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Step 1 – Date filter */}
          <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Calendar size={14} color="#6366f1" />
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>Step 1 — Filter by Date</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {(["all", "date", "month", "year"] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)} style={{ fontSize: 12, fontWeight: 700, padding: "6px 16px", borderRadius: 99, cursor: "pointer", border: `1px solid ${filterType === t ? "#6366f1" : "var(--color-border)"}`, background: filterType === t ? "rgba(99,102,241,0.12)" : "var(--color-surface)", color: filterType === t ? "#6366f1" : "var(--color-text-secondary)", transition: "all 0.15s" }}>
                  {t === "all" ? "All Time" : t === "date" ? "Date Range" : t === "month" ? "By Month" : "By Year"}
                </button>
              ))}
            </div>

            {filterType === "date" && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 5 }}>FROM</label>
                  <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: 13 }} />
                </div>
                <div style={{ paddingTop: 20, color: "var(--color-text-muted)" }}>→</div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 5 }}>TO</label>
                  <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: 13 }} />
                </div>
              </div>
            )}
            {(filterType === "month" || filterType === "year") && (
              <div style={{ display: "flex", gap: 12 }}>
                {filterType === "month" && (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 5 }}>MONTH</label>
                    <select className="input" value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ fontSize: 13 }}>
                      {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 5 }}>YEAR</label>
                  <select className="input" value={selYear} onChange={e => setSelYear(e.target.value)} style={{ fontSize: 13 }}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Step 2 – Campaign picker */}
          <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Filter size={14} color="#6366f1" />
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)" }}>Step 2 — Select Campaigns</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={pickAll}  style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.1)", border: "none", padding: "4px 12px", borderRadius: 99, cursor: "pointer" }}>Select All ({filtered.length})</button>
                <button onClick={pickNone} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "4px 12px", borderRadius: 99, cursor: "pointer" }}>Clear</button>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-muted)", fontSize: 13 }}>No campaigns match this filter</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                {filtered.map((c, i) => {
                  const picked = pickedIds.has(c.id);
                  return (
                    <div key={c.id} onClick={() => togglePick(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, cursor: "pointer", background: picked ? "rgba(99,102,241,0.07)" : "var(--color-surface)", border: `1px solid ${picked ? "rgba(99,102,241,0.3)" : "var(--color-border)"}`, transition: "all 0.15s" }}>
                      {picked ? <CheckSquare size={15} color="#6366f1" /> : <Square size={15} color="var(--color-border)" />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: picked ? "#6366f1" : "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                          {c.channel} · {c.total_recipients} recipients
                          {c.launched_at ? " · " + new Date(c.launched_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: CH_COLOR[c.channel] ?? "#6366f1", background: `${CH_COLOR[c.channel] ?? "#6366f1"}15`, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", flexShrink: 0 }}>{c.channel}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--color-text-muted)" }}>
              {pickedIds.size > 0 ? `${pickedIds.size} selected` : `All ${filtered.length} campaigns will be included`}
            </div>
          </div>

          {/* Generate button */}
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={generating || filtered.length === 0}
            style={{ width: "100%", fontSize: 14, fontWeight: 700, padding: "14px", borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", boxShadow: "0 4px 20px rgba(99,102,241,0.3)", cursor: generating ? "not-allowed" : "pointer" }}
          >
            {generating ? "Generating…" : `Generate Report for ${pickedIds.size > 0 ? pickedIds.size : filtered.length} Campaign${(pickedIds.size || filtered.length) !== 1 ? "s" : ""}`}
          </button>

          {/* ── Report Output ─── */}
          {report && totals && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ height: 1, background: "var(--color-border)" }} />
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart2 size={14} color="#6366f1" /> Report — {report.length} Campaign{report.length !== 1 ? "s" : ""}
              </div>

              {/* KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label: "Total Revenue",   value: `₹${totals.revenue.toLocaleString()}`,  color: "#6366f1" },
                  { label: "Total Orders",    value: totals.orders,                           color: "#10b981" },
                  { label: "Messages Sent",   value: totals.sent.toLocaleString(),            color: "#f59e0b" },
                  { label: "Avg Delivery",    value: `${totals.avgDel}%`,                     color: "#a78bfa" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}25`, borderRadius: 12, padding: "14px" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Revenue per Campaign</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 14 }}>₹ attributed revenue</div>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChartData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CT />} />
                        <Bar dataKey="revenue" radius={[6,6,0,0]} barSize={32}>
                          {revenueChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Engagement Rates</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 14 }}>Delivery · Open · Click %</div>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rateChartData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} domain={[0,100]} tickFormatter={v => `${v}%`} />
                        <Tooltip content={<CT />} />
                        <Bar dataKey="delivery" fill="#6366f1" radius={[4,4,0,0]} barSize={14} name="Delivery %" />
                        <Bar dataKey="open"     fill="#10b981" radius={[4,4,0,0]} barSize={14} name="Open %" />
                        <Bar dataKey="click"    fill="#f59e0b" radius={[4,4,0,0]} barSize={14} name="Click %" />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Per-campaign table */}
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-2)", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Detailed Breakdown</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface-2)" }}>
                        {["Campaign","Channel","Sent","Delivered","Del%","Open%","Click%","Orders","Revenue"].map(h => (
                          <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</td>
                          <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, color: CH_COLOR[r.channel] ?? "#6366f1", background: `${CH_COLOR[r.channel] ?? "#6366f1"}15`, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase" }}>{r.channel}</span></td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>{r.total.toLocaleString()}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>{r.delivered_total.toLocaleString()}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{r.delivery_rate}%</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#10b981" }}>{r.open_rate}%</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{r.click_rate}%</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600 }}>{r.orders_placed}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 800, color: COMPARE_PALETTE[i % COMPARE_PALETTE.length] }}>₹{r.revenue_attributed.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr style={{ background: "rgba(99,102,241,0.04)", fontWeight: 800 }}>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800, color: "var(--color-text-primary)" }} colSpan={2}>TOTAL</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800 }}>{totals.sent.toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800 }}>{totals.delivered.toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800, color: "#6366f1" }}>{totals.avgDel}%</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800, color: "#10b981" }}>{totals.avgOpen}%</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>{totals.avgClick}%</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800 }}>{totals.orders}</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 900, color: "#6366f1" }}>₹{totals.revenue.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInPanel { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

/* ─── Compare modal ──────────────────────────────────────────────── */
function CompareModal({ ids, campaigns, onClose }: { ids: string[]; campaigns: Campaign[]; onClose: () => void }) {
  const [stats, setStats] = useState<CampStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const selectedCamps = campaigns.filter(c => ids.includes(c.id));
    Promise.all(
      selectedCamps.map(c =>
        api.get<any>(`/api/campaigns/${c.id}/stats`)
          .then(s => ({ ...s, id: c.id, name: c.name, channel: c.channel }))
          .catch(() => null)
      )
    ).then(results => {
      setStats(results.filter(Boolean) as CampStats[]);
    }).finally(() => setLoading(false));

    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* Build chart data — use campaign id as dataKey to avoid duplicate name collisions */
  const rateData = [
    { metric: "Delivery %", unit: "%" },
    { metric: "Open %",     unit: "%" },
    { metric: "Click %",    unit: "%" },
  ].map(row => {
    const obj: any = { metric: row.metric, unit: row.unit };
    stats.forEach(s => { obj[`c_${s.id.slice(0, 8)}`] = row.metric === "Delivery %" ? s.delivery_rate : row.metric === "Open %" ? s.open_rate : s.click_rate; });
    return obj;
  });

  const revenueData = stats.map((s, i) => ({
    name: s.name.slice(0, 18) + (s.name.length > 18 ? "…" : ""),
    revenue: s.revenue_attributed,
    orders: s.orders_placed,
    fill: COMPARE_PALETTE[i % COMPARE_PALETTE.length],
  }));

  const funnelData = stats.map((s, i) => ({
    name: s.name.slice(0, 14) + (s.name.length > 14 ? "…" : ""),
    Sent:      s.total,
    Delivered: s.delivered_total,
    Orders:    s.orders_placed,
    fill: COMPARE_PALETTE[i % COMPARE_PALETTE.length],
  }));

  const winner = stats.length > 0
    ? stats.reduce((best, s) => s.revenue_attributed > best.revenue_attributed ? s : best, stats[0])
    : null;

  const metricKeys: Array<{ key: keyof CampStats; label: string; fmt: (v: number) => string }> = [
    { key: "delivery_rate",      label: "Delivery Rate",  fmt: v => `${v}%`  },
    { key: "open_rate",          label: "Open Rate",      fmt: v => `${v}%`  },
    { key: "click_rate",         label: "Click Rate",     fmt: v => `${v}%`  },
    { key: "orders_placed",      label: "Orders",         fmt: v => `${v}`   },
    { key: "revenue_attributed", label: "Revenue",        fmt: v => `₹${v.toLocaleString()}` },
    { key: "total",              label: "Recipients",     fmt: v => `${v.toLocaleString()}` },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 50, animation: "fadeIn 0.2s ease" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(820px, 90vw)",
        background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)",
        zIndex: 60, overflowY: "auto", boxShadow: "-12px 0 60px rgba(0,0,0,0.15)",
        animation: "slideInPanel 0.28s ease",
      }}>

        {/* Header */}
        <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(167,139,250,0.03))", position: "sticky", top: 0, backdropFilter: "blur(12px)", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(99,102,241,0.12)", borderRadius: 10, padding: 8 }}>
              <GitCompare size={18} color="#6366f1" />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Campaign Comparison</h2>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{ids.length} campaigns selected</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "8px 10px", cursor: "pointer", display: "flex" }}>
            <X size={15} color="var(--color-text-muted)" />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
          </div>
        ) : (
          <div style={{ padding: "24px" }}>

            {/* Winner Banner */}
            {winner && (
              <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.06))", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 14, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981" }}>★</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>Top Performer</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--color-text-primary)", marginTop: 2 }}>{winner.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>
                    ₹{winner.revenue_attributed.toLocaleString()} revenue · {winner.orders_placed} orders · {winner.delivery_rate}% delivery
                  </div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#10b981" }}>₹{winner.revenue_attributed.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Highest revenue</div>
                </div>
              </div>
            )}

            {/* Metrics Table */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Side-by-Side Metrics</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface-2)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--color-border)" }}>Metric</th>
                      {stats.map((s, i) => (
                        <th key={s.id} style={{ padding: "10px 16px", textAlign: "center", fontSize: 11, fontWeight: 700, color: COMPARE_PALETTE[i % COMPARE_PALETTE.length], textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>
                          {s.name.slice(0, 20)}{s.name.length > 20 ? "…" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricKeys.map(({ key, label, fmt }) => {
                      const values = stats.map(s => s[key] as number);
                      const best = Math.max(...values);
                      return (
                        <tr key={label} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>{label}</td>
                          {stats.map((s, i) => {
                            const val = s[key] as number;
                            const isBest = val === best && values.filter(v => v === best).length === 1;
                            return (
                              <td key={s.id} style={{ padding: "12px 16px", textAlign: "center" }}>
                                <span style={{
                                  fontSize: 14, fontWeight: isBest ? 800 : 600,
                                  color: isBest ? COMPARE_PALETTE[i % COMPARE_PALETTE.length] : "var(--color-text-primary)",
                                  background: isBest ? `${COMPARE_PALETTE[i % COMPARE_PALETTE.length]}12` : "transparent",
                                  padding: isBest ? "3px 10px" : "3px 10px",
                                  borderRadius: 99,
                                  display: "inline-block",
                                }}>
                                  {fmt(val)}{isBest ? " ★" : ""}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Revenue Chart */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "18px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Revenue Attributed</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 16 }}>₹ generated per campaign</div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CT />} />
                      <Bar dataKey="revenue" radius={[6,6,0,0]} barSize={36}>
                        {revenueData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "18px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Engagement Rates</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 16 }}>Delivery, Open & Click %</div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rateData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="metric" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<CT />} />
                      {stats.map((s, i) => (
                        <Bar key={s.id} dataKey={`c_${s.id.slice(0, 8)}`} name={s.name.slice(0, 18)} fill={COMPARE_PALETTE[i % COMPARE_PALETTE.length]} radius={[4,4,0,0]} barSize={20} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Delivery Funnel */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Delivery Funnel</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 16 }}>Sent → Delivered → Orders</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="Sent"      fill="#6366f1" radius={[3,3,0,0]} barSize={16} />
                    <Bar dataKey="Delivered" fill="#10b981" radius={[3,3,0,0]} barSize={16} />
                    <Bar dataKey="Orders"    fill="#f59e0b" radius={[3,3,0,0]} barSize={16} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInPanel { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

/* ─── Campaign Form Modal (Create / Edit) ───────────────────────── */
const CHANNELS = ["whatsapp", "sms", "email", "rcs"] as const;
const CH_COLOR_MAP: Record<string, string> = { whatsapp: "#25d366", sms: "#f59e0b", email: "#3b82f6", rcs: "#8b5cf6" };

function CampaignFormModal({
  campaign, segments, onClose, onSaved,
}: {
  campaign: Campaign | null;
  segments: Segment[];
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}) {
  const isEdit = !!campaign;
  const [name, setName]               = useState(campaign?.name ?? "");
  const [segmentId, setSegmentId]     = useState(campaign?.segment_id ?? "");
  const [channel, setChannel]         = useState<string>(campaign?.channel ?? "whatsapp");
  const [template, setTemplate]       = useState(campaign?.message_template ?? "");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSave = async () => {
    if (!name.trim() || !segmentId || !template.trim()) {
      setError("Name, segment, and message template are required."); return;
    }
    setSaving(true); setError("");
    try {
      const body = { name: name.trim(), segment_id: segmentId, channel, message_template: template.trim() };
      const result = isEdit
        ? await api.patch<Campaign>(`/api/campaigns/${campaign!.id}`, body)
        : await api.post<Campaign>("/api/campaigns", body);
      onSaved(result);
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const insertVar = (v: string) => setTemplate(t => t + `{${v}}`);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-surface)", borderRadius: 20, width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, padding: 8, display: "flex" }}>
              <Megaphone size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>{isEdit ? "Edit Campaign" : "New Campaign"}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{isEdit ? "Update draft campaign details" : "Create a draft — launch when ready"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Campaign Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Win-back June 2026"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 13, background: "var(--color-surface-2)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Segment */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Target Segment</label>
            <select
              value={segmentId} onChange={e => setSegmentId(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 13, background: "var(--color-surface-2)", color: "var(--color-text-primary)", outline: "none", cursor: "pointer" }}
            >
              <option value="">-- Select a segment --</option>
              {segments.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.customer_count} members)</option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Channel</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CHANNELS.map(ch => (
                <button key={ch} onClick={() => setChannel(ch)} style={{
                  padding: "7px 16px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                  background: channel === ch ? CH_COLOR_MAP[ch] : "var(--color-surface-2)",
                  color: channel === ch ? "#fff" : "var(--color-text-secondary)",
                  border: `1px solid ${channel === ch ? CH_COLOR_MAP[ch] : "var(--color-border)"}`,
                  textTransform: "uppercase",
                }}>{ch}</button>
              ))}
            </div>
          </div>

          {/* Template */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message Template</label>
            <textarea
              value={template} onChange={e => setTemplate(e.target.value)}
              rows={5}
              placeholder="Hi {name}, as a {tier} member you get an exclusive offer! Reply to claim."
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 13, background: "var(--color-surface-2)", color: "var(--color-text-primary)", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginRight: 4 }}>Insert variable:</span>
              {["name", "tier", "total_spent"].map(v => (
                <button key={v} onClick={() => insertVar(v)} style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, border: "1px solid var(--color-border)", background: "rgba(99,102,241,0.08)", color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>
                  {`{${v}}`}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
            border: "none", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : (isEdit ? <Pencil size={14} /> : <Plus size={14} />)}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Campaign"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

/* ─── Confirm Action Modals ─────────────────────────────────────── */
function ConfirmModal({
  title, description, confirmText, isDanger, loading, onClose, onConfirm
}: {
  title: string; description: string; confirmText: string; isDanger?: boolean;
  loading: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-surface)", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "24px 24px 16px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: isDanger ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            {isDanger ? <Trash2 size={24} color="#ef4444" /> : <Send size={24} color="#10b981" />}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{description}</p>
        </div>
        <div style={{ padding: "16px 24px", background: "var(--color-surface-2)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={loading} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: loading ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, background: isDanger ? "#ef4444" : "#10b981", border: "none", borderRadius: 10, padding: "8px 20px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {loading ? (isDanger ? "Deleting…" : "Launching…") : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
function CampaignsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initSegId = searchParams.get("segmentId");
  const initCustId = searchParams.get("customerId");
  const initCustIds = searchParams.get("customerIds");

  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [segments, setSegments]     = useState<Segment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [comparing, setComparing]   = useState(false);
  const [reporting, setReporting]   = useState(false);
  const [formOpen, setFormOpen]     = useState(false);
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if ((initSegId || initCustId || initCustIds) && !hasAutoOpened.current) {
      if (initSegId && segments.length === 0) return;
      hasAutoOpened.current = true;
      setFormOpen(true);
    }
  }, [initSegId, initCustId, initCustIds, segments.length]);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [launchTarget, setLaunchTarget] = useState<Campaign | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionErr, setActionErr]   = useState("");

  const refresh = useCallback(() => {
    api.get<Campaign[]>("/api/campaigns").then(setCampaigns).catch(console.error);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<Campaign[]>("/api/campaigns"),
      api.get<Segment[]>("/api/segments"),
    ]).then(([camps, segs]) => { setCampaigns(camps); setSegments(segs); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelected(new Set());

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true); setActionErr("");
    try {
      await api.delete(`/api/campaigns/${deleteTarget.id}`);
      setCampaigns(prev => prev.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setActionErr(err.message ?? "Delete failed");
    } finally { setActionLoading(false); }
  };

  const executeLaunch = async () => {
    if (!launchTarget) return;
    setActionLoading(true); setActionErr("");
    try {
      await api.post(`/api/campaigns/${launchTarget.id}/send`, {});
      refresh();
      setLaunchTarget(null);
    } catch (err: any) {
      setActionErr(err.message ?? "Launch failed");
    } finally { setActionLoading(false); }
  };

  const handleSaved = (saved: Campaign, launched: boolean) => {
    setCampaigns(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...saved, status: launched ? "launched" : saved.status }; return next; }
      return [{ ...saved, status: launched ? "launched" : saved.status }, ...prev];
    });
    if (launched) refresh();
    setFormOpen(false); setEditTarget(null);
    if (initSegId || initCustId || initCustIds) {
      router.replace('/campaigns', { scroll: false });
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Campaigns</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
            {campaigns.length} total · <span style={{ color: "var(--color-text-muted)" }}>Select 2+ to compare</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setReporting(true)} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={14} /> Generate Report
          </button>
          {selected.size >= 2 && (
            <button className="btn btn-primary" onClick={() => setComparing(true)}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", boxShadow: "0 4px 16px rgba(99,102,241,0.3)", fontSize: 13 }}
            >
              <GitCompare size={14} /> Compare {selected.size} Campaigns
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => { setEditTarget(null); setFormOpen(true); }}
            style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--color-border)" }}
          >
            <Plus size={14} /> New Campaign
          </button>
          <Link href="/agent" className="btn btn-primary" style={{ fontSize: 13 }}>
            <Zap size={14} /> AI Agent
          </Link>
        </div>
      </div>

      {/* Action error banner */}
      {actionErr && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {actionErr}
          <button onClick={() => setActionErr("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", display: "flex" }}><X size={14} /></button>
        </div>
      )}

      {/* Selection bar */}
      {selected.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 16,
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12,
        }}>
          <CheckSquare size={15} color="#6366f1" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>{selected.size} campaign{selected.size > 1 ? "s" : ""} selected</span>
          {selected.size >= 2 && (
            <button onClick={() => setComparing(true)} style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", padding: "4px 12px", borderRadius: 99, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <BarChart2 size={12} /> Compare now
            </button>
          )}
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{selected.size < 2 ? "Select 1 more to compare" : "Ready to compare!"}</span>
          <button onClick={clearSelection} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <Megaphone size={40} color="var(--color-border)" style={{ margin: "0 auto 16px" }} />
          <div style={{ color: "var(--color-text-muted)", marginBottom: 16 }}>No campaigns yet</div>
          <Link href="/agent" className="btn btn-primary">Launch your first campaign →</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Segment</th>
                <th>Channel</th>
                <th>Recipients</th>
                <th>Status</th>
                <th>Launched</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    style={{ background: isSelected ? "rgba(99,102,241,0.04)" : "transparent", transition: "background 0.15s", cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 700, fontSize: 13, color: isSelected ? "#6366f1" : "var(--color-text-primary)" }}>
                      {c.name}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.segments?.name ?? "—"}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                        color: CH_COLOR[c.channel] ?? "#6366f1",
                        background: `${CH_COLOR[c.channel] ?? "#6366f1"}15`,
                        border: `1px solid ${CH_COLOR[c.channel] ?? "#6366f1"}30`,
                        padding: "3px 10px", borderRadius: 99,
                      }}>
                        {c.channel}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{c.total_recipients.toLocaleString()}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {c.launched_at ? new Date(c.launched_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                        <Link href={`/campaigns/${c.id}`} title="View details" style={{ display: "flex", alignItems: "center", padding: "5px 7px", borderRadius: 8, color: "#6366f1", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                          <ArrowRight size={13} />
                        </Link>
                        {c.status === "draft" && (
                          <>
                            <button title="Edit" onClick={e => { e.stopPropagation(); setEditTarget(c); setFormOpen(true); }}
                              style={{ display: "flex", alignItems: "center", padding: "5px 7px", borderRadius: 8, color: "#6366f1", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", cursor: "pointer" }}>
                              <Pencil size={13} />
                            </button>
                            <button title="Launch" onClick={e => { e.stopPropagation(); setLaunchTarget(c); }}
                              style={{ display: "flex", alignItems: "center", padding: "5px 7px", borderRadius: 8, color: "#10b981", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", cursor: "pointer" }}>
                              <Send size={13} />
                            </button>
                          </>
                        )}
                        <button title="Delete" onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}
                          style={{ display: "flex", alignItems: "center", padding: "5px 7px", borderRadius: 8, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {comparing && (
        <CompareModal ids={Array.from(selected)} campaigns={campaigns} onClose={() => setComparing(false)} />
      )}
      {reporting && (
        <GenerateReportModal allCampaigns={campaigns} onClose={() => setReporting(false)} />
      )}
      {formOpen && (
        <CampaignWizard
          campaign={editTarget}
          segments={segments.filter(s => !s.name.toLowerCase().startsWith("retry"))}
          initialSegmentId={initSegId || undefined}
          initialCustomerId={initCustId || undefined}
          initialCustomerIds={initCustIds ? initCustIds.split(",") : undefined}
          onClose={() => {
             setFormOpen(false); 
             setEditTarget(null);
             if (initSegId || initCustId || initCustIds) {
               router.replace('/campaigns', { scroll: false });
             }
          }}
          onSaved={handleSaved}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Campaign?"
          description={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmText="Yes, delete"
          isDanger
          loading={actionLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={executeDelete}
        />
      )}
      {launchTarget && (
        <ConfirmModal
          title="Launch Campaign?"
          description={`Are you sure you want to launch "${launchTarget.name}"? Messages will be queued and sent to all target customers immediately.`}
          confirmText="Yes, launch now"
          loading={actionLoading}
          onClose={() => setLaunchTarget(null)}
          onConfirm={executeLaunch}
        />
      )}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 14 }}>Loading campaigns...</div>}>
      <CampaignsPageContent />
    </Suspense>
  );
}
