"use client";

const PBKDF2_ITERATIONS = 310000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (data: ArrayBuffer | Uint8Array) => {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toArrayBuffer = (data: Uint8Array) => {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
};

export async function generateSaltBase64() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return toBase64(salt);
}

const normalizeAnswer = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const deriveBits = async (secret: string, saltBase64: string) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const salt = fromBase64(saltBase64);

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
};

const importAesKey = async (rawKey: ArrayBuffer) =>
  crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

export async function deriveKeyFromPin(pin: string, saltBase64: string) {
  const derivedBits = await deriveBits(pin, saltBase64);
  const aesKey = await importAesKey(derivedBits);
  const digest = await crypto.subtle.digest("SHA-256", derivedBits);

  return {
    key: aesKey,
    verificationHash: toBase64(digest),
  };
}

export async function deriveKeyFromAnswers(
  answerOne: string,
  answerTwo: string,
  saltBase64: string
) {
  const combined = `${normalizeAnswer(answerOne)}|${normalizeAnswer(answerTwo)}`;
  const derivedBits = await deriveBits(combined, saltBase64);
  const aesKey = await importAesKey(derivedBits);

  return {
    key: aesKey,
  };
}

export const generateMasterKeyBytes = () =>
  crypto.getRandomValues(new Uint8Array(32));

export const wrapKeyBytes = async (
  rawKey: Uint8Array,
  wrappingKey: CryptoKey
) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    toArrayBuffer(rawKey)
  );

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
  };
};

export const unwrapKeyBytes = async (
  ciphertextBase64: string,
  ivBase64: string,
  wrappingKey: CryptoKey
) => {
  const iv = fromBase64(ivBase64);
  const ciphertext = fromBase64(ciphertextBase64);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    ciphertext
  );
  return new Uint8Array(plaintext);
};

export const unwrapMasterKey = async (
  ciphertextBase64: string,
  ivBase64: string,
  wrappingKey: CryptoKey
) => {
  const rawKey = await unwrapKeyBytes(ciphertextBase64, ivBase64, wrappingKey);
  return importAesKey(toArrayBuffer(rawKey));
};

export async function encryptText(plaintext: string, aesKey: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoded
  );

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
  };
}

export async function decryptText(
  ciphertextBase64: string,
  ivBase64: string,
  aesKey: CryptoKey
) {
  const iv = fromBase64(ivBase64);
  const ciphertext = fromBase64(ciphertextBase64);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext
  );

  return textDecoder.decode(plaintext);
}
