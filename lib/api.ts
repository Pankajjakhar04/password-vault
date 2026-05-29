import { NextRequest, NextResponse } from "next/server";

const allowedMethods = "GET,POST,PUT,DELETE,OPTIONS";

export const isSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return true;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

const withCors = (request: NextRequest, response: NextResponse) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const allowedOrigin =
    origin && host && isSameOrigin(request) ? origin : "null";

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", allowedMethods);
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Vary", "Origin");

  return response;
};

export const jsonResponse = (
  request: NextRequest,
  data: Record<string, unknown>,
  init?: ResponseInit
) => {
  const response = NextResponse.json(data, init);
  return withCors(request, response);
};

export const emptyResponse = (request: NextRequest, status = 204) => {
  const response = new NextResponse(null, { status });
  return withCors(request, response);
};
