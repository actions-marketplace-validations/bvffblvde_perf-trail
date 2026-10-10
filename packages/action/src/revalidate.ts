export type RevalidateResult = { ok: boolean; message: string };

export async function revalidate(
  url: URL,
  secret: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<RevalidateResult> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok)
      return { ok: true, message: `Revalidated ${url.href} (HTTP ${response.status})` };
    return {
      ok: false,
      message: `Revalidation of ${url.href} failed with HTTP ${response.status}${
        response.status === 401 || response.status === 403 ? ", check revalidate-secret" : ""
      }`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `Revalidation of ${url.href} failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
