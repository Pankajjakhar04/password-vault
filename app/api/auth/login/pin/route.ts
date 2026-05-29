import { NextRequest } from "next/server";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { getSessionFromRequest, setSessionCookie } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const lockoutThreshold = 5;
const lockoutSeconds = 30;

export async function OPTIONS(request: NextRequest) {
  return emptyResponse(request);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const supabaseAdmin = getSupabaseAdmin();

  if (!email) {
    return jsonResponse(request, { error: "Email is required." }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, email, pin_verification_hash, pin_attempts, pin_locked_until, pin_salt, vault_key_encrypted_pin, vault_key_iv_pin"
    )
    .eq("email", email)
    .single();

  if (error || !user) {
    return jsonResponse(request, { error: "User not found." }, { status: 404 });
  }

  if (body?.action === "salt") {
    return jsonResponse(request, { pinSalt: user.pin_salt });
  }

  const pinVerificationHash = String(body.pinVerificationHash ?? "");
  if (!pinVerificationHash) {
    return jsonResponse(request, { error: "PIN hash required." }, { status: 400 });
  }

  if (user.pin_locked_until) {
    const lockedUntil = new Date(user.pin_locked_until).getTime();
    if (lockedUntil > Date.now()) {
      const retryAfterSeconds = Math.ceil(
        (lockedUntil - Date.now()) / 1000
      );
      return jsonResponse(
        request,
        {
          error: "Too many attempts. Try again soon.",
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    await supabaseAdmin
      .from("users")
      .update({ pin_locked_until: null })
      .eq("id", user.id);
  }

  if (user.pin_verification_hash !== pinVerificationHash) {
    const attempts = (user.pin_attempts ?? 0) + 1;
    const shouldLock = attempts >= lockoutThreshold;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + lockoutSeconds * 1000).toISOString()
      : null;

    await supabaseAdmin
      .from("users")
      .update({
        pin_attempts: shouldLock ? 0 : attempts,
        pin_locked_until: lockedUntil,
      })
      .eq("id", user.id);

    return jsonResponse(
      request,
      {
        error: shouldLock ? "Locked out." : "Invalid PIN.",
        retryAfterSeconds: shouldLock ? lockoutSeconds : null,
      },
      { status: shouldLock ? 429 : 401 }
    );
  }

  await supabaseAdmin
    .from("users")
    .update({ pin_attempts: 0, pin_locked_until: null })
    .eq("id", user.id);

  const existing = getSessionFromRequest(request);
  const sessionPayload = {
    sub: user.id,
    email: user.email,
    pinVerified: true,
    webauthnVerified: existing?.webauthnVerified ?? false,
    webauthnVerifiedAt: existing?.webauthnVerifiedAt,
  };

  const response = jsonResponse(request, {
    success: true,
    pinVerified: true,
    webauthnVerified: sessionPayload.webauthnVerified,
    vaultKeyEncryptedPin: user.vault_key_encrypted_pin,
    vaultKeyIvPin: user.vault_key_iv_pin,
  });
  setSessionCookie(response, sessionPayload);
  return response;
}
