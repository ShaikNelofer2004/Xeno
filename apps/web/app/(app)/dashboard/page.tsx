"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  TrendingUp, Users, Megaphone, DollarSign, Zap, ArrowRight,
  ShoppingBag, Activity, Award, BarChart2, Target, ChevronUp,
} from "lucide-react";
import Link from "next/link";
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Stats {
  total: number; gold: number; silver: number; bronze: number;
  lapsed: number; total_revenue: number;
}
interface Campaign {
  id: string; name: string; channel: string; status: string;
  total_recipients: number; launched_at: string | null;
}
interface CommStats {
  total: number; delivered_total: number; delivery_rate: number;
  open_rate: number; click_rate: number;
  orders_placed: number; revenue_attributed: number;
}

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: "#25d366", sms: "#f59e0b", email: "#3b82f6", rcs: "#8b5cf6",
};
const CHANNEL_EMOJI: Record<string, string> = {
  whatsapp: "", sms: "", email: "", rcs: "",
};

function Sparkline({ color }: { color: string }) {
  const data = Array.from({ length: 10 }, (_, i) => ({
    v: 30 + Math.sin(i * 0.8) * 20 + Math.random() * 15,
  }));
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
          fill={`url(#sg-${color.replace("#", "")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const TIER_DATA = (s: Stats) => [
  { name: "Gold",   value: s.gold,   color: "#f59e0b", pct: Math.round((s.gold   / s.total) * 100) },
  { name: "Silver", value: s.silver, color: "#94a3b8", pct: Math.round((s.silver / s.total) * 100) },
  { name: "Bronze", value: s.bronze, color: "#c97c3a", pct: Math.round((s.bronze / s.total) * 100) },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? "var(--color-text-secondary)" }}>
          {p.name}: <strong>{p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [commStats, setCommStats] = useState<CommStats | null>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();

  useEffect(() => {
    Promise.all([
      api.get<Stats>("/api/customers/stats"),
      api.get<Campaign[]>("/api/campaigns"),
    ])
      .then(([s, c]) => {
        setStats(s);
        setCampaigns(c);
        // Aggregate comm stats from all campaigns that have stats
        const launched = c.filter(x => x.status === "launched");
        if (launched.length > 0) {
          Promise.all(launched.slice(0, 8).map(camp =>
            api.get<CommStats>(`/api/campaigns/${camp.id}/stats`).catch(() => null)
          )).then(results => {
            const valid = results.filter(Boolean) as CommStats[];
            if (valid.length) {
              const agg: CommStats = {
                total: valid.reduce((a, b) => a + b.total, 0),
                delivered_total: valid.reduce((a, b) => a + (b.delivered_total ?? 0), 0),
                delivery_rate: Math.round(valid.reduce((a, b) => a + b.delivery_rate, 0) / valid.length),
                open_rate: Math.round(valid.reduce((a, b) => a + b.open_rate, 0) / valid.length),
                click_rate: Math.round(valid.reduce((a, b) => a + b.click_rate, 0) / valid.length),
                orders_placed: valid.reduce((a, b) => a + b.orders_placed, 0),
                revenue_attributed: valid.reduce((a, b) => a + b.revenue_attributed, 0),
              };
              setCommStats(agg);
            }
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalCampaigns   = campaigns.length;
  const activeCampaigns  = campaigns.filter(c => c.status === "launched").length;
  const recent5          = campaigns.slice(0, 5);

  // Channel breakdown from campaigns
  const channelBreakdown = Object.entries(
    campaigns.reduce((acc, c) => {
      acc[c.channel] = (acc[c.channel] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([ch, count]) => ({ name: ch, count, color: CHANNEL_COLOR[ch] ?? "#6366f1" }));

  // Campaign recipients area data (last 8)
  const reachData = [...campaigns].slice(0, 8).reverse().map((c, i) => ({
    name: `C${i + 1}`,
    label: c.name.slice(0, 14),
    recipients: c.total_recipients ?? 0,
    channel: c.channel,
  }));

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="skeleton" style={{ width: 180, height: 28, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 240, height: 16 }} />
          </div>
          <div className="skeleton" style={{ width: 140, height: 40, borderRadius: 10 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 300 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>Dashboard</h1>
            <span style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
              LIVE
            </span>
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
            Brewhaus Coffee · {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/campaigns" className="btn btn-ghost" style={{ fontSize: 13 }}>
            <BarChart2 size={14} /> All Campaigns
          </Link>
          <Link href="/agent" className="btn btn-primary" style={{ fontSize: 13 }}>
            <Zap size={14} /> AI Agent
          </Link>
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          {
            label:    "Total Customers",
            value:    stats?.total?.toLocaleString() ?? "—",
            sub:      `${stats?.gold ?? 0} gold · ${stats?.silver ?? 0} silver`,
            icon:     Users,
            color:    "#6366f1",
            change:   "+12%",
            positive: true,
          },
          {
            label:    "Lapsed (60d+)",
            value:    stats?.lapsed?.toLocaleString() ?? "—",
            sub:      "Need re-engagement",
            icon:     Activity,
            color:    "#ef4444",
            change:   "-3%",
            positive: false,
          },
          {
            label:    "Campaigns",
            value:    totalCampaigns,
            sub:      `${activeCampaigns} active`,
            icon:     Megaphone,
            color:    "#10b981",
            change:   `+${activeCampaigns}`,
            positive: true,
          },
          {
            label:    "Total Revenue",
            value:    stats?.total_revenue
                        ? `₹${(stats.total_revenue / 1000).toFixed(0)}k`
                        : "—",
            sub:      "Lifetime spend",
            icon:     DollarSign,
            color:    "#f59e0b",
            change:   "+8%",
            positive: true,
          },
        ].map(({ label, value, sub, icon: Icon, color, change, positive }) => (
          <div key={label} style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            padding: "20px 20px 14px",
            position: "relative",
            overflow: "hidden",
            transition: "transform 0.2s, box-shadow 0.2s",
            cursor: "default",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            {/* Glow orb */}
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${color}18`, filter: "blur(12px)", pointerEvents: "none" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ background: `${color}18`, borderRadius: 12, padding: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={20} color={color} />
              </div>
              <span style={{
                display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700,
                color: positive ? "#10b981" : "#ef4444",
                background: positive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                padding: "3px 8px", borderRadius: 99,
              }}>
                <ChevronUp size={10} style={{ transform: positive ? "none" : "rotate(180deg)" }} />
                {change}
              </span>
            </div>

            <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.5px", lineHeight: 1, marginBottom: 4 }}>
              {value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{sub}</div>

          </div>
        ))}
      </div>

      {/* ── Engagement Stats Row (if data) ─────────────────────────── */}
      {commStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Avg Delivery Rate", value: `${commStats.delivery_rate ?? 0}%`, color: "#10b981", Icon: Activity },
            { label: "Avg Open Rate",     value: `${commStats.open_rate ?? 0}%`,     color: "#3b82f6", Icon: TrendingUp },
            { label: "Avg Click Rate",    value: `${commStats.click_rate ?? 0}%`,    color: "#8b5cf6", Icon: BarChart2 },
            { label: "Orders Placed",     value: commStats.orders_placed ?? 0,       color: "#f59e0b", Icon: ShoppingBag },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{
              background: `${color}0d`,
              border: `1px solid ${color}25`,
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{ background: `${color}15`, borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts Row ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr", gap: 16 }}>

        {/* Campaign Reach Area Chart */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "20px 20px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>Campaign Reach</h2>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>Recipients per campaign</p>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", background: "var(--color-surface-2)", padding: "4px 10px", borderRadius: 99 }}>
              Last {reachData.length}
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reachData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="recipients" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#areaGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#6366f1" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Tier Donut */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "20px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Customer Tiers</h2>
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 16 }}>Distribution by loyalty</p>

          <div style={{ height: 160 }}>
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={TIER_DATA(stats)} cx="50%" cy="50%"
                    innerRadius={48} outerRadius={70}
                    paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                    {TIER_DATA(stats).map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {stats && TIER_DATA(stats).map(t => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{t.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>{t.value.toLocaleString()}</span>
                  <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{t.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Distribution */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "20px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Channels Used</h2>
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 20 }}>Campaign distribution</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {channelBreakdown.length > 0 ? channelBreakdown.map(ch => {
              const pct = Math.round((ch.count / totalCampaigns) * 100);
              return (
                <div key={ch.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {CHANNEL_EMOJI[ch.name] !== undefined && CHANNEL_EMOJI[ch.name] !== "" && <span style={{ fontSize: 14 }}>{CHANNEL_EMOJI[ch.name]}</span>}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{ch.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ch.color }}>{ch.count}</span>
                  </div>
                  <div style={{ background: "var(--color-surface-2)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: ch.color, borderRadius: 99, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              );
            }) : (
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                No campaigns yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Campaigns Table ──────────────────────────────────── */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Recent Campaigns</h2>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{totalCampaigns} total campaigns</p>
          </div>
          <Link href="/campaigns" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {recent5.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            No campaigns yet.{" "}
            <Link href="/agent" style={{ color: "#6366f1", fontWeight: 600 }}>Start the AI agent →</Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)" }}>
                {["Campaign", "Channel", "Recipients", "Status", "Launched", ""].map(h => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent5.map((c, i) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--color-border)", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--color-surface-2)"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {c.name}
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                      color: CHANNEL_COLOR[c.channel] ?? "#6366f1",
                      background: `${CHANNEL_COLOR[c.channel] ?? "#6366f1"}15`,
                      padding: "3px 10px", borderRadius: 99,
                    }}>
                      {c.channel}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>
                    {c.total_recipients?.toLocaleString() ?? "—"}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--color-text-muted)" }}>
                    {c.launched_at ? new Date(c.launched_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <Link href={`/campaigns/${c.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6366f1", fontWeight: 600, textDecoration: "none", opacity: 0.7 }}>
                      View <ArrowRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {[
          { href: "/agent",     icon: Zap,       label: "Run AI Agent",        sub: "Launch a new campaign",        color: "#6366f1" },
          { href: "/segments",  icon: Target,    label: "Manage Segments",      sub: "View customer groups",         color: "#10b981" },
          { href: "/customers", icon: Award,     label: "Customer Insights",    sub: "Explore your customer base",   color: "#f59e0b" },
        ].map(({ href, icon: Icon, label, sub, color }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 14, padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 14,
              transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
              cursor: "pointer",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(-2px)";
                el.style.boxShadow = `0 8px 24px ${color}20`;
                el.style.borderColor = `${color}50`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
                el.style.borderColor = "var(--color-border)";
              }}
            >
              <div style={{ background: `${color}15`, borderRadius: 12, padding: 12, flexShrink: 0 }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>
              </div>
              <ArrowRight size={14} color="var(--color-text-muted)" style={{ marginLeft: "auto" }} />
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
