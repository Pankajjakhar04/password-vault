import { NextRequest } from "next/server";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { requireRecentWebauthn, requireVaultSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function OPTIONS(request: NextRequest) {
  return emptyResponse(request);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    .update({
      title,
      encrypted_body: encryptedBody,
      iv,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", session.sub)
    .select("id, title, encrypted_body, iv, created_at, updated_at")
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? "Unable to update note." },
      { status: 500 }
    );
  }

  return jsonResponse(request, { note: data });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const session = requireVaultSession(request);
  if (!session) {
    return jsonResponse(request, { error: "Unauthorized." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("notes")
    .delete()
    .eq("id", params.id)
    .eq("user_id", session.sub);

  if (error) {
    return jsonResponse(request, { error: error.message }, { status: 500 });
  }

  return jsonResponse(request, { success: true });
}
