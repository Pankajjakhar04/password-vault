import { NextRequest } from "next/server";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { clearSessionCookie } from "@/lib/jwt";

export async function OPTIONS(request: NextRequest) {
  return emptyResponse(request);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const response = jsonResponse(request, { success: true });
  clearSessionCookie(response);
  return response;
}