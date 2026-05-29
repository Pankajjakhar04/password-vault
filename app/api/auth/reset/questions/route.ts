import { NextRequest } from "next/server";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function OPTIONS(request: NextRequest) {
  return emptyResponse(request);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!email) {
    return jsonResponse(request, { error: "Email is required." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "email, security_question_1, security_question_2, security_answer_salt, vault_key_encrypted_qa, vault_key_iv_qa"
    )
    .eq("email", email)
    .single();

  if (error || !user) {
    return jsonResponse(request, { error: "User not found." }, { status: 404 });
  }

  if (
    !user.security_question_1 ||
    !user.security_question_2 ||
    !user.security_answer_salt ||
    !user.vault_key_encrypted_qa ||
    !user.vault_key_iv_qa
  ) {
    return jsonResponse(
      request,
      { error: "Security questions not configured." },
      { status: 400 }
    );
  }

  return jsonResponse(request, {
    questionOne: user.security_question_1,
    questionTwo: user.security_question_2,
    qaSalt: user.security_answer_salt,
    vaultKeyEncryptedQa: user.vault_key_encrypted_qa,
    vaultKeyIvQa: user.vault_key_iv_qa,
  });
}
