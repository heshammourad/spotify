import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  const baseHost = forwardedHost || host || "localhost:3000";
  const baseProto = forwardedProto || (baseHost.includes("localhost") || baseHost.includes("127.0.0.1") ? "http" : "https");
  const baseUrl = `${baseProto}://${baseHost}`;

  const response = NextResponse.redirect(new URL("/", baseUrl));
  
  // Clear the session cookie
  response.cookies.delete("spotify_session");
  
  return response;
}
