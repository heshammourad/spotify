import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const isProduction = process.env.NODE_ENV === "production";

  const fromPortal = request.headers.get("x-from-portal") === "true";

  if (isProduction && !fromPortal && host && host !== "heshammourad.com") {
    const isVercelPreview = host.endsWith(".vercel.app") && host !== "heshammourad-spotify.vercel.app";

    if (!isVercelPreview) {
      return new NextResponse(
        JSON.stringify({
          error: "Direct access is prohibited. Please visit heshammourad.com instead.",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
