"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  X, Megaphone, ChevronRight, ChevronLeft, Check,
  MessageSquare, Smartphone, Mail, Sparkles,
  Users, Layers, Search, Send, Pencil, Loader2,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */
export interface Campaign {
  id: string; name: string; channel: string; status: string;
  total_recipients: number; launched_at: string | null;
  message_template?: string; segment_id?: string;
  segments?: { name: string };
}
export interface Segment { id: string; name: string; customer_count: number; }
interface Customer {
  id: string; name: string; email: string; phone: string;
  tier: string; total_spent: number; city?: string;
}

/* ─── Channel config ──────────────────────────────────────────────── */
const CH: Record<string, { color: string; bg: string; border: string; label: string }> = {
  whatsapp: { color: "#25d366", bg: "#e9fbe9", border: "#b7efca", label: "WhatsApp" },
  sms:      { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "SMS"       },
  email:    { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", label: "Email"     },
  rcs:      { color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", label: "RCS"       },
};
const CHANNELS = ["whatsapp", "sms", "email", "rcs"] as const;

function ChannelIcon({ ch, size = 14 }: { ch: string; size?: number }) {
  if (ch === "whatsapp") return <MessageSquare size={size} />;
  if (ch === "sms")      return <Smartphone size={size} />;
  if (ch === "email")    return <Mail size={size} />;
  return <Sparkles size={size} />;
}

const TIER_COLOR: Record<string, string> = {
  gold: "#f59e0b", silver: "#94a3b8", bronze: "#c97c3a",
};

/* ─── Step indicator ──────────────────────────────────────────────── */
const STEPS = ["Basics", "Audience", "Message", "Review"];

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "20px 28px 0", gap: 0 }}>
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done    = idx < current;
        const active  = idx === current;
        const color   = done || active ? "#6366f1" : "var(--color-border)";
        const textCol = done || active ? (active ? "#6366f1" : "#10b981") : "var(--color-text-muted)";
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: done ? "#10b981" : active ? "#6366f1" : "var(--color-surface-2)",
                border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
              }}>
                {done
                  ? <Check size={14} color="#fff" />
                  : <span style={{ fontSize: 12, fontWeight: 800, color: active ? "#fff" : "var(--color-text-muted)" }}>{idx}</span>
                }
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: textCol, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#10b981" : "var(--color-border)", margin: "0 8px", marginBottom: 20, transition: "background 0.3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Live Message Preview ────────────────────────────────────────── */
function MessagePreview({ channel, template, sample }: { channel: string; template: string; sample: Customer | null }) {
  const cfg = CH[channel] ?? CH.whatsapp;
  const msg = template
    .replace(/\{name\}/g,        sample?.name.split(" ")[0] ?? "Priya")
    .replace(/\{tier\}/g,        sample?.tier               ?? "gold")
    .replace(/\{total_spent\}/g, `₹${sample?.total_spent?.toLocaleString() ?? "5,200"}`);

  return (
    <div style={{
      borderRadius: 14,
      overflow: "hidden",
      border: `1px solid ${cfg.border}`,
      background: channel === "whatsapp"
        ? "linear-gradient(180deg,#e5ddd5,#ece5dd)"
        : channel === "email"
        ? "linear-gradient(180deg,#f8faff,#f0f4ff)"
        : cfg.bg,
    }}>
      {/* Bar */}
      <div style={{ background: cfg.color, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChannelIcon ch={channel} size={13} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{cfg.label}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)" }}>Business · {sample?.name ?? "Customer"}</div>
        </div>
      </div>
      {/* Chat area */}
      <div style={{ padding: 16, minHeight: 100 }}>
        {channel === "email" && (
          <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 10, border: "1px solid #e2e8f0", fontSize: 11 }}>
            <div style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>Subject: Special offer just for you</div>
            <div style={{ color: "#888" }}>From: noreply@brewhaus.com · To: {sample?.email ?? "customer@email.com"}</div>
          </div>
        )}
        <div style={{ maxWidth: "85%", marginLeft: channel === "email" ? "auto" : 0, marginRight: "auto" }}>
          <div style={{
            background: "#fff",
            border: `1px solid ${cfg.border}`,
            borderRadius: channel === "whatsapp" ? "0 14px 14px 14px" : 14,
            padding: "12px 16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            position: "relative",
          }}>
            {channel === "whatsapp" && (
              <div style={{ position: "absolute", top: 0, left: -8, width: 0, height: 0, borderTop: "8px solid #fff", borderLeft: "8px solid transparent" }} />
            )}
            {template ? (
              <p style={{ fontSize: 13, lineHeight: 1.65, color: "#1a1a1a", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg}</p>
            ) : (
              <p style={{ fontSize: 12, color: "#aaa", margin: 0, fontStyle: "italic" }}>Your message will appear here…</p>
            )}
            <div style={{ fontSize: 10, color: "#aaa", textAlign: "right", marginTop: 6 }}>
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              {channel === "whatsapp" && " ✓✓"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Wizard ─────────────────────────────────────────────────── */
export default function CampaignWizard({
  campaign, segments, initialSegmentId, initialCustomerId, initialCustomerIds, onClose, onSaved,
}: {
  campaign: Campaign | null;
  segments: Segment[];
  initialSegmentId?: string;
  initialCustomerId?: string;
  initialCustomerIds?: string[];
  onClose: () => void;
  onSaved: (c: Campaign, launched: boolean) => void;
}) {
  const isEdit = !!campaign;

  /* Step state */
  const [step, setStep] = useState(1);

  /* Step 1 */
  const [name, setName]       = useState(campaign?.name ?? "");
  const [channel, setChannel] = useState(campaign?.channel ?? "whatsapp");

  /* Step 2 */
  const [audienceType, setAudienceType]           = useState<"segment" | "manual">(
    (initialCustomerId || (initialCustomerIds && initialCustomerIds.length > 0)) ? "manual" : ((campaign?.segment_id || initialSegmentId) ? "segment" : "segment")
  );
  const [segmentId, setSegmentId]                 = useState(campaign?.segment_id ?? initialSegmentId ?? "");
  const [customers, setCustomers]                 = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers]   = useState(false);
  const [customerSearch, setCustomerSearch]       = useState("");
  const [tierFilter, setTierFilter]               = useState<string>("all");
  const [selectedIds, setSelectedIds]             = useState<Set<string>>(
    new Set(initialCustomerIds || (initialCustomerId ? [initialCustomerId] : []))
  );

  /* Step 3 */
  const [template, setTemplate] = useState(campaign?.message_template ?? "");

  /* Submit */
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  /* Fetch customers when manual tab opens */
  useEffect(() => {
    if (audienceType === "manual" && customers.length === 0) {
      setLoadingCustomers(true);
      api.get<{ data: Customer[] }>("/api/customers?limit=300")
        .then(res => setCustomers(res.data || [])).catch(console.error).finally(() => setLoadingCustomers(false));
    }
  }, [audienceType, customers.length]);

  useEffect(() => {
    if (initialCustomerId && !initialCustomerIds && customers.length > 0) {
      const c = customers.find(x => x.id === initialCustomerId);
      if (c && !customerSearch) setCustomerSearch(c.name);
    }
  }, [initialCustomerId, initialCustomerIds, customers]);

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone?.includes(q);
    const matchT = tierFilter === "all" || c.tier === tierFilter;
    return matchQ && matchT;
  });

  const sampleCustomer = audienceType === "manual"
    ? (customers.find(c => selectedIds.has(c.id)) ?? customers[0] ?? null)
    : null;

  const toggleCustomer = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const selectedSegment = segments.find(s => s.id === segmentId);

  /* Validation per step */
  const valid = [
    name.trim().length > 0,
    audienceType === "segment" ? segmentId !== "" : selectedIds.size > 0,
    template.trim().length > 0,
    true,
  ];

  const canNext = valid[step - 1];

  const handleSubmit = async (launch: boolean) => {
    setSaving(true); setError("");
    try {
      let finalSegmentId = segmentId;

      // If manual selection, create a custom segment on the fly
      if (audienceType === "manual") {
        const segBody = {
          name: `Custom Audience: ${name.trim()}`,
          description: "Manually selected customers",
          filter_json: { ids: Array.from(selectedIds) },
          created_by: "manual",
        };
        const newSeg = await api.post<Segment>("/api/segments", segBody);
        finalSegmentId = newSeg.id;
      }

      const body: any = {
        name: name.trim(),
        channel,
        message_template: template.trim(),
        segment_id: finalSegmentId,
      };
      const result: Campaign = isEdit
        ? await api.patch<Campaign>(`/api/campaigns/${campaign!.id}`, body)
        : await api.post<Campaign>("/api/campaigns", body);

      if (launch) {
        await api.post(`/api/campaigns/${result.id}/send`, {});
      }
      onSaved(result, launch);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const insertVar = (v: string) => setTemplate(t => t + `{${v}}`);

  /* ── Render ── */
  return (
    <div style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--color-surface)", borderRadius: 22, width: "100%", maxWidth: step === 3 ? 840 : 560, boxShadow: "0 32px 100px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", maxHeight: "92vh", transition: "max-width 0.35s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, padding: 8, display: "flex" }}>
              <Megaphone size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>
                {isEdit ? "Edit Campaign" : "New Campaign"}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>
                Step {step} of {STEPS.length} — {STEPS[step - 1]}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* ── STEP 1: BASICS ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={labelStyle}>Campaign Name</label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Summer Win-back · June 2026"
                  autoFocus
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Channel</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                  {CHANNELS.map(ch => {
                    const cfg = CH[ch];
                    const active = channel === ch;
                    return (
                      <button key={ch} onClick={() => setChannel(ch)} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
                        borderRadius: 12, border: `2px solid ${active ? cfg.color : "var(--color-border)"}`,
                        background: active ? `${cfg.color}12` : "var(--color-surface-2)",
                        cursor: "pointer", transition: "all 0.18s",
                      }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: active ? cfg.color : "var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: active ? "#fff" : "var(--color-text-muted)", transition: "all 0.18s" }}>
                          <ChannelIcon ch={ch} size={16} />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: active ? cfg.color : "var(--color-text-primary)" }}>{cfg.label}</div>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                            {ch === "whatsapp" ? "Rich media + replies" : ch === "sms" ? "Universal reach" : ch === "email" ? "Long-form content" : "Next-gen messaging"}
                          </div>
                        </div>
                        {active && <Check size={14} color={cfg.color} style={{ marginLeft: "auto" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: AUDIENCE ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Toggle tabs */}
              <div style={{ display: "flex", background: "var(--color-surface-2)", borderRadius: 12, padding: 4, gap: 4 }}>
                {(["segment", "manual"] as const).map(t => (
                  <button key={t} onClick={() => setAudienceType(t)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", transition: "all 0.2s",
                    background: audienceType === t ? "var(--color-surface)" : "transparent",
                    color: audienceType === t ? "#6366f1" : "var(--color-text-muted)",
                    fontWeight: audienceType === t ? 800 : 500, fontSize: 13,
                    boxShadow: audienceType === t ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    {t === "segment" ? <Layers size={13} /> : <Users size={13} />}
                    {t === "segment" ? "Segment" : "Select Customers"}
                  </button>
                ))}
              </div>

              {audienceType === "segment" ? (
                <div>
                  <label style={labelStyle}>Choose a Segment</label>
                  <select value={segmentId} onChange={e => setSegmentId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">-- Select a segment --</option>
                    {segments.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.customer_count} members)</option>
                    ))}
                  </select>
                  {selectedSegment && (
                    <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <Layers size={16} color="#6366f1" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{selectedSegment.name}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{selectedSegment.customer_count} members will receive this campaign</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Search + filter */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                      <input
                        value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                        placeholder="Search by name, email or phone…"
                        style={{ ...inputStyle, paddingLeft: 34 }}
                      />
                    </div>
                    <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 110 }}>
                      <option value="all">All tiers</option>
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="bronze">Bronze</option>
                    </select>
                  </div>

                  {/* Selected count bar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: selectedIds.size > 0 ? "#6366f1" : "var(--color-text-muted)" }}>
                      {selectedIds.size > 0 ? `${selectedIds.size} customer${selectedIds.size > 1 ? "s" : ""} selected` : "No customers selected"}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {filteredCustomers.length > 0 && (
                        <button onClick={() => setSelectedIds(new Set(filteredCustomers.map(c => c.id)))} style={microBtn}>Select all shown</button>
                      )}
                      {selectedIds.size > 0 && (
                        <button onClick={() => setSelectedIds(new Set())} style={{ ...microBtn, color: "#ef4444" }}>Clear</button>
                      )}
                    </div>
                  </div>

                  {/* Customer list */}
                  <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface-2)" }}>
                    {loadingCustomers ? (
                      <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                        <Loader2 size={18} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
                        <div>Loading customers…</div>
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>No customers found</div>
                    ) : filteredCustomers.map((c, i) => {
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <div key={c.id} onClick={() => toggleCustomer(c.id)} style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                          borderBottom: i < filteredCustomers.length - 1 ? "1px solid var(--color-border)" : "none",
                          cursor: "pointer", background: isSelected ? "rgba(99,102,241,0.05)" : "transparent",
                          transition: "background 0.15s",
                        }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSelected ? "#6366f1" : "var(--color-border)"}`,
                            background: isSelected ? "#6366f1" : "transparent", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                          }}>
                            {isSelected && <Check size={11} color="#fff" />}
                          </div>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${TIER_COLOR[c.tier] ?? "#6366f1"}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: TIER_COLOR[c.tier] ?? "#6366f1" }}>{c.name[0]}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${TIER_COLOR[c.tier] ?? "#6366f1"}18`, color: TIER_COLOR[c.tier] ?? "#6366f1", textTransform: "uppercase", flexShrink: 0 }}>{c.tier}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: MESSAGE ── */}
          {step === 3 && (
            <div style={{ display: "flex", gap: 20 }}>
              {/* Left: editor */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Message Template</label>
                  <textarea
                    value={template}
                    onChange={e => setTemplate(e.target.value)}
                    rows={9}
                    placeholder={`Hi {name}, as a {tier} member you get an exclusive offer!\n\nUse code BREW20 for 20% off your next order.\n\nTotal spent so far: {total_spent}`}
                    autoFocus
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65, fontFamily: "inherit" }}
                  />
                </div>
                {/* Variable chips */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Insert personalisation</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[["name", "Customer first name"], ["tier", "Loyalty tier"], ["total_spent", "Total amount spent"]].map(([v, desc]) => (
                      <button key={v} onClick={() => insertVar(v)} title={desc} style={{
                        fontSize: 12, padding: "5px 12px", borderRadius: 99,
                        border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)",
                        color: "#6366f1", cursor: "pointer", fontWeight: 700, fontFamily: "monospace",
                      }}>
                        {`{${v}}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "10px 14px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  Variables are replaced with each customer's real data when the campaign is launched.
                </div>
              </div>
              {/* Right: live preview */}
              <div style={{ width: 260, flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Live Preview</div>
                <MessagePreview channel={channel} template={template} sample={sampleCustomer} />
                {sampleCustomer && (
                  <div style={{ marginTop: 8, fontSize: 10, color: "var(--color-text-muted)", textAlign: "center" }}>Preview using: {sampleCustomer.name}</div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 4: REVIEW ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: "16px 20px", background: "linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Campaign Summary</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Name */}
                  <ReviewRow label="Campaign Name" value={name} />
                  {/* Channel */}
                  <ReviewRow label="Channel" value={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: CH[channel]?.color, background: `${CH[channel]?.color}15`, padding: "2px 10px", borderRadius: 99, border: `1px solid ${CH[channel]?.color}30` }}>
                      <ChannelIcon ch={channel} size={11} /> {CH[channel]?.label}
                    </span>
                  } />
                  {/* Audience */}
                  <ReviewRow label="Audience" value={
                    audienceType === "segment"
                      ? `${selectedSegment?.name ?? "—"} (${selectedSegment?.customer_count ?? 0} members)`
                      : `${selectedIds.size} customers selected manually`
                  } />
                </div>
              </div>

              {/* Message preview */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Message Preview</div>
                <MessagePreview channel={channel} template={template} sample={sampleCustomer} />
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button
            onClick={step > 1 ? () => { setStep(s => s - 1); setError(""); } : onClose}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            <ChevronLeft size={14} /> {step > 1 ? "Back" : "Cancel"}
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            {step < 4 ? (
              <button
                onClick={() => { if (canNext) { setStep(s => s + 1); setError(""); } }}
                disabled={!canNext}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 10, background: canNext ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--color-surface-2)", color: canNext ? "#fff" : "var(--color-text-muted)", border: "none", fontWeight: 700, fontSize: 13, cursor: canNext ? "pointer" : "not-allowed" }}
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text-secondary)", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
                >
                  <Pencil size={13} /> Save as Draft
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", borderRadius: 10, background: saving ? "var(--color-surface-2)" : "linear-gradient(135deg,#10b981,#059669)", color: saving ? "var(--color-text-muted)" : "#fff", border: "none", fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
                  {saving ? "Launching…" : "Create & Launch"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Shared helpers ──────────────────────────────────────────────── */
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)",
  display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: 10,
  fontSize: 13, background: "var(--color-surface-2)", color: "var(--color-text-primary)",
  outline: "none", boxSizing: "border-box",
};
const microBtn: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
  border: "1px solid var(--color-border)", background: "transparent",
  color: "#6366f1", cursor: "pointer",
};

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 120, flexShrink: 0, fontSize: 12, color: "var(--color-text-muted)", paddingTop: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}
