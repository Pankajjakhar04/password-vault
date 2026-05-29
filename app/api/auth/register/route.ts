import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { NextRequest } from "next/server";
import { bufferToBase64Url } from "@/lib/base64";
import { jsonResponse, emptyResponse, isSameOrigin } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  clearRegisterChallenge,
  getRegisterChallenge,
  getRegisterEmail,
  getRpConfig,
  setRegisterChallenge,
  uuidToBytes,
} from "@/lib/webauthn";

export async function OPTIONS(request: NextRequest) {
  return emptyResponse(request);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const supabaseAdmin = getSupabaseAdmin();

    if (body?.stage === "start") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const pinSalt = String(body.pinSalt ?? "");
      const pinVerificationHash = String(body.pinVerificationHash ?? "");
      const qaSalt = String(body.qaSalt ?? "");
      const questionOne = String(body.questionOne ?? "");
      const questionTwo = String(body.questionTwo ?? "");
      const vaultKeyEncryptedPin = String(body.vaultKeyEncryptedPin ?? "");
      const vaultKeyIvPin = String(body.vaultKeyIvPin ?? "");
      const vaultKeyEncryptedQa = String(body.vaultKeyEncryptedQa ?? "");
      const vaultKeyIvQa = String(body.vaultKeyIvQa ?? "");

      if (!email || !pinSalt || !pinVerificationHash) {
        return jsonResponse(
          request,
          { error: "Missing registration data." },
          { status: 400 }
        );
      }

      if (
        !qaSalt ||
        !questionOne ||
        !questionTwo ||
        !vaultKeyEncryptedPin ||
        !vaultKeyIvPin ||
        !vaultKeyEncryptedQa ||
        !vaultKeyIvQa
      ) {
        return jsonResponse(
          request,
          { error: "Missing security question data." },
          { status: 400 }
        );
      }

      if (questionOne === questionTwo) {
        return jsonResponse(
          request,
          { error: "Security questions must be different." },
          { status: 400 }
        );
      }

        const { data: existing, error: lookupError } = await supabaseAdmin
          .from("users")
          .select("id, email, webauthn_credential_id")
          .eq("email", email)
          .maybeSingle();

        if (lookupError) {
          return jsonResponse(
            request,
            { error: lookupError.message ?? "Unable to check user." },
            { status: 500 }
          );
        }

        if (existing?.webauthn_credential_id) {
          return jsonResponse(
            request,
            { error: "User already registered. Use unlock." },
            { status: 409 }
          );
        }

        let userId = existing?.id;

        if (existing) {
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("users")
            .update({
              pin_salt: pinSalt,
              pin_verification_hash: pinVerificationHash,
              security_question_1: questionOne,
              security_question_2: questionTwo,
              security_answer_salt: qaSalt,
              vault_key_encrypted_pin: vaultKeyEncryptedPin,
              vault_key_iv_pin: vaultKeyIvPin,
              vault_key_encrypted_qa: vaultKeyEncryptedQa,
              vault_key_iv_qa: vaultKeyIvQa,
              pin_attempts: 0,
              pin_locked_until: null,
            })
            .eq("id", existing.id)
            .select("id")
            .single();

          if (updateError || !updated) {
            return jsonResponse(
              request,
              { error: updateError?.message ?? "Unable to update user." },
              { status: 500 }
            );
          }

          userId = updated.id;
        } else {
          const { data, error } = await supabaseAdmin
            .from("users")
            .insert({
              email,
              pin_salt: pinSalt,
              pin_verification_hash: pinVerificationHash,
              security_question_1: questionOne,
              security_question_2: questionTwo,
              security_answer_salt: qaSalt,
              vault_key_encrypted_pin: vaultKeyEncryptedPin,
              vault_key_iv_pin: vaultKeyIvPin,
              vault_key_encrypted_qa: vaultKeyEncryptedQa,
              vault_key_iv_qa: vaultKeyIvQa,
              pin_attempts: 0,
            })
            .select("id")
            .single();

          if (error || !data) {
            const status = error?.code === "23505" ? 409 : 500;
            return jsonResponse(
              request,
              { error: error?.message ?? "Unable to create user." },
              { status }
            );
          }

          userId = data.id;
        }

      const { rpID, rpName } = getRpConfig();

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: uuidToBytes(userId),
        userName: email,
        attestationType: "none",
        authenticatorSelection: {
          userVerification: "required",
        },
      });

      const response = jsonResponse(request, { options });
      setRegisterChallenge(response, options.challenge, email);
      return response;
    }

    if (body?.stage === "finish") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const credential = body.credential;

      if (!email || !credential) {
        return jsonResponse(
          request,
          { error: "Missing WebAuthn response." },
          { status: 400 }
        );
      }

      const expectedChallenge = getRegisterChallenge(request);
      const expectedEmail = getRegisterEmail(request);

      if (!expectedChallenge || expectedEmail !== email) {
        return jsonResponse(
          request,
          { error: "Registration challenge expired." },
          { status: 400 }
        );
      }

      const { rpID, origin } = getRpConfig();

      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return jsonResponse(
          request,
          { error: "Registration could not be verified." },
          { status: 401 }
        );
      }

      const { credential: registrationCredential } =
        verification.registrationInfo;

      const update = await supabaseAdmin
        .from("users")
        .update({
          webauthn_credential_id: registrationCredential.id,
          webauthn_public_key: bufferToBase64Url(
            registrationCredential.publicKey
          ),
          webauthn_counter: registrationCredential.counter,
        })
        .eq("email", email)
        .select("id")
        .single();

      if (update.error || !update.data) {
        return jsonResponse(
          request,
          { error: update.error?.message ?? "Unable to save WebAuthn key." },
          { status: 500 }
        );
      }

      const response = jsonResponse(request, { success: true });
      clearRegisterChallenge(response);
      return response;
    }

    return jsonResponse(request, { error: "Invalid request." }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed.";
    return jsonResponse(request, { error: message }, { status: 500 });
  }
}
