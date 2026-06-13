"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { ArrowLeft, RefreshCw, Radio, MessageSquare, Smartphone, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface Stats {
  campaign_id: string; total: number; sent: number; delivered: number;
  failed: number; opened: number; read: number; clicked: number;
  delivered_total: number; delivery_rate: number; open_rate: number;
  click_rate: number; orders_placed: number; revenue_attributed: number;
}
interface Campaign {
  id: string; name: string; channel: string; status: string;
  message_template: string; launched_at: string | null;
}
interface Comm {
  id: string; status: string; message: string;
  customers: { name: string; tier: string; email?: string };
  sent_at: string | null; delivered_at: string | null;
  clicked_at: string | null; order_placed: boolean; order_value: number | null;
}

// Live event generated from diffs between polls
interface LiveEvent {
  id: string;
  customerName: string;
  tier: string;
  action: string;
  icon: string;
  color: string;
  ts: number;
  revenue?: number;
}

const STATUS_CONFIG: Record<string, { icon: string; color: string; label: string; bg: string }> = {
  queued:    { icon: "·",  color: "#94a3b8", label: "Queued",    bg: "rgba(148,163,184,0.12)" },
  sent:      { icon: "→",  color: "#6366f1", label: "Sent",      bg: "rgba(99,102,241,0.12)" },
  delivered: { icon: "✓",  color: "#3b82f6", label: "Delivered", bg: "rgba(59,130,246,0.12)" },
  opened:    { icon: "◉",  color: "#10b981", label: "Opened",    bg: "rgba(16,185,129,0.12)" },
  read:      { icon: "◉",  color: "#10b981", label: "Read",      bg: "rgba(16,185,129,0.12)" },
  clicked:   { icon: "↗",  color: "#f59e0b", label: "Clicked",   bg: "rgba(245,158,11,0.12)" },
  failed:    { icon: "✕",  color: "#ef4444", label: "Failed",    bg: "rgba(239,68,68,0.12)" },
};

/* ── Channel config for message preview ── */
const CH_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  whatsapp: { color: "#25d366", bg: "#e9fbe9", border: "#b7efca",  label: "WhatsApp" },
  sms:      { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a",  label: "SMS" },
  email:    { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",  label: "Email" },
  rcs:      { color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe",  label: "RCS" },
};

function ChannelIcon({ channel, size = 14 }: { channel: string; size?: number }) {
  if (channel === "whatsapp") return <MessageSquare size={size} />;
  if (channel === "sms")      return <Smartphone size={size} />;
  if (channel === "email")    return <Mail size={size} />;
  return <Sparkles size={size} />;
}

const FUNNEL = [
  { key: "sent_total",     label: "SENT",      color: "#6366f1" },
  { key: "delivered_total",label: "DELIVERED", color: "#3b82f6" },
  { key: "opened_total",   label: "OPENED",    color: "#10b981" },
  { key: "read_total",     label: "READ",      color: "#10b981" },
  { key: "clicked_total",  label: "CLICKED",   color: "#f59e0b" },
  { key: "failed",         label: "FAILED",    color: "#ef4444" },
];

// Monotonic counter — guarantees unique keys even if two events fire in the same ms
let _evtSeq = 0;

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [comms, setComms] = useState<Comm[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const prevCommsRef = useRef<Map<string, string>>(new Map());
  const feedRef = useRef<HTMLDivElement>(null);

  const generateEvents = useCallback((newComms: Comm[]) => {
    const prev = prevCommsRef.current;
    const newEvents: LiveEvent[] = [];

    for (const comm of newComms) {
      const prevStatus = prev.get(comm.id);
      if (prevStatus !== comm.status) {
        const cfg = STATUS_CONFIG[comm.status] ?? STATUS_CONFIG.sent;
        const isOrder = comm.order_placed && comm.status === "clicked";
        newEvents.push({
          id: `${comm.id}-${comm.status}-${++_evtSeq}`,
          customerName: comm.customers?.name ?? "Unknown",
          tier: comm.customers?.tier ?? "",
          action: cfg.label,
          icon: isOrder ? "💰" : cfg.icon,
          color: isOrder ? "#10b981" : cfg.color,
          ts: Date.now(),
          revenue: isOrder ? (comm.order_value ?? 0) : undefined,
        });
        prev.set(comm.id, comm.status);
      }
    }

    if (newEvents.length > 0) {
      setLiveEvents(prev => [...newEvents, ...prev].slice(0, 80));
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [camp, s, c] = await Promise.all([
        api.get<Campaign>(`/api/campaigns/${id}`),
        api.get<Stats>(`/api/campaigns/${id}/stats`),
        api.get<Comm[]>(`/api/campaigns/${id}/communications`),
      ]);
      setCampaign(camp);
      setStats(s);
      generateEvents(c);
      setComms(c);
    } catch (e) {
      console.error(e);
    }
  }, [id, generateEvents]);

  // Always poll every 2s when live. Stop after 40s of inactivity (no new events).
  const lastEventCountRef = useRef(0);
  const silentTicksRef = useRef(0);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      await fetchAll();
      // Track if new events are coming in
      if (liveEvents.length > lastEventCountRef.current) {
        lastEventCountRef.current = liveEvents.length;
        silentTicksRef.current = 0;
      } else {
        silentTicksRef.current += 1;
        // After 20 silent ticks (40s), stop live polling
        if (silentTicksRef.current > 20 && liveEvents.length > 0) {
          setIsLive(false);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchAll, isLive, liveEvents.length]);

  // Auto-scroll feed to top on new events
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [liveEvents.length]);

  if (!campaign || !stats) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 40, color: "var(--color-text-secondary)" }}>
        <div className="pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: "#6366f1" }} />
        Loading campaign…
      </div>
    );
  }

  const completedCount = comms.filter(c => ["clicked", "failed", "delivered", "opened", "read"].includes(c.status)).length;
  const progressPct = stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;
  const simDone = stats.total > 0 && (stats.sent + stats.delivered_total + stats.failed) >= stats.total && stats.sent === 0;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Link href="/campaigns" className="btn btn-ghost" style={{ padding: "7px 12px" }}>
          <ArrowLeft size={14} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{campaign.name}</h1>
            {isLive && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
                color: "#10b981", background: "rgba(16,185,129,0.12)", padding: "3px 10px", borderRadius: 99 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981",
                  display: "inline-block", animation: "pulse 1s infinite" }} />
                LIVE
              </span>
            )}
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginTop: 2 }}>
            {campaign.channel.toUpperCase()} · {stats.total} recipients
            {campaign.launched_at && ` · ${new Date(campaign.launched_at).toLocaleString("en-IN")}`}
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => setIsLive(l => !l)}
          style={{ padding: "7px 14px", gap: 6, color: isLive ? "#10b981" : "var(--color-text-muted)" }}
        >
          <Radio size={13} /> {isLive ? "Pause" : "Resume"}
        </button>
        <button className="btn btn-ghost" onClick={fetchAll} style={{ padding: "7px 12px" }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Simulation Progress Bar ── */}
      <div className="card" style={{ marginBottom: 20, padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>
            Channel Stub Simulation
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>{progressPct}% processed</span>
        </div>
        <div style={{ height: 10, background: "var(--color-surface-2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg, #6366f1, #10b981)",
            width: `${progressPct}%`,
            transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
            boxShadow: "0 0 10px rgba(99,102,241,0.4)",
          }} />
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: stats.total, color: "#6b7280" },
            { label: "Sent", value: stats.sent, color: "#6366f1" },
            { label: "Delivered", value: stats.delivered_total, color: "#3b82f6" },
            { label: "Opened/Read", value: stats.opened + stats.read, color: "#10b981" },
            { label: "Clicked", value: stats.clicked, color: "#f59e0b" },
            { label: "Failed", value: stats.failed, color: "#ef4444" },
            { label: "Orders", value: stats.orders_placed, color: "#10b981" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ fontSize: 12 }}>
              <span style={{ color: "var(--color-text-muted)" }}>{label}: </span>
              <span style={{ color, fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Message Template Preview ── */}
      {campaign.message_template && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16, overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderBottom: "1px solid var(--color-border)",
              background: `${CH_CFG[campaign.channel]?.color ?? "#6366f1"}08`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  background: CH_CFG[campaign.channel]?.color ?? "#6366f1",
                  borderRadius: 8, padding: 6, display: "flex",
                  color: "#fff",
                }}>
                  <ChannelIcon channel={campaign.channel} size={13} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
                    Message Template
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>
                    Sent via {CH_CFG[campaign.channel]?.label ?? campaign.channel.toUpperCase()} · {stats.total} recipients
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
                color: CH_CFG[campaign.channel]?.color ?? "#6366f1",
                background: `${CH_CFG[campaign.channel]?.color ?? "#6366f1"}15`,
                border: `1px solid ${CH_CFG[campaign.channel]?.border ?? "#6366f1"}`,
                padding: "3px 10px", borderRadius: 99,
              }}>
                {CH_CFG[campaign.channel]?.label ?? campaign.channel}
              </span>
            </div>

            {/* Bubble area */}
            <div style={{
              padding: "20px 24px",
              background: campaign.channel === "whatsapp"
                ? "linear-gradient(180deg, #e5ddd5 0%, #ece5dd 100%)"
                : campaign.channel === "email"
                ? "linear-gradient(180deg, #f8faff 0%, #f0f4ff 100%)"
                : "var(--color-surface-2)",
            }}>
              {/* Sender chip */}
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: "#888", background: "rgba(0,0,0,0.06)", padding: "3px 12px", borderRadius: 99 }}>
                  {campaign.channel === "whatsapp" ? "Business Message" :
                   campaign.channel === "email" ? "From: noreply@brewhaus.com" : "SMS from Brewhaus"}
                </span>
              </div>

              {/* Message bubble */}
              <div style={{ maxWidth: 420, marginLeft: campaign.channel === "email" ? "auto" : undefined, marginRight: "auto" }}>
                <div style={{
                  background: campaign.channel === "whatsapp" ? "#fff" :
                              campaign.channel === "email" ? "#fff" :
                              CH_CFG[campaign.channel]?.bg ?? "#fff",
                  border: `1px solid ${CH_CFG[campaign.channel]?.border ?? "#e2e8f0"}`,
                  borderRadius: campaign.channel === "whatsapp" ? "0 14px 14px 14px" : 14,
                  padding: "14px 18px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  position: "relative",
                }}>
                  {campaign.channel === "whatsapp" && (
                    <div style={{
                      position: "absolute", top: 0, left: -8,
                      width: 0, height: 0,
                      borderTop: "8px solid #fff",
                      borderLeft: "8px solid transparent",
                    }} />
                  )}
                  {campaign.channel === "email" && (
                    <div style={{ borderBottom: "1px solid #e2e8f0", marginBottom: 12, paddingBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Subject: {campaign.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>To: customer@example.com</div>
                    </div>
                  )}
                  <p style={{
                    fontSize: 13, lineHeight: 1.65, color: "#1a1a1a",
                    margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {campaign.message_template}
                  </p>
                  <div style={{ fontSize: 10, color: "#aaa", textAlign: "right", marginTop: 8 }}>
                    {campaign.launched_at ? new Date(campaign.launched_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                    {campaign.channel === "whatsapp" && " ✓✓"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Delivery Rate", value: `${stats.delivery_rate}%`, color: "#6366f1" },
          { label: "Open/Read Rate", value: `${stats.open_rate}%`, color: "#10b981" },
          { label: "Click Rate", value: `${stats.click_rate}%`, color: "#f59e0b" },
          { label: "Orders", value: stats.orders_placed, color: "#3b82f6" },
          { label: "Revenue", value: `₹${stats.revenue_attributed.toLocaleString()}`, color: "#a78bfa" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card card-sm">
            <div className="stat-value" style={{ fontSize: 22, color }}>{value}</div>
            <div className="stat-label" style={{ fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Funnel + Live Event Feed ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Delivery Funnel */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Delivery Funnel</h2>
          <div className="funnel-bar-wrap">
            {FUNNEL.map(({ key, label, color }) => {
              const val = (stats as any)[key] as number ?? 0;
              const pct = stats.total > 0 ? (val / stats.total) * 100 : 0;
              return (
                <div key={key} className="funnel-row">
                  <span className="funnel-label">{label}</span>
                  <div className="funnel-track">
                    <div className="funnel-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="funnel-count">{val}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Event Feed */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: isLive ? "#10b981" : "#94a3b8",
                display: "inline-block", animation: isLive ? "pulse 1s infinite" : "none" }} />
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Live Simulation Feed</h2>
            </div>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{liveEvents.length} events</span>
          </div>
          <div ref={feedRef} style={{ maxHeight: 320, overflowY: "auto", padding: "8px 0" }}>
            {liveEvents.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                {isLive ? "Waiting for delivery events…" : "Simulation paused"}
              </div>
            ) : (
              liveEvents.map((ev, idx) => (
                <div
                  key={ev.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 20px",
                    borderBottom: "1px solid var(--color-border)",
                    background: idx === 0 ? `${ev.color}08` : "transparent",
                    animation: idx < 3 ? "slideInFeed 0.3s ease" : "none",
                    transition: "background 0.3s",
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: `${ev.color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                  }}>{ev.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                      {ev.customerName}
                      {ev.revenue && (
                        <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700, background: "rgba(16,185,129,0.12)", padding: "1px 7px", borderRadius: 99 }}>
                          +₹{ev.revenue}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: ev.color, fontWeight: 600, marginTop: 1 }}>
                      {ev.action}
                      <span style={{ color: "var(--color-text-muted)", fontWeight: 400, marginLeft: 6 }}>
                        {new Date(ev.ts).toLocaleTimeString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                    background: `${ev.color}18`, color: ev.color, flexShrink: 0,
                    textTransform: "uppercase",
                  }}>{ev.tier}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── All Recipients Table ── */}
      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>All Recipients ({stats.total})</h2>
        <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Delivered</th>
                <th>Clicked</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {comms.map((c) => {
                const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.queued;
                return (
                  <tr key={c.id} style={{ transition: "background 0.3s" }}>
                    <td className="td-primary">{c.customers?.name}</td>
                    <td><span className={`badge badge-${c.customers?.tier}`}>{c.customers?.tier}</span></td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                        background: cfg.bg, color: cfg.color, textTransform: "uppercase",
                      }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{c.sent_at ? new Date(c.sent_at).toLocaleTimeString("en-IN") : "—"}</td>
                    <td style={{ fontSize: 12 }}>{c.delivered_at ? new Date(c.delivered_at).toLocaleTimeString("en-IN") : "—"}</td>
                    <td style={{ fontSize: 12 }}>{c.clicked_at ? new Date(c.clicked_at).toLocaleTimeString("en-IN") : "—"}</td>
                    <td>
                      {c.order_placed
                        ? <span style={{ color: "#10b981", fontWeight: 700 }}>₹{c.order_value}</span>
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes slideInFeed {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
