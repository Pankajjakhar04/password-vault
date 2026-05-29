export const bufferToBase64Url = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  return Buffer.from(bytes).toString("base64url");
};

export const base64UrlToBuffer = (base64Url: string) => {
  return Buffer.from(base64Url, "base64url");
};
