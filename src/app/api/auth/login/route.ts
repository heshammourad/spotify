import { NextResponse } from "next/server";
import { SPOTIFY_CLIENT_ID, SCOPES, getRedirectUri } from "@/lib/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  
  console.log("--- Spotify Login API Hit ---");
  console.log("host header:", host);
  console.log("x-forwarded-host header:", forwardedHost);
  console.log("x-forwarded-proto header:", forwardedProto);
  
  const redirectUri = getRedirectUri({ host, forwardedHost, forwardedProto });
  console.log("Generated redirectUri:", redirectUri);
  const state = Math.random().toString(36).substring(2, 15);

  const spotifyAuthUrl = new URL("https://accounts.spotify.com/authorize");
  spotifyAuthUrl.searchParams.append("response_type", "code");
  spotifyAuthUrl.searchParams.append("client_id", SPOTIFY_CLIENT_ID);
  spotifyAuthUrl.searchParams.append("scope", SCOPES);
  spotifyAuthUrl.searchParams.append("redirect_uri", redirectUri);
  spotifyAuthUrl.searchParams.append("state", state);
  
  // Optionally support forcing login dialog
  const showDialog = searchParams.get("show_dialog");
  if (showDialog === "true") {
    spotifyAuthUrl.searchParams.append("show_dialog", "true");
  }

  // We can set state in a cookie to verify it later, but for this app it's optional
  const response = NextResponse.redirect(spotifyAuthUrl.toString());
  response.cookies.set("spotify_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600, // 1 hour
  });

  return response;
}
