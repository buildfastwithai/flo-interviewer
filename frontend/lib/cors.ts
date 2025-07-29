import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token, Authorization, X-Requested-With, X-HTTP-Method-Override, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Methods, Access-Control-Allow-Credentials, Origin, Referer, User-Agent",
  "Access-Control-Expose-Headers":
    "X-Response-Time, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
  "Access-Control-Max-Age": "86400",
};

export function createCorsResponse(data: any, options?: ResponseInit) {
  return NextResponse.json(data, {
    ...options,
    headers: {
      ...corsHeaders,
      ...options?.headers,
    },
  });
}

export function createCorsErrorResponse(error: string, status: number = 500) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: corsHeaders,
    }
  );
}

export function addCorsHeaders(response: NextResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
