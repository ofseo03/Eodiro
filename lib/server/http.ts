export async function fetchText(url: URL, headers?: HeadersInit, body?: URLSearchParams | string) {
  const response = await fetch(url, { headers, body, method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error' });
  if (!response.ok) {
    // 원인 추적용으로 상태 코드와 본문 앞부분을 남긴다. data.go.kr는 미승인·트래픽 초과 등을 XML 본문에 담아 보낸다.
    const body = await readResponseText(response).catch(() => '');
    throw new Error(`외부 API 응답 오류 (HTTP ${response.status}) ${body.replace(/\s+/g, ' ').slice(0, 300)}`.trimEnd());
  }
  return readResponseText(response);
}

export async function readResponseText(response: Response) {
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

export async function fetchJson(url: URL, headers?: HeadersInit, body?: URLSearchParams | string): Promise<unknown> {
  return JSON.parse(await fetchText(url, headers, body));
}

// data.go.kr는 인증키를 Encoding(퍼센트 인코딩)·Decoding 두 형태로 발급한다. URLSearchParams가 다시 인코딩하므로
// Encoding 키를 그대로 넣으면 %2B가 %252B로 바뀌어 SERVICE_KEY_IS_NOT_REGISTERED_ERROR가 난다. 항상 Decoding 형태로 맞춘다.
export function publicDataKey(raw: string) {
  if (!raw.includes('%')) return raw;
  try { return decodeURIComponent(raw); } catch { return raw; }
}
