import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#fff", color: "#0f0a1e" }}>

      {/* ─── Navbar ─── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              fontSize: 18, boxShadow: "0 4px 14px rgba(109,40,217,0.35)"
            }}><img src="/logo.png" alt="Xeno Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px", color: "#0f0a1e" }}>XenoCRM</span>
          </div>

          {/* Nav Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href="#features" style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", textDecoration: "none", padding: "8px 14px", borderRadius: 8, transition: "color 0.2s" }}>Features</a>
            <a href="#stats" style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", textDecoration: "none", padding: "8px 14px", borderRadius: 8 }}>Stats</a>
            {userId ? (
              <Link href="/dashboard" style={{
                fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none",
                background: "linear-gradient(135deg, #6D28D9, #4F46E5)",
                padding: "9px 22px", borderRadius: 99,
                boxShadow: "0 4px 14px rgba(109,40,217,0.35)",
              }}>Go to Dashboard →</Link>
            ) : (
              <>
                <Link href="/sign-in" style={{ fontSize: 14, fontWeight: 500, color: "#374151", textDecoration: "none", padding: "9px 16px", borderRadius: 99 }}>Sign In</Link>
                <SignInButton mode="modal">
                  <button style={{
                    fontSize: 14, fontWeight: 600, color: "#fff", border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #6D28D9, #4F46E5)",
                    padding: "9px 22px", borderRadius: 99,
                    boxShadow: "0 4px 14px rgba(109,40,217,0.35)",
                  }}>Get Started Free</button>
                </SignInButton>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section style={{
        flex: 1, maxWidth: 1100, margin: "0 auto", padding: "80px 24px 60px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center",
        width: "100%",
      }}>
        {/* Left — Copy */}
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#f3f0ff", color: "#6D28D9", fontSize: 13, fontWeight: 600,
            padding: "6px 14px", borderRadius: 99, marginBottom: 24,
            border: "1px solid #ddd6fe"
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6D28D9", display: "inline-block", animation: "pulse 2s infinite" }} />
            AI-Powered CRM Platform
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20, color: "#0f0a1e" }}>
            Run campaigns on<br />
            <span style={{ background: "linear-gradient(135deg, #6D28D9, #4F46E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              autopilot with AI
            </span>
          </h1>

          <p style={{ fontSize: 17, lineHeight: 1.7, color: "#6b7280", marginBottom: 36, maxWidth: 460 }}>
            XenoCRM's autonomous agent segments your audience, drafts personalised messages, launches campaigns across channels, and reports back — all in seconds.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {userId ? (
              <Link href="/dashboard" style={{
                fontSize: 15, fontWeight: 700, color: "#fff", textDecoration: "none",
                background: "linear-gradient(135deg, #6D28D9, #4F46E5)",
                padding: "14px 32px", borderRadius: 12,
                boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
                display: "inline-block",
              }}>Open Dashboard →</Link>
            ) : (
              <SignInButton mode="modal">
                <button style={{
                  fontSize: 15, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #6D28D9, #4F46E5)",
                  padding: "14px 32px", borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
                }}>Start Free →</button>
              </SignInButton>
            )}
            <a href="#features" style={{ fontSize: 14, fontWeight: 600, color: "#6D28D9", textDecoration: "none" }}>See how it works ↓</a>
          </div>


        </div>

        {/* Right — Dashboard Mockup */}
        <div style={{ position: "relative" }}>
          {/* Glow */}
          <div style={{
            position: "absolute", inset: -20, borderRadius: 32,
            background: "radial-gradient(ellipse at 60% 40%, rgba(109,40,217,0.12), transparent 70%)",
            pointerEvents: "none",
          }} />
          {/* Card */}
          <div style={{
            borderRadius: 20, border: "1px solid #e5e7eb",
            background: "#fff",
            boxShadow: "0 24px 80px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}>
            {/* Window bar */}
            <div style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ marginLeft: 12, fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>localhost:3000/dashboard</span>
            </div>
            {/* Mockup content */}
            <div style={{ padding: 24, background: "#fafafa" }}>
              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Total Customers", value: "500", color: "#6D28D9" },
                  { label: "Revenue", value: "₹2.4L", color: "#10b981" },
                  { label: "Campaigns", value: "12", color: "#f59e0b" },
                ].map(k => (
                  <div key={k.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              {/* Agent thinking */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6D28D9", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6D28D9", display: "inline-block" }} />
                  AI Agent Running...
                </div>
                {[
                  { step: "✅ Segmented 85 Gold tier customers", done: true },
                  { step: "✅ Drafted email message", done: true },
                  { step: "⚡ Launching campaign...", done: false },
                ].map((s, i) => (
                  <div key={i} style={{ fontSize: 12, padding: "5px 0", color: s.done ? "#374151" : "#6D28D9", fontWeight: s.done ? 400 : 600 }}>{s.step}</div>
                ))}
              </div>
              {/* Mini funnel bars */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Delivery Funnel</div>
                {[
                  { label: "Delivered", pct: 80, color: "#6D28D9" },
                  { label: "Opened", pct: 34, color: "#10b981" },
                  { label: "Clicked", pct: 18, color: "#f59e0b" },
                ].map(b => (
                  <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "#6b7280", width: 64 }}>{b.label}</span>
                    <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 99 }}>
                      <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, width: 30 }}>{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section id="stats" style={{ background: "#faf5ff", borderTop: "1px solid #ede9fe", borderBottom: "1px solid #ede9fe", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, textAlign: "center" }}>
          {[
            { value: "500+", label: "Customers Seeded" },
            { value: "4", label: "Delivery Channels" },
            { value: "95%", label: "Delivery Rate" },
            { value: "< 3s", label: "Simulation Speed" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#6D28D9", letterSpacing: "-1px" }}>{s.value}</div>
              <div style={{ fontSize: 14, color: "#7c3aed", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px", color: "#0f0a1e" }}>Everything you need to run<br />intelligent campaigns</h2>
          <p style={{ fontSize: 16, color: "#6b7280", marginTop: 12 }}>Built for the modern marketer who wants results, not complexity.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            {
              icon: "🧠",
              title: "Gemini ReAct Agent",
              desc: "An autonomous AI loop that reasons, acts, and observes — planning campaigns end-to-end without manual steps.",
              color: "#6D28D9",
            },
            {
              icon: "🎯",
              title: "Smart Segmentation",
              desc: "Filter customers by RFM metrics, tier, city, recency, and spend. The agent picks the perfect audience automatically.",
              color: "#4F46E5",
            },
            {
              icon: "✍️",
              title: "Auto Copywriting",
              desc: "Gemini drafts personalized messages for each channel — WhatsApp, SMS, Email, RCS — with the right tone and length.",
              color: "#7C3AED",
            },
            {
              icon: "📡",
              title: "Omnichannel Delivery",
              desc: "Campaigns fire across 4 channels with probabilistic simulation of delivery, opens, clicks, and purchases.",
              color: "#2563EB",
            },
            {
              icon: "📊",
              title: "Live Analytics",
              desc: "Watch the delivery funnel fill up in real-time. Revenue attributed, orders placed, and click rates update live.",
              color: "#059669",
            },
            {
              icon: "🔁",
              title: "Auto Retry Logic",
              desc: "Failed deliveries? The agent detects them and autonomously launches a retry campaign on an alternate channel.",
              color: "#D97706",
            },
          ].map(f => (
            <div key={f.title} style={{
              padding: 28, borderRadius: 16, border: "1px solid #f0f0f0",
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.2s",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, fontSize: 22,
                background: `${f.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f0a1e", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{
        margin: "0 24px 80px",
        background: "linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)",
        borderRadius: 24, padding: "64px 48px",
        textAlign: "center",
        maxWidth: 1100, marginLeft: "auto", marginRight: "auto",
        boxShadow: "0 20px 60px rgba(109,40,217,0.3)",
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 12 }}>
          Ready to launch your first AI campaign?
        </h2>
        <p style={{ fontSize: 16, color: "#ddd6fe", marginBottom: 32 }}>
          Sign in and let the AI agent do the heavy lifting.
        </p>
        {userId ? (
          <Link href="/dashboard" style={{
            fontSize: 16, fontWeight: 700, color: "#6D28D9", textDecoration: "none",
            background: "#fff", padding: "15px 36px", borderRadius: 12,
            display: "inline-block", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}>Open Dashboard →</Link>
        ) : (
          <SignInButton mode="modal">
            <button style={{
              fontSize: 16, fontWeight: 700, color: "#6D28D9", border: "none", cursor: "pointer",
              background: "#fff", padding: "15px 36px", borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}>Get Started Free →</button>
          </SignInButton>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              fontSize: 14
            }}><img src="/logo.png" alt="Xeno Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
            <span style={{ fontWeight: 700, color: "#0f0a1e", fontSize: 15 }}>XenoCRM</span>
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Built for Xeno Engineering Internship Assignment · 2026</p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Features", "Dashboard", "Sign In"].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
