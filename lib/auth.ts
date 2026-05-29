import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/jwt";

export const requireVaultSession = (request: NextRequest) => {
  const session = getSessionFromRequest(request);
  if (!session || !session.pinVerified || !session.webauthnVerified) {
    return null;
  }
  return session;
};

export const requireRecentWebauthn = (
  request: NextRequest,
  maxAgeMs = 60000
) => {
  const session = requireVaultSession(request);
  if (!session || !session.webauthnVerifiedAt) {
    return null;
  }

  if (Date.now() - session.webauthnVerifiedAt > maxAgeMs) {
    return null;
  }

  return session;
};

export const requireRecentWebauthnOnly = (
  request: NextRequest,
  maxAgeMs = 60000
) => {
  const session = getSessionFromRequest(request);
  if (!session || !session.webauthnVerified || !session.webauthnVerifiedAt) {
    return null;
  }

  if (Date.now() - session.webauthnVerifiedAt > maxAgeMs) {
    return null;
  }

  return session;
};
