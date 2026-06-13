"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Layers, Users, X, Search, Zap, Bot, TrendingUp, Calendar, Pencil, Trash2, Loader2, Save, Check, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Segment {
  id: string; name: string; description: string;
  filter_json: Record<string, unknown>;
  customer_count: number; created_by: string; created_at: string;
}
interface Customer {
  id: string; name: string; email: string; phone?: string;
  city: string; tier: string; total_spent: number;
  order_count: number; last_order_date: string | null;
  rfm_r: number; rfm_f: number; rfm_m: number;
}

/* ─── Constants ─────────────────────────────────────────────────── */
const TIER_COLOR: Record<string, string> = { gold: "#f59e0b", silver: "#94a3b8", bronze: "#c97c3a" };
const TIER_BG:    Record<string, string> = { gold: "rgba(245,158,11,0.12)", silver: "rgba(148,163,184,0.12)", bronze: "rgba(201,124,58,0.12)" };

const CARD_ACCENTS = [
  { color: "#6366f1", bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.2)"  },
  { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)"  },
  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
  { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)"   },
  { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)"  },
];

/* ─── Sub-components ────────────────────────────────────────────── */
function FilterPill({ label, value }: { label: string; value: unknown }) {
  return (
    <span style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 999, padding: "2px 10px", fontSize: 11, color: "#818cf8", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: "var(--color-text-muted)" }}>{label}:</span> {String(value)}
    </span>
  );
}


/* ─── Members Panel ─────────────────────────────────────────────── */
function MembersPanel({ segment, onClose }: { segment: Segment; onClose: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered,  setFiltered]  = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    api.get<{ customers: Customer[] }>(`/api/segments/${segment.id}/customers`)
      .then(r => { setCustomers(r.customers); setFiltered(r.customers); })
      .catch(console.error)
      .finally(() => setLoading(false));
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [segment.id, onClose]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q)
    ));
  }, [search, customers]);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "transparent", backdropFilter: "blur(3px)", zIndex: 40 }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(600px, 95vw)",
        background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)",
        zIndex: 50, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.1)", animation: "slideInPanel 0.24s ease",
      }}>

        {/* ── Header ── */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>{segment.name}</h2>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{segment.description}</p>
            </div>
            <button onClick={onClose} style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex", marginLeft: 12, flexShrink: 0 }}>
              <X size={15} color="var(--color-text-muted)" />
            </button>
          </div>

          {/* Pills + count */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {Object.entries(segment.filter_json)
              .filter(([k, v]) => v != null && k !== "ids" && k !== "exclude_ids")
              .map(([k, v]) => (
                <FilterPill key={k} label={k.replace(/_/g, " ")} value={v} />
            ))}
            <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", padding: "3px 12px", borderRadius: 99 }}>
              {loading ? "…" : customers.length.toLocaleString()} members
            </span>
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            <input
              className="input" placeholder="Search by name, email or city…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--color-text-muted)" }}>
              <Users size={28} color="var(--color-border)" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>No members found</div>
              {search && <div style={{ fontSize: 12, marginTop: 4 }}>Clear search to see all members</div>}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--color-surface)" }}>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["#", "Member", "City", "Tier", "Spent", "Orders"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: h === "Spent" || h === "Orders" || h === "#" ? "right" : "left", fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const tc = TIER_COLOR[c.tier] ?? "#6366f1";
                  const tb = TIER_BG[c.tier]    ?? "rgba(99,102,241,0.08)";
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: "1px solid var(--color-border)", transition: "background 0.1s", cursor: "default" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--color-surface-2)"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                    >
                      {/* # */}
                      <td style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, textAlign: "right", width: 36 }}>{i + 1}</td>

                      {/* Member */}
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${tc}, ${tc}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                            {c.name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{c.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* City */}
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--color-text-secondary)" }}>{c.city}</td>

                      {/* Tier */}
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: tc, background: tb, border: `1px solid ${tc}30`, padding: "3px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {c.tier}
                        </span>
                      </td>

                      {/* Spent */}
                      <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: "#6366f1", textAlign: "right", whiteSpace: "nowrap" }}>
                        ₹{c.total_spent.toLocaleString()}
                      </td>

                      {/* Orders */}
                      <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textAlign: "right" }}>
                        {c.order_count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--color-border)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface-2)" }}>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {search ? `${filtered.length} of ${customers.length}` : customers.length} member{customers.length !== 1 ? "s" : ""}
          </span>
          <Link href={`/campaigns?segmentId=${segment.id}`} className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}>
            Run campaign on this segment →
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes slideInPanel { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
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
    <div style={{ position: "fixed", inset: 0, background: "transparent", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-surface)", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "24px 24px 16px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: isDanger ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            {isDanger ? <Trash2 size={24} color="#ef4444" /> : <Save size={24} color="#10b981" />}
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
            {loading ? (isDanger ? "Deleting…" : "Processing…") : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertModal({
  title, description, onClose
}: {
  title: string; description: string; onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "transparent", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-surface)", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "24px 24px 16px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <X size={24} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{description}</p>
        </div>
        <div style={{ padding: "16px 24px", background: "var(--color-surface-2)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "8px 24px", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", cursor: "pointer" }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Segment Form Modal ────────────────────────────────────────── */
interface Rule { id: string; field: string; operator: string; value: string; }

function SegmentFormModal({
  segment, onClose, onSaved
}: {
  segment: Segment | null;
  onClose: () => void;
  onSaved: (s: Segment) => void;
}) {
  const isEdit = !!segment;
  const [name, setName] = useState(segment?.name ?? "");
  const [desc, setDesc] = useState(segment?.description ?? "");
  
  const initF = segment?.filter_json || {};
  const [excludeIds, setExcludeIds] = useState<string[]>((initF.exclude_ids as string[]) || []);

  const [rules, setRules] = useState<Rule[]>(() => {
    const r: Rule[] = [];
    if (initF.tier) r.push({ id: Math.random().toString(), field: 'tier', operator: 'eq', value: initF.tier as string });
    if (initF.city) r.push({ id: Math.random().toString(), field: 'city', operator: 'eq', value: initF.city as string });
    if (initF.min_spent != null) r.push({ id: Math.random().toString(), field: 'total_spent', operator: 'gte', value: String(initF.min_spent) });
    if (initF.max_spent != null) r.push({ id: Math.random().toString(), field: 'total_spent', operator: 'lte', value: String(initF.max_spent) });
    if (initF.min_orders != null) r.push({ id: Math.random().toString(), field: 'total_orders', operator: 'gte', value: String(initF.min_orders) });
    if (initF.max_orders != null) r.push({ id: Math.random().toString(), field: 'total_orders', operator: 'lte', value: String(initF.max_orders) });
    if (initF.recency_days != null) r.push({ id: Math.random().toString(), field: 'recency', operator: 'eq', value: String(initF.recency_days) });
    return r;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  useEffect(() => {
    api.get<string[]>("/api/customers/cities").then(setAvailableCities).catch(console.error);
  }, []);

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewCustomers, setPreviewCustomers] = useState<Customer[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const getFilterJson = () => {
    const f: Record<string, any> = {};
    if (excludeIds.length > 0) f.exclude_ids = excludeIds;
    rules.forEach(r => {
      if (!r.value || r.value === 'all') return;
      if (r.field === 'tier') f.tier = r.value;
      if (r.field === 'city') f.city = r.value;
      if (r.field === 'total_spent') {
        if (r.operator === 'gte') f.min_spent = Number(r.value);
        if (r.operator === 'lte') f.max_spent = Number(r.value);
      }
      if (r.field === 'total_orders') {
        if (r.operator === 'gte') f.min_orders = Number(r.value);
        if (r.operator === 'lte') f.max_orders = Number(r.value);
      }
      if (r.field === 'recency') {
        f.recency_days = Number(r.value);
      }
    });
    return f;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewLoading(true);
      api.post<{count: number, customers: Customer[]}>("/api/segments/preview", { filter_json: getFilterJson() })
        .then(r => { setPreviewCount(r.count); setPreviewCustomers(r.customers); })
        .catch(() => setPreviewCount(null))
        .finally(() => setPreviewLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [rules, excludeIds]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      const body = { name: name.trim(), description: desc.trim(), filter_json: getFilterJson() };
      const res = isEdit
        ? await api.patch<Segment>(`/api/segments/${segment!.id}`, body)
        : await api.post<Segment>("/api/segments", body);
      onSaved(res);
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    setRules([...rules, { id: Math.random().toString(), field: 'total_spent', operator: 'gte', value: '' }]);
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "transparent", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Container: Row layout */}
      <div style={{ display: "flex", width: "100%", maxWidth: 1000, height: "85vh", gap: 20 }}>
        
        {/* Left Column: Form & Rules */}
        <div style={{ flex: 1, background: "var(--color-surface)", borderRadius: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Layers size={18} color="#6366f1" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}>{isEdit ? "Edit Segment" : "Create Segment"}</h2>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Define dynamic rules to group your customers</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color="var(--color-text-muted)" /></button>
          </div>

          <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 6 }}>Segment Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP Customers, Diwali Shoppers" style={{ width: "100%", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "var(--color-text-primary)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 6 }}>Description (Optional)</label>
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What is this segment used for?" style={{ width: "100%", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "var(--color-text-primary)" }} />
              </div>
            </div>

            <div style={{ height: 1, background: "var(--color-border)" }} />

            {/* Dynamic Rule Builder */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>Filter Rules</h3>
                <button onClick={addRule} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", cursor: "pointer", opacity: 0.8 }} onMouseEnter={e => e.currentTarget.style.opacity="1"} onMouseLeave={e => e.currentTarget.style.opacity="0.8"}>
                  <Plus size={14} /> Add Rule
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rules.length === 0 ? (
                  <div style={{ padding: "30px 20px", textAlign: "center", background: "var(--color-surface-2)", border: "1px dashed var(--color-border)", borderRadius: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>No rules defined yet</div>
                    <button onClick={addRule} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "none", padding: "8px 16px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      <Plus size={14} /> Add your first rule
                    </button>
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", padding: 8, borderRadius: 12 }}>
                      
                      {/* Field Dropdown */}
                      <select 
                        value={rule.field} 
                        onChange={e => {
                          const newField = e.target.value;
                          const newOp = (newField === 'tier' || newField === 'city' || newField === 'recency') ? 'eq' : 'gte';
                          updateRule(rule.id, { field: newField, operator: newOp, value: '' });
                        }}
                        style={{ flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}
                      >
                        <option value="total_spent">Total Spend (₹)</option>
                        <option value="total_orders">Total Orders</option>
                        <option value="recency">Days Since Last Order</option>
                        <option value="city">City</option>
                        <option value="tier">Tier</option>
                      </select>

                      {/* Operator Dropdown */}
                      <select 
                        value={rule.operator} 
                        onChange={e => updateRule(rule.id, { operator: e.target.value })}
                        disabled={rule.field === 'tier' || rule.field === 'city' || rule.field === 'recency'}
                        style={{ width: 140, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", opacity: (rule.field === 'tier' || rule.field === 'city' || rule.field === 'recency') ? 0.6 : 1 }}
                      >
                        {(rule.field === 'tier' || rule.field === 'city' || rule.field === 'recency') ? (
                          <option value="eq">Equals</option>
                        ) : (
                          <>
                            <option value="gte">Greater or Equal</option>
                            <option value="lte">Less or Equal</option>
                          </>
                        )}
                      </select>

                      {/* Value Input */}
                      {rule.field === 'tier' ? (
                        <select 
                          value={rule.value} 
                          onChange={e => updateRule(rule.id, { value: e.target.value })}
                          style={{ flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "var(--color-text-primary)" }}
                        >
                          <option value="">Select Tier...</option>
                          <option value="gold">Gold</option>
                          <option value="silver">Silver</option>
                          <option value="bronze">Bronze</option>
                        </select>
                      ) : rule.field === 'city' ? (
                        <select 
                          value={rule.value} 
                          onChange={e => updateRule(rule.id, { value: e.target.value })}
                          style={{ flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "var(--color-text-primary)" }}
                        >
                          <option value="">Select City...</option>
                          {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input 
                          type="number"
                          value={rule.value}
                          onChange={e => updateRule(rule.id, { value: e.target.value })}
                          placeholder="0"
                          style={{ flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "var(--color-text-primary)" }}
                        />
                      )}

                      {/* Delete Action */}
                      <button onClick={() => removeRule(rule.id)} style={{ background: "none", border: "none", padding: "8px", cursor: "pointer", color: "var(--color-text-muted)" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Audience Size & Actions */}
        <div style={{ width: 340, display: "flex", flexDirection: "column", gap: 16 }}>
          
          <div style={{ background: "var(--color-surface)", borderRadius: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.25)", padding: 24, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Users size={20} color="#10b981" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>Audience Size</h3>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>See how many customers match</p>
              
              <div style={{ marginTop: 24, fontSize: 36, fontWeight: 900, color: "#10b981", display: "flex", alignItems: "center", gap: 12 }}>
                {previewLoading ? <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} /> : previewCount ?? "-"}
              </div>
            </div>

            {/* Preview List (Sticky scrollable area) */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "var(--color-surface-2)", borderRadius: 16, border: "1px solid var(--color-border)", padding: "8px 0" }}>
              {previewCustomers.length === 0 && !previewLoading ? (
                 <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--color-text-muted)" }}>No customers match the current rules.</div>
              ) : (
                previewCustomers.map(c => {
                  const isExcluded = excludeIds.includes(c.id);
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", padding: "8px 16px", gap: 10, opacity: isExcluded ? 0.5 : 1 }}>
                      <input 
                        type="checkbox" checked={!isExcluded} 
                        onChange={() => {
                          if (isExcluded) setExcludeIds(prev => prev.filter(id => id !== c.id));
                          else setExcludeIds(prev => [...prev, c.id]);
                        }}
                        style={{ cursor: "pointer", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{c.city || 'No City'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--color-text-primary)", border: "none", borderRadius: 16, padding: "16px", fontSize: 15, fontWeight: 800, color: "var(--color-surface)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
            {saving ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={18} />}
            {saving ? "Saving…" : "Save Segment"}
          </button>

          {/* AI Promo Banner */}
          <div style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(99,102,241,0.15))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ color: "#8b5cf6", marginTop: 2 }}><Sparkles size={18} /></div>
              <p style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
                Want an easier way? You can ask Xeno AI to build complex segments for you just by describing them!
              </p>
            </div>
          </div>

        </div>

      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [active,   setActive]   = useState<Segment | null>(null);

  // CRUD state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Segment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  const fetchSegments = useCallback(() => {
    setLoading(true);
    api.get<Segment[]>("/api/segments")
      .then(data => setSegments(data.filter(s => !s.name.toLowerCase().startsWith("retry"))))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/segments/${deleteTarget.id}`);
      setSegments(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteTarget(null);
      setErrorAlert(err.message || "Failed to delete segment");
    } finally {
      setDeleting(false);
    }
  };

  const totalMembers = segments.reduce((s, seg) => s + seg.customer_count, 0);
  const aiCount      = segments.filter(s => s.created_by === "agent").length;

  return (
    <div>
      {/* ── Hero Header ──────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(167,139,250,0.06) 100%)",
        border: "1px solid rgba(99,102,241,0.18)",
        borderRadius: 20, padding: "28px 28px 24px",
        marginBottom: 28, position: "relative", overflow: "hidden",
      }}>
        {/* Glow orbs */}
        <div style={{ position: "absolute", top: -50, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(99,102,241,0.1)", filter: "blur(50px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -30, left: 80, width: 140, height: 140, borderRadius: "50%", background: "rgba(167,139,250,0.08)", filter: "blur(35px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", borderRadius: 14, padding: 10, display: "flex", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                <Layers size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Audience Segments</h1>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>AI-built · RFM-powered · Click any card to explore members</p>
              </div>
            </div>

          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {/* Live stats */}
            {!loading && (
              <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                {[
                  { label: "Segments",     value: segments.length,             color: "#6366f1", icon: Layers },
                  { label: "Total Members",value: totalMembers.toLocaleString(), color: "#10b981", icon: Users  },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}22`, borderRadius: 14, padding: "12px 16px", textAlign: "center", minWidth: 90 }}>
                    <Icon size={14} color={color} style={{ margin: "0 auto 6px" }} />
                    <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setEditTarget(null); setFormOpen(true); }} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", fontSize: 13, background: "#6366f1", border: "none", borderRadius: 12, height: "fit-content" }}>
              <Layers size={15} /> New Segment
            </button>
          </div>
        </div>
      </div>

      {/* ── Cards Grid ───────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />)}
        </div>
      ) : segments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px", background: "var(--color-surface)", border: "1px dashed var(--color-border)", borderRadius: 20 }}>
          <Layers size={44} color="var(--color-border)" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>No segments yet</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 20 }}>Run the AI agent to auto-create audience segments</div>
          <Link href="/agent" className="btn btn-primary">Run AI Agent →</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {segments.map((seg, idx) => {
            const accent   = CARD_ACCENTS[idx % CARD_ACCENTS.length];
            const isActive = active?.id === seg.id;
            const filterEntries = Object.entries(seg.filter_json).filter(([k, v]) => v != null && k !== "ids" && k !== "exclude_ids");

            return (
              <div
                key={seg.id}
                onClick={() => setActive(seg)}
                style={{
                  background: "var(--color-surface)",
                  border: `1px solid ${isActive ? accent.color + "60" : "var(--color-border)"}`,
                  borderRadius: 18, overflow: "hidden", cursor: "pointer",
                  boxShadow: isActive ? `0 0 0 3px ${accent.color}20, 0 8px 32px ${accent.color}15` : "0 2px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.2s", position: "relative",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  if (!isActive) { el.style.borderColor = accent.color + "40"; el.style.boxShadow = `0 6px 24px ${accent.color}18`; el.style.transform = "translateY(-2px)"; }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  if (!isActive) { el.style.borderColor = "var(--color-border)"; el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; el.style.transform = "translateY(0)"; }
                }}
              >
                {/* Accent top bar */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${accent.color}, ${accent.color}80)`, width: "100%" }} />

                <div style={{ padding: "20px 20px 18px" }}>
                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: isActive ? accent.color : "var(--color-text-primary)", transition: "color 0.2s" }}>
                          {seg.name}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{seg.description}</p>
                    </div>

                    {/* Member count circle */}
                    <div style={{ flexShrink: 0, marginLeft: 14, textAlign: "center" }}>
                      <div style={{
                        width: 58, height: 58, borderRadius: "50%",
                        background: accent.bg, border: `2px solid ${accent.border}`,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: accent.color, lineHeight: 1 }}>{seg.customer_count}</div>
                        <div style={{ fontSize: 8, color: accent.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>members</div>
                      </div>
                    </div>
                  </div>

                  {/* Filter chips */}
                  {filterEntries.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                      {filterEntries.map(([k, v]) => (
                        <span key={k} style={{ fontSize: 11, fontWeight: 600, color: accent.color, background: accent.bg, border: `1px solid ${accent.border}`, padding: "3px 10px", borderRadius: 99 }}>
                          <span style={{ opacity: 0.65 }}>{k.replace(/_/g, " ")}: </span>{String(v)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bottom row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${accent.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-text-muted)" }}>
                      <Calendar size={11} /> {new Date(seg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={e => { e.stopPropagation(); setEditTarget(seg); setFormOpen(true); }} title="Edit rules" style={{ display: "flex", alignItems: "center", padding: "5px 7px", borderRadius: 8, color: accent.color, background: accent.bg, border: `1px solid ${accent.border}`, cursor: "pointer" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(seg); }} title="Delete" style={{ display: "flex", alignItems: "center", padding: "5px 7px", borderRadius: 8, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}>
                        <Trash2 size={13} />
                      </button>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        fontSize: 12, fontWeight: 700, color: isActive ? "#fff" : accent.color,
                        background: isActive ? accent.color : accent.bg,
                        border: `1px solid ${accent.border}`,
                        padding: "5px 14px", borderRadius: 99, transition: "all 0.2s",
                      }}>
                        <Users size={12} /> View Members
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active && <MembersPanel segment={active} onClose={() => setActive(null)} />}
      
      {formOpen && (
        <SegmentFormModal
          segment={editTarget}
          onClose={() => { setFormOpen(false); setEditTarget(null); }}
          onSaved={(newSeg) => {
            setFormOpen(false);
            if (editTarget) {
              setSegments(prev => prev.map(s => s.id === newSeg.id ? newSeg : s));
            } else {
              fetchSegments(); // Refresh to ensure correct sorting/state
            }
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Segment?"
          description={`Are you sure you want to delete "${deleteTarget.name}"? If it is currently attached to a live campaign, deletion will be blocked.`}
          confirmText="Yes, delete"
          isDanger={true}
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {errorAlert && (
        <AlertModal
          title="Cannot Delete Segment"
          description={errorAlert}
          onClose={() => setErrorAlert(null)}
        />
      )}
    </div>
  );
}
