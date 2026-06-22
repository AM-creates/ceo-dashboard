'use client';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const navGroups = [
  {
    label: "Γενικά",
    items: [
      { label: "Dashboard", href: "/", icon: "📊" },
      { label: "Ημερολόγιο", href: "/calendar", icon: "📅" },
    ]
  },
  {
    label: "Πωλήσεις",
    items: [
      { label: "Παραγγελίες", href: "/orders", icon: "🧾" },
      { label: "Πελάτες", href: "/customers", icon: "👥" },
      { label: "Τιμοκατάλογος", href: "/pricing", icon: "💲" },
    ]
  },
  {
    label: "Αγορές",
    items: [
      { label: "Αγορές", href: "/purchases", icon: "🛒" },
      { label: "Προμηθευτές", href: "/suppliers", icon: "🏢" },
    ]
  },
  {
    label: "Αποθήκη",
    items: [
      { label: "Προϊόντα", href: "/products", icon: "📦" },
      { label: "Αποθήκη", href: "/inventory", icon: "🏭" },
    ]
  },
  {
    label: "Αναλύσεις",
    items: [
      { label: "Reports", href: "/reports", icon: "📈" },
    ]
  },
  {
    label: "Ρυθμίσεις",
    items: [
      { label: "Ρυθμίσεις", href: "/settings", icon: "⚙️" },
    ]
  },
];

function Sidebar() {
  const [current, setCurrent] = useState("/");
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);

  useEffect(() => {
    setCurrent(window.location.pathname);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const toggleGroup = (label: string) => {
    setCollapsed(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg tracking-tight">CEO Dashboard</h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {navGroups.map(group => {
          const isCollapsed = collapsed.includes(group.label);
          const isActive = group.items.some(i => i.href === current);
          return (
            <div key={group.label} className="mb-2">
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}>
                <span>{group.label}</span>
                <span className="text-gray-500 text-xs">{isCollapsed ? '▶' : '▼'}</span>
              </button>
              {!isCollapsed && (
                <div className="mt-0.5">
                  {group.items.map(item => (
                    <a key={item.href} href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 text-sm transition-colors ${
                        current === item.href
                          ? "bg-purple-600 text-white font-medium"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-gray-800">
        {user && (
          <div className="px-3 py-2 mb-2 bg-gray-800 rounded-xl">
            <p className="text-white text-xs font-medium truncate">👤 {user.email}</p>
          </div>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <span>🚪</span>
          <span>Έξοδος</span>
        </button>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-gray-950">
        <Sidebar />
        <main className="flex-1 ml-56">
          {children}
        </main>
      </body>
    </html>
  );
}