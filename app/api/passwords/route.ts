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
    .from("vault_entries")
    .select(
      "id, site_name, username, encrypted_password, iv, created_at, updated_at"
    )
    .eq("user_id", session.sub)
    .order("updated_at", { ascending: false });

  if (error) {
    return jsonResponse(
      request,
      { error: error.message },
      { status: 500 }
    );
  }

  return jsonResponse(request, { entries: data ?? [] });
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
  const siteName = String(body.siteName ?? "").trim();
  const username = String(body.username ?? "").trim();
  const encryptedPassword = String(body.encryptedPassword ?? "");
  const iv = String(body.iv ?? "");

  if (!siteName || !username || !encryptedPassword || !iv) {
    return jsonResponse(
      request,
      { error: "Missing entry data." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("vault_entries")
    .insert({
      user_id: session.sub,
      site_name: siteName,
      username,
      encrypted_password: encryptedPassword,
      iv,
    })
    .select(
      "id, site_name, username, encrypted_password, iv, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? "Unable to save entry." },
      { status: 500 }
    );
  }

  return jsonResponse(request, { entry: data }, { status: 201 });
}
