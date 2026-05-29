export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
};

export async function parseApiResponse<T>(
  response: Response
): Promise<ApiResult<T>> {
  const text = await response.text();

  if (!text) {
    return {
      ok: response.ok,
      status: response.status,
      data: null,
      error: response.ok
        ? null
        : response.statusText || "Request failed.",
    };
  }

  try {
    const data = JSON.parse(text) as T & { error?: string };
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok
        ? null
        : data?.error || response.statusText || "Request failed.",
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: "Invalid server response.",
    };
  }
}
