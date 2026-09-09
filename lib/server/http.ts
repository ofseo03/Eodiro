export async function fetchText(url: URL, headers?: HeadersInit) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error('외부 API 응답 오류');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('외부 API 응답 없음');
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 8 * 1024 * 1024) { await reader.cancel(); throw new Error('외부 API 응답 크기 초과'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function fetchJson(url: URL, headers?: HeadersInit): Promise<unknown> {
  return JSON.parse(await fetchText(url, headers));
}
