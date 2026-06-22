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
      { label: "Πωλήσεις", href: "/sales", icon: "💰" },
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

  useEffect(() => {
    setCurrent(window.location.pathname);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-white font-semibold text-lg">CEO Dashboard</h1>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label} className="mb-4">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider px-3 mb-1">{group.label}</p>
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
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
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