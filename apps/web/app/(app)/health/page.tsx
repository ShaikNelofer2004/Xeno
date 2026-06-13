"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */
interface Customer {
  id: string; name: string; email: string; phone: string;
  tier: string; total_spent: number; total_orders: number;
  recency?: number; last_order_date?: string; city: string; joined_at: string;
}

const TIER_COLOR: Record<string, string> = { gold: "#f59e0b", silver: "#94a3b8", bronze: "#c97c3a", platinum: "#8b5cf6" };

/* ─── Helper Functions ───────────────────────────────────────────── */
function getHealthScore(c: Customer): number {
  let score = 0;
  const recency = c.recency ?? 999;
  if (recency <= 30) score += 40;
  else if (recency <= 60) score += 20;
  else if (recency <= 90) score += 5;

  if (c.total_spent >= 20000) score += 40;
  else if (c.total_spent >= 10000) score += 30;
  else score += 10;

  if (c.total_orders >= 5) score += 20;
  else if (c.total_orders >= 2) score += 10;
  else score += 5;

  return Math.min(100, score);
}

function getHealthStatus(score: number) {
  if (score >= 70) return { label: "Healthy",  color: "#10b981", bg: "rgba(16,185,129,0.1)" };
  if (score >= 40) return { label: "At Risk",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
  return           { label: "Churning", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
}

/* ─── Components ─────────────────────────────────────────────────── */
const CircularHealth = ({ score, color }: { score: number, color: string }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div style={{ position: "relative", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="44" height="44" style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
        <circle cx="22" cy="22" r={radius} stroke="var(--color-surface-2)" strokeWidth="3" fill="none" />
        <circle cx="22" cy="22" r={radius} stroke={color} strokeWidth="3" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 800, color: color, zIndex: 1 }}>{score}</span>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function HealthPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"Churning" | "At Risk">("Churning");
  const [tierFilter, setTierFilter] = useState<string>("all");

  useEffect(() => {
    api.get<{ data: Customer[] }>("/api/customers?limit=1000")
      .then(res => setCustomers(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute stats
  const scored = customers.map(c => {
    const computedRecency = c.last_order_date 
      ? Math.floor((new Date().getTime() - new Date(c.last_order_date).getTime()) / (1000 * 3600 * 24))
      : c.recency ?? 999;
    const cWithRecency = { ...c, recency: computedRecency };
    return { ...cWithRecency, healthScore: getHealthScore(cWithRecency) };
  });
  const avgHealth = scored.length ? Math.round(scored.reduce((acc, c) => acc + c.healthScore, 0) / scored.length) : 0;
  
  const healthyCount = scored.filter(c => c.healthScore >= 70).length;
  const atRiskCount = scored.filter(c => c.healthScore >= 40 && c.healthScore < 70).length;
  const churningCount = scored.filter(c => c.healthScore < 40).length;

  const alerts = scored.filter(c => {
    if (filter === "Churning" && c.healthScore >= 40) return false;
    if (filter === "At Risk" && (c.healthScore < 40 || c.healthScore >= 70)) return false;
    if (tierFilter !== "all" && c.tier !== tierFilter) return false;
    return true;
  }).sort((a, b) => a.healthScore - b.healthScore);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 60 }}>
      {/* ── Top Metrics Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 12 }}>Avg Health Score</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--color-text-primary)", lineHeight: 1 }}>{avgHealth}</span>
            <span style={{ fontSize: 14, color: "var(--color-text-muted)", fontWeight: 600 }}>/ 100</span>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} /> Healthy
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--color-text-primary)", lineHeight: 1 }}>{healthyCount}</span>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>customers</span>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} /> At Risk
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--color-text-primary)", lineHeight: 1 }}>{atRiskCount}</span>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>customers</span>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} /> Churning
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--color-text-primary)", lineHeight: 1 }}>{churningCount}</span>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>customers</span>
          </div>
        </div>
      </div>

      {/* ── Health Distribution ── */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>Health Distribution</h2>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>{scored.length} customers scored</span>
        </div>
        
        <div style={{ display: "flex", width: "100%", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ width: `${(healthyCount / Math.max(1, scored.length)) * 100}%`, background: "#10b981", borderRight: "2px solid var(--color-surface)" }} />
          <div style={{ width: `${(atRiskCount / Math.max(1, scored.length)) * 100}%`, background: "#f59e0b", borderRight: "2px solid var(--color-surface)" }} />
          <div style={{ width: `${(churningCount / Math.max(1, scored.length)) * 100}%`, background: "#ef4444" }} />
        </div>

        <div style={{ display: "flex", gap: 24, fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} /> Healthy (70–100)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} /> At Risk (40–69)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} /> Churning (0–39)
          </div>
        </div>
      </div>

      {/* ── Churn Alerts ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)" }}>Churn Alerts</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>{scored.filter(c => c.healthScore < 70).length} customers need attention</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/agent" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg, #ef4444, #f59e0b)", border: "none", borderRadius: 10, color: "#fff", textDecoration: "none", boxShadow: "0 4px 12px rgba(239,68,68,0.2)" }}>
              <Zap size={14} /> Auto-Winback All
            </Link>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)", padding: "8px 12px", borderRadius: 10,
                fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer"
              }}
            >
              <option value="all">All Tiers</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
            <div style={{ display: "flex", background: "var(--color-surface-2)", padding: 4, borderRadius: 12, border: "1px solid var(--color-border)" }}>
              {(["Churning", "At Risk"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "6px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                    background: filter === f ? "var(--color-text-primary)" : "transparent",
                    color: filter === f ? "var(--color-surface)" : "var(--color-text-secondary)",
                    border: "none", boxShadow: filter === f ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>Loading customer data...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {alerts.map(c => {
              const status = getHealthStatus(c.healthScore);
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.02)" }}>
                  
                  {/* Left: Avatar + Details */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: status.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>
                      {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>{c.name}</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: status.color }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: status.color }} />
                          {status.label}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: TIER_COLOR[c.tier] ?? "var(--color-text-primary)", fontWeight: 700, textTransform: "capitalize" }}>{c.tier}</span>
                        <span style={{ color: "var(--color-border)" }}>•</span>
                        <span>₹{c.total_spent.toLocaleString()}</span>
                        <span style={{ color: "var(--color-border)" }}>•</span>
                        <span>{c.total_orders} orders</span>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                        <Zap size={12} color="var(--color-text-muted)" />
                        Send a {c.total_orders === 1 ? "second-purchase" : "win-back"} incentive
                      </div>
                    </div>
                  </div>

                  {/* Right: Score + Action */}
                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <CircularHealth score={c.healthScore} color={status.color} />
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Link href={`/campaigns?customerId=${c.id}`} className="btn" style={{ background: "var(--color-text-primary)", color: "var(--color-surface)", padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                        Take Action
                      </Link>
                      <button style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-secondary)" }}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
            
            {alerts.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
                No customers found matching this criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
