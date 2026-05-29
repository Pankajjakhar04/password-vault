import { NextRequest } from "next/server";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { requireRecentWebauthn, requireVaultSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function OPTIONS(request: NextRequest) {
  return emptyResponse(request);
}

export async function GET(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const session = requireVaultSession(request);
  if (!session) {
    return jsonResponse(request, { error: "Unauthorized." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("notes")
    .select("id, title, encrypted_body, iv, created_at, updated_at")
    .eq("user_id", session.sub)
    .order("updated_at", { ascending: false });

  if (error) {
    return jsonResponse(request, { error: error.message }, { status: 500 });
  }

  return jsonResponse(request, { notes: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const session = requireRecentWebauthn(request);
  if (!session) {
    return jsonResponse(
      request,
      { error: "Fingerprint verification required." },
      { status: 401 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const encryptedBody = String(body.encryptedBody ?? "");
  const iv = String(body.iv ?? "");

  if (!encryptedBody || !iv) {
    return jsonResponse(
      request,
      { error: "Missing note data." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("notes")
    .insert({
      user_id: session.sub,
      title,
      encrypted_body: encryptedBody,
      iv,
    })
    .select("id, title, encrypted_body, iv, created_at, updated_at")
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? "Unable to save note." },
      { status: 500 }
    );
  }

  return jsonResponse(request, { note: data }, { status: 201 });
}
