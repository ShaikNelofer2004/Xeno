"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Bot,
  Megaphone,
  Users,
  Layers,
  Coffee,
  HeartPulse,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent",     label: "AI Agent",  icon: Bot },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/segments",  label: "Segments",  icon: Layers },
  { href: "/health",    label: "Health",    icon: HeartPulse },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{ width: collapsed ? 72 : 240, transition: "width 0.3s ease", overflow: "hidden", padding: collapsed ? "24px 12px" : "24px 16px" }}>
        {/* Logo */}
        <div 
          className="sidebar-logo" 
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: "pointer", margin: collapsed ? "0 auto 32px" : "0 0 32px 0", justifyContent: collapsed ? "center" : "flex-start", transition: "all 0.3s ease" }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <img src="/logo.png" alt="Xeno Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto", overflow: "hidden", transition: "all 0.2s ease", whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>XenoCRM</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              <Coffee size={10} style={{ display: "inline", marginRight: 3 }} />
              Brewhaus
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-nav-item ${active ? "active" : ""}`}
                style={{ justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? "10px" : "10px 12px" }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                <span style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto", overflow: "hidden", transition: "all 0.2s ease", whiteSpace: "nowrap" }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Main */}
      <main className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", marginLeft: collapsed ? 72 : 240, transition: "margin-left 0.3s ease" }}>
        {/* Top Header */}
        <header style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 24,
          marginBottom: 32,
          borderBottom: "1px solid var(--color-border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
                Shaik Nelofer
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                AP23110011470
              </div>
            </div>
            <div style={{ 
              background: "var(--color-surface)", 
              padding: 4, 
              borderRadius: "50%", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid var(--color-border)",
              display: "flex"
            }}>
              <UserButton />
            </div>
          </div>
        </header>

        <div className="animate-slide-up" style={{ flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
