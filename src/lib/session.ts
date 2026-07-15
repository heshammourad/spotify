import crypto from "crypto";
import { cookies } from "next/headers";

const ALGORITHM = "aes-256-cbc";
const DEFAULT_SECRET = "7f5b3a9c8d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7g";
const SECRET_KEY = crypto
  .createHash("sha256")
  .update(process.env.SESSION_SECRET || DEFAULT_SECRET)
  .digest();
const IV_LENGTH = 16; // For AES-256-CBC

export interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // millisecond timestamp
  user: {
    id: string;
    name: string;
    email?: string;
    image?: string;
  };
}

// Encrypt string helper
function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// Decrypt string helper
function decrypt(text: string): string {
  const parts = text.split(":");
  const ivString = parts.shift();
  if (!ivString) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(ivString, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  // Specify type explicitly to avoid ts compile issues
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

export async function getSession(): Promise<SpotifySession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("spotify_session");
  
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const decrypted = decrypt(sessionCookie.value);
    const session = JSON.parse(decrypted) as SpotifySession;
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      // Need to refresh token
      return await refreshSessionToken(session);
    }

    return session;
  } catch (error) {
    console.error("Error reading session cookie:", error);
    return null;
  }
}

export async function setSession(session: SpotifySession): Promise<void> {
  const cookieStore = await cookies();
  const serialized = JSON.stringify(session);
  const encrypted = encrypt(serialized);

  // Set for 30 days
  cookieStore.set("spotify_session", encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("spotify_session");
}

async function refreshSessionToken(session: SpotifySession): Promise<SpotifySession | null> {
  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "1a8e8e375a4145c0b67e51b893fb07b1";
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "c5db802b1b3f47e28d3f72162ea7fde4";

  console.log(`Refreshing access token for user ${session.user.id}...`);

  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString("base64"),
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Failed to refresh Spotify token: ${response.status}`, errBody);
      // Clear session if refresh fails (unauthorized/invalid grant)
      try {
        await deleteSession();
      } catch (cookieError) {
        console.warn("Could not delete session cookie (read-only cookie context):", cookieError);
      }
      return null;
    }

    const data = await response.json();
    
    const updatedSession: SpotifySession = {
      ...session,
      accessToken: data.access_token,
      // Spotify might not send a new refresh token, fallback to old one
      refreshToken: data.refresh_token || session.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    try {
      await setSession(updatedSession);
      console.log("Access token refreshed successfully.");
    } catch (cookieError) {
      console.warn("Could not save refreshed session to cookie (read-only cookie context):", cookieError);
    }
    return updatedSession;
  } catch (error) {
    console.error("Error refreshing session token:", error);
    try {
      await deleteSession();
    } catch (cookieError) {
      console.warn("Could not delete session cookie (read-only cookie context):", cookieError);
    }
    return null;
  }
}
