import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
          "Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token, Authorization, X-Requested-With, X-HTTP-Method-Override, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Methods, Access-Control-Allow-Credentials, Origin, Referer, User-Agent",
        "Access-Control-Expose-Headers":
          "X-Response-Time, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Continue with the request for non-OPTIONS methods
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
