"use client";

import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";

const bufferToBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlToBuffer = (base64Url: string) => {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export function decodeRegistrationOptions(
  options: PublicKeyCredentialCreationOptionsJSON
) {
  return {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64UrlToBuffer(options.user.id),
    },
    excludeCredentials: options.excludeCredentials?.map((cred) => ({
      ...cred,
      id: base64UrlToBuffer(cred.id),
    })),
  } as PublicKeyCredentialCreationOptions;
}

export function decodeAuthenticationOptions(
  options: PublicKeyCredentialRequestOptionsJSON
) {
  return {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map((cred) => ({
      ...cred,
      id: base64UrlToBuffer(cred.id),
    })),
  } as PublicKeyCredentialRequestOptions;
}

export function publicKeyCredentialToJSON(credential: PublicKeyCredential) {
  const { id, type, rawId } = credential;
  const clientExtensionResults = credential.getClientExtensionResults?.() ?? {};

  if (credential.response instanceof AuthenticatorAttestationResponse) {
    return {
      id,
      rawId: bufferToBase64Url(rawId),
      type,
      response: {
        clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
        attestationObject: bufferToBase64Url(credential.response.attestationObject),
      },
      clientExtensionResults,
    };
  }

  const assertion = credential.response as AuthenticatorAssertionResponse;

  return {
    id,
    rawId: bufferToBase64Url(rawId),
    type,
    response: {
      clientDataJSON: bufferToBase64Url(assertion.clientDataJSON),
      authenticatorData: bufferToBase64Url(assertion.authenticatorData),
      signature: bufferToBase64Url(assertion.signature),
      userHandle: assertion.userHandle
        ? bufferToBase64Url(assertion.userHandle)
        : null,
    },
    clientExtensionResults,
  };
}
