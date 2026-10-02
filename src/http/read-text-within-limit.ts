/** Reads a response while enforcing a byte limit for both buffered and streamed bodies. */
export async function readTextWithinLimit(
  response: Response,
  maxBytes: number
): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return new TextEncoder().encode(text).length > maxBytes ? null : text;
  }
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}
