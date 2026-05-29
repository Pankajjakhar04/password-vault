import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextRequest } from "next/server";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { getRpConfig, setLoginChallenge } from "@/lib/webauthn";

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
    .select("id, email, webauthn_credential_id")
    .eq("email", email)
    .single();

  if (error || !user || !user.webauthn_credential_id) {
    return jsonResponse(
      request,
      { error: "WebAuthn credential not found." },
      { status: 404 }
    );
  }

  const { rpID } = getRpConfig();

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: [
      {
        id: user.webauthn_credential_id,
      },
    ],
  });

  const response = jsonResponse(request, { options });
  setLoginChallenge(response, options.challenge, email);
  return response;
}
