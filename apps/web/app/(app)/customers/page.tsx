"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import {
  Search, X, Mail, Phone, MapPin, Award, ShoppingBag,
  Calendar, TrendingUp, CreditCard, User,
} from "lucide-react";

interface Customer {
  id: string; name: string; email: string; phone?: string;
  city: string; tier: string; total_spent: number;
  order_count: number; last_order_date: string | null;
  rfm_r: number; rfm_f: number; rfm_m: number;
  created_at?: string;
}

const TIER_COLOR: Record<string, string> = {
  gold: "#f59e0b", silver: "#94a3b8", bronze: "#c97c3a",
};
const TIER_BG: Record<string, string> = {
  gold: "rgba(245,158,11,0.12)", silver: "rgba(148,163,184,0.12)", bronze: "rgba(201,124,58,0.12)",
};

function RFMBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 6, height: 14, borderRadius: 2,
          background: i <= value ? color : "var(--color-border)",
          transition: "background 0.2s",
        }} />
      ))}
    </div>
  );
}

function RFMScore({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 8 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: i <= value ? color : "var(--color-border)" }} />
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const tierColor = TIER_COLOR[customer.tier] ?? "#6366f1";
  const tierBg    = TIER_BG[customer.tier]    ?? "rgba(99,102,241,0.1)";
  const daysSinceOrder = customer.last_order_date
    ? Math.floor((Date.now() - new Date(customer.last_order_date).getTime()) / 86400000)
    : null;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(3px)", zIndex: 40, animation: "fadeIn 0.2s ease" }}
      />

      {/* Slide-in panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 380,
        background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)",
        zIndex: 50, overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.1)",
        animation: "slideInPanel 0.25s ease",
      }}>

        {/* Header gradient */}
        <div style={{
          background: `linear-gradient(135deg, ${tierBg}, rgba(99,102,241,0.06))`,
          borderBottom: "1px solid var(--color-border)",
          padding: "24px 20px 20px",
          position: "relative",
        }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} color="var(--color-text-muted)" />
          </button>

          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${tierColor}, ${tierColor}99)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#fff",
            boxShadow: `0 4px 16px ${tierColor}40`,
            marginBottom: 14,
          }}>
            {customer.name.charAt(0)}
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>
            {customer.name}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, color: tierColor,
              background: tierBg, border: `1px solid ${tierColor}30`,
              padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {customer.tier}
            </span>
            {daysSinceOrder !== null && (
              <span style={{ fontSize: 11, color: daysSinceOrder > 60 ? "#ef4444" : "var(--color-text-muted)", fontWeight: 600 }}>
                {daysSinceOrder === 0 ? "Ordered today" : `${daysSinceOrder}d since last order`}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: "20px" }}>

          {/* Contact Info */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Contact</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: Mail,    label: "Email",  value: customer.email },
                { icon: Phone,   label: "Phone",  value: customer.phone ?? "+91 — not on file" },
                { icon: MapPin,  label: "City",   value: customer.city },
                { icon: User,    label: "ID",     value: customer.id.slice(0, 18) + "…" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 8, padding: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={13} color="var(--color-text-muted)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500, marginTop: 1 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "var(--color-border)", marginBottom: 20 }} />

          {/* Spend & Orders */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Spend Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: CreditCard,   label: "Lifetime Spend",  value: `₹${customer.total_spent.toLocaleString()}`, color: "#6366f1" },
                { icon: ShoppingBag,  label: "Total Orders",    value: customer.order_count,                        color: "#10b981" },
                { icon: TrendingUp,   label: "Avg Order Value", value: customer.order_count > 0 ? `₹${Math.round(customer.total_spent / customer.order_count).toLocaleString()}` : "—", color: "#f59e0b" },
                { icon: Calendar,     label: "Last Order",      value: customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never", color: "#a78bfa" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 12, padding: "14px 14px" }}>
                  <Icon size={14} color={color} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "var(--color-border)", marginBottom: 20 }} />

          {/* RFM Scores */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>RFM Score</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: "var(--color-surface-2)", borderRadius: 14, padding: "18px 14px" }}>
              <RFMScore label="Recency"   value={customer.rfm_r} color="#6366f1" />
              <RFMScore label="Frequency" value={customer.rfm_f} color="#10b981" />
              <RFMScore label="Monetary"  value={customer.rfm_m} color="#f59e0b" />
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 10, textAlign: "center" }}>
              Overall RFM: <strong style={{ color: "var(--color-text-primary)" }}>{customer.rfm_r + customer.rfm_f + customer.rfm_m}</strong> / 15
            </div>
          </div>

          <div style={{ height: 1, background: "var(--color-border)", marginBottom: 20 }} />

          {/* Member since */}
          {customer.created_at && (
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>
              Member since {new Date(customer.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn      { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInPanel { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [count, setCount]           = useState(0);
  const [search, setSearch]         = useState("");
  const [tier, setTier]             = useState("");
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Customer | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (search) params.set("search", search);
    if (tier)   params.set("tier",   tier);
    api.get<{ data: Customer[]; count: number }>(`/api/customers?${params}`)
      .then(r => { setCustomers(r.data); setCount(r.count); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, tier]);

  const RFM_COLORS = ["#6366f1", "#10b981", "#f59e0b"];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Customers</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
          {count?.toLocaleString()} shoppers · RFM scored · click any row to view profile
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <input
            className="input" placeholder="Search by name…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select className="input" value={tier} onChange={e => setTier(e.target.value)} style={{ width: 140 }}>
          <option value="">All tiers</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>Tier</th>
              <th>Total Spent</th>
              <th>Orders</th>
              <th>Last Order</th>
              <th>RFM — R</th>
              <th>RFM — F</th>
              <th>RFM — M</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1,2,3,4,5].map(i => (
                  <tr key={i}>
                    {Array(9).fill(0).map((_,j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, width: "80%" }} /></td>
                    ))}
                  </tr>
                ))
              : customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                          background: `linear-gradient(135deg, ${TIER_COLOR[c.tier] ?? "#6366f1"}, ${TIER_COLOR[c.tier] ?? "#6366f1"}88)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 800, color: "#fff",
                        }}>
                          {c.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)" }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{c.city}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                        color: TIER_COLOR[c.tier], background: TIER_BG[c.tier],
                        padding: "3px 10px", borderRadius: 99, letterSpacing: "0.04em",
                        border: `1px solid ${TIER_COLOR[c.tier]}30`,
                      }}>
                        {c.tier}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#6366f1" }}>₹{c.total_spent.toLocaleString()}</td>
                    <td style={{ fontSize: 13 }}>{c.order_count}</td>
                    <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {c.last_order_date
                        ? new Date(c.last_order_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
                        : "Never"}
                    </td>
                    <td><RFMBar value={c.rfm_r} color="#6366f1" /></td>
                    <td><RFMBar value={c.rfm_f} color="#10b981" /></td>
                    <td><RFMBar value={c.rfm_m} color="#f59e0b" /></td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
