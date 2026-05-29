import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

export type SessionPayload = {
  sub: string;
  email: string;
  pinVerified: boolean;
  webauthnVerified: boolean;
  webauthnVerifiedAt?: number;
};

const SESSION_COOKIE = "vault_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set.");
  }
  return secret;
};

export const signSession = (payload: SessionPayload) => {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
};

export const verifySession = (token: string) => {
  try {
    return jwt.verify(token, getSecret()) as SessionPayload;
  } catch {
    return null;
  }
};

export const getSessionFromRequest = (request: NextRequest) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySession(token);
};

export const setSessionCookie = (
  response: NextResponse,
  payload: SessionPayload
) => {
  const token = signSession(payload);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
};
