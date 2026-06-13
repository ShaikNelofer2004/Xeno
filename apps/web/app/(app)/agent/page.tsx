"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Send, Brain, Eye, ChevronDown, ChevronRight,
  Bot, Clock, CheckCircle2, XCircle, Loader2, Zap,
  Target, BarChart2, MessageSquare, Users, TrendingUp,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AgentStep {
  type: "thought" | "tool_call" | "observation" | "summary";
  content: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  timestamp: string;
}

const STEP_CONFIG = {
  thought:     { icon: Brain,         label: "Thinking",   color: "#818cf8", bg: "rgba(129,140,248,0.07)", border: "rgba(129,140,248,0.18)" },
  tool_call:   { icon: Zap,           label: "Tool Call",  color: "#f59e0b", bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)"  },
  observation: { icon: BarChart2,     label: "Observed",   color: "#10b981", bg: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.18)"  },
  summary:     { icon: CheckCircle2,  label: "Summary",    color: "#a78bfa", bg: "rgba(167,139,250,0.09)", border: "rgba(167,139,250,0.22)" },
};

const EXAMPLES = [
  { text: "Re-engage customers who haven't ordered in 60 days with a win-back WhatsApp message" },
  { text: "Send an exclusive 20% discount to our gold-tier customers via email" },
  { text: "Run an SMS flash sale campaign for customers who've spent over 5000" },
  { text: "Generate a revenue report for all time and tell me our best channel" },
  { text: "Compare all campaigns from this month and show me the winner" },
  { text: "Find lapsed silver customers and bring them back with a personalised offer" },
];

const CAPABILITIES = [
  { label: "Customer Segmentation", icon: Users,         color: "#6366f1" },
  { label: "AI Copywriting",        icon: MessageSquare, color: "#10b981" },
  { label: "Auto Campaign Launch",  icon: Zap,           color: "#f59e0b" },
  { label: "Revenue Analytics",     icon: TrendingUp,    color: "#a78bfa" },
  { label: "Segment Targeting",     icon: Target,        color: "#ef4444" },
];

function MdContent({ content, color }: { content: string; color: string }) {
  return (
    <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--color-text-secondary)", wordBreak: "break-word" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p:          ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
          strong:     ({ children }) => <strong style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>{children}</strong>,
          em:         ({ children }) => <em style={{ color }}>{children}</em>,
          ul:         ({ children }) => <ul style={{ margin: "6px 0 10px 0", paddingLeft: 20, listStyleType: "disc" }}>{children}</ul>,
          ol:         ({ children }) => <ol style={{ margin: "6px 0 10px 0", paddingLeft: 20 }}>{children}</ol>,
          li:         ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
          h1:         ({ children }) => <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", margin: "12px 0 6px" }}>{children}</h1>,
          h2:         ({ children }) => <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "10px 0 5px" }}>{children}</h2>,
          h3:         ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 600, color, margin: "8px 0 4px" }}>{children}</h3>,
          blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12, margin: "8px 0", color: "var(--color-text-muted)", fontStyle: "italic" }}>{children}</blockquote>,
          hr:         () => <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "10px 0" }} />,
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            return isBlock ? (
              <pre style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "10px 14px", overflow: "auto", fontSize: 12, fontFamily: "monospace", margin: "8px 0" }}>
                <code>{children}</code>
              </pre>
            ) : (
              <code style={{ fontSize: 12, color, background: `${color}15`, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{children}</code>
            );
          },
          table:  ({ children }) => <div style={{ overflowX: "auto", margin: "12px 0", borderRadius: 10, border: "1px solid var(--color-border)" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>{children}</table></div>,
          thead:  ({ children }) => <thead style={{ background: `${color}12` }}>{children}</thead>,
          tbody:  ({ children }) => <tbody>{children}</tbody>,
          tr:     ({ children }) => <tr style={{ borderBottom: "1px solid var(--color-border)" }}>{children}</tr>,
          th:     ({ children }) => <th style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{children}</th>,
          td:     ({ children }) => <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function StepCard({ step, showThinking }: { step: AgentStep; showThinking: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const cfg = STEP_CONFIG[step.type];
  const StepIcon = cfg.icon;
  const isThought = step.type === "thought";
  if (isThought && !showThinking) return null;

  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, animation: "stepIn 0.25s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <StepIcon size={13} color={cfg.color} style={{ flexShrink: 0 }} />
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
        >
          <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{cfg.label}</span>
          {step.tool && (
            <span style={{ fontSize: 10, fontFamily: "monospace", color: cfg.color, background: `${cfg.color}18`, padding: "1px 7px", borderRadius: 5 }}>{step.tool}()</span>
          )}
          {isThought && (
            expanded
              ? <ChevronDown size={10} color={cfg.color} />
              : <ChevronRight size={10} color={cfg.color} />
          )}
        </button>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)", flexShrink: 0 }}>
          {new Date(step.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${cfg.border}` }}>
          {step.type === "tool_call" && step.args ? (
            <pre style={{ fontSize: 11, color: cfg.color, background: `${cfg.color}08`, padding: "10px 12px", borderRadius: 8, overflow: "auto", lineHeight: 1.6, margin: 0 }}>
              {JSON.stringify(step.args, null, 2)}
            </pre>
          ) : step.type === "observation" && step.result ? (
            <pre style={{ fontSize: 11, color: cfg.color, background: `${cfg.color}08`, padding: "10px 12px", borderRadius: 8, overflow: "auto", lineHeight: 1.6, margin: 0 }}>
              {JSON.stringify(step.result, null, 2)}
            </pre>
          ) : (
            <MdContent content={step.content} color={cfg.color} />
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  const [goal, setGoal]           = useState("");
  const [steps, setSteps]         = useState<AgentStep[]>([]);
  const [status, setStatus]       = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const stepsEndRef  = useRef<HTMLDivElement>(null);
  const esRef        = useRef<EventSource | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  useEffect(() => {
    if (status === "running") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const startAgent = async () => {
    if (!goal.trim() || status === "running") return;
    setSteps([]); setStatus("running"); setCampaignId(null); setElapsed(0);
    try {
      const { run_id } = await api.post<{ run_id: string }>("/api/agent/run", { goal });
      const es = new EventSource(`${API_URL}/api/agent/stream/${run_id}`);
      esRef.current = es;
      es.addEventListener("step",      (e) => setSteps(p => [...p, JSON.parse(e.data)]));
      es.addEventListener("completed", (e) => { setCampaignId(JSON.parse(e.data).campaign_id); setStatus("completed"); es.close(); });
      es.addEventListener("failed",    ()  => { setStatus("failed"); es.close(); });
      es.addEventListener("error",     ()  => { setStatus("failed"); es.close(); });
    } catch { setStatus("failed"); }
  };

  const reset = () => {
    esRef.current?.close();
    setSteps([]); setStatus("idle"); setCampaignId(null); setGoal(""); setElapsed(0);
  };

  const thoughtCount = steps.filter(s => s.type === "thought").length;
  const toolCount    = steps.filter(s => s.type === "tool_call").length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Identity card */}
        <div style={{
          background: "linear-gradient(160deg, rgba(99,102,241,0.12) 0%, rgba(167,139,250,0.07) 100%)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 18, padding: "22px 18px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(99,102,241,0.15)", filter: "blur(32px)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, position: "relative" }}>
            <div style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", borderRadius: 12, padding: 9, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(99,102,241,0.35)", flexShrink: 0 }}>
              <Bot size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                AI Campaign Agent
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 1 }}>Powered by Gemini</div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7, position: "relative" }}>
            Describe your marketing goal in plain English. The agent will autonomously segment, draft, launch, and report.
          </p>
        </div>

        {/* Capabilities */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "16px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Capabilities</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CAPABILITIES.map(({ label, icon: Icon, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: `${color}15`, borderRadius: 8, padding: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} color={color} />
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Examples */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "16px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Quick Start</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {EXAMPLES.map((eg) => (
              <button
                key={eg.text}
                onClick={() => setGoal(eg.text)}
                disabled={status === "running"}
                style={{
                  textAlign: "left", padding: "9px 11px", borderRadius: 9, cursor: "pointer",
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                  fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.45,
                  transition: "all 0.15s", display: "block", width: "100%",
                }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "rgba(99,102,241,0.4)"; el.style.background = "rgba(99,102,241,0.05)"; el.style.color = "var(--color-text-primary)"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "var(--color-border)"; el.style.background = "var(--color-surface-2)"; el.style.color = "var(--color-text-secondary)"; }}
              >
                {eg.text.slice(0, 60)}…
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT MAIN PANEL ─────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

        {/* Input Card */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 18, padding: "22px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
            Marketing Goal
          </label>
          <textarea
            className="input"
            placeholder="e.g. 'Win back customers who have not ordered in 60 days with a WhatsApp message'"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={status === "running"}
            rows={4}
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) startAgent(); }}
            style={{ marginBottom: 14, fontSize: 14, borderRadius: 12, resize: "vertical", borderColor: goal ? "rgba(99,102,241,0.4)" : undefined, transition: "border-color 0.2s" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {status === "running" ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={11} /> {elapsed}s · {toolCount} tool{toolCount !== 1 ? "s" : ""} called
                </span>
              ) : (
                <span>Cmd + Enter to run</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {status !== "idle" && (
                <button className="btn btn-ghost" onClick={reset} style={{ fontSize: 12 }}>New Goal</button>
              )}
              <button
                className="btn btn-primary"
                onClick={startAgent}
                disabled={!goal.trim() || status === "running"}
                style={{
                  fontSize: 13, minWidth: 140,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none",
                  boxShadow: goal.trim() ? "0 4px 16px rgba(99,102,241,0.35)" : "none",
                }}
              >
                {status === "running"
                  ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Running…</>
                  : <><Sparkles size={13} /> Run Agent</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Reasoning Panel */}
        {steps.length > 0 && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
            {/* Toolbar */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", background: "rgba(99,102,241,0.03)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Brain size={14} color="#818cf8" />
              <span style={{ fontWeight: 700, fontSize: 13 }}>Agent Reasoning</span>

              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { v: `${toolCount} tools`,    c: "#f59e0b" },
                  { v: `${steps.length} steps`, c: "#10b981" },
                ].map(({ v, c }) => (
                  <span key={v} style={{ fontSize: 10, fontWeight: 700, color: c, background: `${c}12`, padding: "3px 9px", borderRadius: 99 }}>{v}</span>
                ))}
              </div>

              <button
                onClick={() => setShowThinking(s => !s)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", padding: "4px 11px", borderRadius: 99, transition: "all 0.2s",
                  background: showThinking ? "rgba(129,140,248,0.15)" : "var(--color-surface-2)",
                  color: showThinking ? "#818cf8" : "var(--color-text-muted)",
                  border: `1px solid ${showThinking ? "rgba(129,140,248,0.3)" : "var(--color-border)"}`,
                }}
              >
                <Brain size={10} /> {showThinking ? "Hide" : "Show"} Thinking
                {thoughtCount > 0 && <span style={{ background: showThinking ? "#818cf8" : "var(--color-border)", color: showThinking ? "#fff" : "var(--color-text-muted)", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99 }}>{thoughtCount}</span>}
              </button>

              <div style={{ marginLeft: "auto" }}>
                {status === "running" && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.1)", padding: "4px 12px", borderRadius: 99, border: "1px solid rgba(99,102,241,0.2)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "pulse 1.2s infinite", display: "inline-block" }} />
                    Live
                  </span>
                )}
                {status === "completed" && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "4px 12px", borderRadius: 99 }}>
                    <CheckCircle2 size={11} /> Done in {elapsed}s
                  </span>
                )}
                {status === "failed" && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "4px 12px", borderRadius: 99 }}>
                    <XCircle size={11} /> Failed
                  </span>
                )}
              </div>
            </div>

            {/* Steps */}
            <div style={{ maxHeight: 560, overflowY: "auto", padding: "14px 18px" }}>
              {steps.map((step, i) => <StepCard key={i} step={step} showThinking={showThinking} />)}
              <div ref={stepsEndRef} />
            </div>

            {/* Launch banner */}
            {status === "completed" && campaignId && (
              <div style={{ margin: "0 18px 18px", padding: "16px 18px", background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.06))", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginBottom: 3 }}>Campaign launched successfully</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Live simulation is running — watch delivery, opens, clicks and orders stream in.</div>
                </div>
                <Link href={`/campaigns/${campaignId}`} className="btn btn-primary"
                  style={{ fontSize: 13, flexShrink: 0, background: "linear-gradient(135deg, #10b981, #059669)", border: "none", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
                  <Eye size={13} /> View Live Stats
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Idle placeholder */}
        {status === "idle" && steps.length === 0 && (
          <div style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)", borderRadius: 18, padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>Agent output will appear here</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Type a goal on the left or pick a quick start example</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes stepIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
      `}</style>
    </div>
  );
}
