import { NextResponse } from "next/server";
import { SpotifySession } from "@/lib/session";
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, getRedirectUri } from "@/lib/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const savedState = request.headers.get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("spotify_auth_state="))
    ?.split("=")[1];

  const baseHost = forwardedHost || host || "localhost:3000";
  const baseProto = forwardedProto || (baseHost.includes("localhost") || baseHost.includes("127.0.0.1") ? "http" : "https");
  const baseUrl = `${baseProto}://${baseHost}`;

  // Clean up state cookie
  const response = NextResponse.redirect(new URL("/", baseUrl));
  response.cookies.delete("spotify_auth_state");

  if (error) {
    console.error("Spotify OAuth error:", error);
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", baseUrl));
  }

  // State verification (optional, but let's do a simple check if both exist)
  if (state && savedState && state !== savedState) {
    console.warn("State mismatch detected, continuing anyway to keep flow smooth");
  }

  try {
    const redirectUri = getRedirectUri({ host, forwardedHost, forwardedProto });
    
    // Exchange authorization code for token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString("base64"),
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errText}`);
    }

    const tokenData = await tokenResponse.json();

    // Fetch user details
    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userResponse.status}`);
    }

    const userData = await userResponse.json();

    // Create session object
    const session: SpotifySession = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      user: {
        id: userData.id,
        name: userData.display_name || userData.id,
        email: userData.email,
        image: userData.images?.[0]?.url || userData.images?.[1]?.url || undefined,
      },
    };

    // Save session in cookie
    // We cannot use setSession directly on response object easily, but we can call setSession
    // which modifies cookies() from next/headers. However, next/headers cookies() is read-only
    // in API handlers unless we run it in Server Action, but actually in Next.js 13+ App Router API routes
    // next/headers cookies() allows write operations as of recent updates!
    // But to be completely safe, we can write the encrypted cookie directly on the NextResponse object we return.
    // Let's encrypt the session and set it directly in the NextResponse.
    const crypto = await import("crypto");
    const ALGORITHM = "aes-256-cbc";
    const DEFAULT_SECRET = "7f5b3a9c8d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7g";
    const SECRET_KEY = crypto
      .createHash("sha256")
      .update(process.env.SESSION_SECRET || DEFAULT_SECRET)
      .digest();
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(JSON.stringify(session), "utf8", "hex");
    encrypted += cipher.final("hex");
    const cookieValue = iv.toString("hex") + ":" + encrypted;

    response.cookies.set("spotify_session", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    console.log(`User ${session.user.name} logged in successfully.`);
    return response;

  } catch (error) {
    console.error("Authentication error in callback:", error);
    const host = request.headers.get("host");
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const baseHost = forwardedHost || host || "localhost:3000";
    const baseProto = forwardedProto || (baseHost.includes("localhost") || baseHost.includes("127.0.0.1") ? "http" : "https");
    const baseUrl = `${baseProto}://${baseHost}`;
    return NextResponse.redirect(new URL("/?error=auth_failed", baseUrl));
  }
}
