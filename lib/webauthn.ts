import { NextRequest, NextResponse } from "next/server";

const registerChallengeCookie = "webauthn_register_challenge";
const registerEmailCookie = "webauthn_register_email";
const loginChallengeCookie = "webauthn_login_challenge";
const loginEmailCookie = "webauthn_login_email";

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth",
};

export const getRpConfig = () => {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const parsed = new URL(siteUrl);

  return {
    rpID: parsed.hostname,
    origin: parsed.origin,
    rpName: "Neon Vault",
  };
};

export const setRegisterChallenge = (
  response: NextResponse,
  challenge: string,
  email: string
) => {
  response.cookies.set(registerChallengeCookie, challenge, cookieOptions);
  response.cookies.set(registerEmailCookie, email, cookieOptions);
};

export const getRegisterChallenge = (request: NextRequest) =>
  request.cookies.get(registerChallengeCookie)?.value ?? null;

export const getRegisterEmail = (request: NextRequest) =>
  request.cookies.get(registerEmailCookie)?.value ?? null;

export const clearRegisterChallenge = (response: NextResponse) => {
  response.cookies.set(registerChallengeCookie, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  response.cookies.set(registerEmailCookie, "", {
    ...cookieOptions,
    maxAge: 0,
  });
};

export const setLoginChallenge = (
  response: NextResponse,
  challenge: string,
  email: string
) => {
  response.cookies.set(loginChallengeCookie, challenge, cookieOptions);
  response.cookies.set(loginEmailCookie, email, cookieOptions);
};

export const getLoginChallenge = (request: NextRequest) =>
  request.cookies.get(loginChallengeCookie)?.value ?? null;

export const getLoginEmail = (request: NextRequest) =>
  request.cookies.get(loginEmailCookie)?.value ?? null;

export const clearLoginChallenge = (response: NextResponse) => {
  response.cookies.set(loginChallengeCookie, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  response.cookies.set(loginEmailCookie, "", {
    ...cookieOptions,
    maxAge: 0,
  });
};

export const uuidToBytes = (uuid: string) => {
  const normalized = uuid.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) {
    throw new Error("Invalid user id format.");
  }

  const bytes = new Uint8Array(16);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }

  return bytes;
};
