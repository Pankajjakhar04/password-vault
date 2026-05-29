import { NextRequest } from "next/server";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { requireRecentWebauthnOnly } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function OPTIONS(request: NextRequest) {
  return emptyResponse(request);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const session = requireRecentWebauthnOnly(request);
  if (!session) {
    return jsonResponse(
      request,
      { error: "Fingerprint verification required." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const pinSalt = String(body.pinSalt ?? "");
  const pinVerificationHash = String(body.pinVerificationHash ?? "");
  const vaultKeyEncryptedPin = String(body.vaultKeyEncryptedPin ?? "");
  const vaultKeyIvPin = String(body.vaultKeyIvPin ?? "");

  if (!email || !pinSalt || !pinVerificationHash || !vaultKeyEncryptedPin || !vaultKeyIvPin) {
    return jsonResponse(request, { error: "Missing reset data." }, { status: 400 });
  }

  if (session.email !== email) {
    return jsonResponse(request, { error: "Session mismatch." }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from("users")
    .update({
      pin_salt: pinSalt,
      pin_verification_hash: pinVerificationHash,
      vault_key_encrypted_pin: vaultKeyEncryptedPin,
      vault_key_iv_pin: vaultKeyIvPin,
      pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq("email", email);

  if (error) {
    return jsonResponse(
      request,
      { error: error.message ?? "Unable to reset PIN." },
      { status: 500 }
    );
  }

  return jsonResponse(request, { success: true });
}
