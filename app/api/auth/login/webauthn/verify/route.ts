import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { NextRequest } from "next/server";
import { base64UrlToBuffer } from "@/lib/base64";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { getSessionFromRequest, setSessionCookie } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  clearLoginChallenge,
  getLoginChallenge,
  getLoginEmail,
  getRpConfig,
} from "@/lib/webauthn";

export async function OPTIONS(request: NextRequest) {
  return emptyResponse(request);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const credential = body.credential;
  const supabaseAdmin = getSupabaseAdmin();

  if (!email || !credential) {
    return jsonResponse(
      request,
      { error: "Missing WebAuthn assertion." },
      { status: 400 }
    );
  }

  const expectedChallenge = getLoginChallenge(request);
  const expectedEmail = getLoginEmail(request);

  if (!expectedChallenge || expectedEmail !== email) {
    return jsonResponse(
      request,
      { error: "Authentication challenge expired." },
      { status: 400 }
    );
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, email, webauthn_credential_id, webauthn_public_key, webauthn_counter"
    )
    .eq("email", email)
    .single();

  if (error || !user || !user.webauthn_credential_id || !user.webauthn_public_key) {
    return jsonResponse(
      request,
      { error: "WebAuthn credential missing." },
      { status: 404 }
    );
  }

  const { rpID, origin } = getRpConfig();

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: user.webauthn_credential_id,
      publicKey: base64UrlToBuffer(user.webauthn_public_key),
      counter: user.webauthn_counter ?? 0,
    },
  });

  if (!verification.verified) {
    return jsonResponse(
      request,
      { error: "WebAuthn verification failed." },
      { status: 401 }
    );
  }

  await supabaseAdmin
    .from("users")
    .update({ webauthn_counter: verification.authenticationInfo.newCounter })
    .eq("id", user.id);

  const existing = getSessionFromRequest(request);
  const sessionPayload = {
    sub: user.id,
    email: user.email,
    pinVerified: existing?.pinVerified ?? false,
    webauthnVerified: true,
    webauthnVerifiedAt: Date.now(),
  };

  const response = jsonResponse(request, {
    success: true,
    pinVerified: sessionPayload.pinVerified,
    webauthnVerified: true,
  });
  setSessionCookie(response, sessionPayload);
  clearLoginChallenge(response);
  return response;
}
