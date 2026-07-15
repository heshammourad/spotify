import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/session";
import Link from "next/link";
import Image from "next/image";
import { Music, RefreshCw, LogOut, Disc } from "lucide-react";
import { BASE_PATH } from "@/lib/config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Spotify DJ Tools - Playlists & Chart Automation",
  description: "Automate your Spotify playlists, sync Billboard chart hits weekly, and effortlessly clean up duplicate tracks in your library.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="app-container hero-gradient">
        <header>
          <nav className="navbar" id="navbar">
            <Link href="/" className="nav-brand" id="logo-link">
              <Disc className="spotify-icon" size={24} style={{ color: "var(--spotify-green)" }} />
              Spotify<span>Tools</span>
            </Link>
            
            {session && (
              <div className="nav-menu" id="nav-menu">
                <Link href="/playlists" className="nav-link" id="nav-playlists">
                  <Music size={16} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} />
                  Playlists
                </Link>
                <Link href="/update-charts" className="nav-link" id="nav-charts">
                  <RefreshCw size={16} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} />
                  Update Charts
                </Link>
                
                <div className="user-profile-badge" id="user-badge">
                  {session.user.image ? (
                    <Image src={session.user.image} alt={session.user.name} width={24} height={24} unoptimized />
                  ) : (
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "var(--spotify-green)", color: "#000",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: "bold", fontSize: "0.75rem"
                    }}>
                      {session.user.name.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span>{session.user.name}</span>
                </div>
                
                <a href={`${BASE_PATH}/api/auth/logout`} className="btn-icon" id="logout-button" title="Log Out">
                  <LogOut size={16} style={{ color: "var(--danger)" }} />
                </a>
              </div>
            )}
          </nav>
        </header>
        
        <main className="main-content" id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
