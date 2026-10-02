import { describe, expect, it } from 'vitest';
import { readTextWithinLimit } from '../../src/http/read-text-within-limit';

function streamedResponse(chunks: Uint8Array[]) {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  return { response: new Response(stream), wasCancelled: () => cancelled };
}

describe('readTextWithinLimit', () => {
  it('accepts buffered and streamed bodies exactly at the byte limit', async () => {
    const buffered = {
      body: null,
      text: async () => 'tape',
    } as unknown as Response;
    const encoder = new TextEncoder();
    const streamed = streamedResponse([encoder.encode('ta'), encoder.encode('pe')]);

    await expect(readTextWithinLimit(buffered, 4)).resolves.toBe('tape');
    await expect(readTextWithinLimit(streamed.response, 4)).resolves.toBe('tape');
    expect(streamed.wasCancelled()).toBe(false);
  });

  it('counts UTF-8 bytes rather than JavaScript characters', async () => {
    const buffered = {
      body: null,
      text: async () => 'é',
    } as unknown as Response;
    const streamed = streamedResponse([new TextEncoder().encode('é')]);

    await expect(readTextWithinLimit(buffered, 1)).resolves.toBeNull();
    await expect(readTextWithinLimit(streamed.response, 1)).resolves.toBeNull();
  });

  it('decodes UTF-8 characters split across streamed chunks', async () => {
    const bytes = new TextEncoder().encode('before 🎶 after');
    const streamed = streamedResponse([
      bytes.slice(0, 8),
      bytes.slice(8, 9),
      bytes.slice(9, 10),
      bytes.slice(10),
    ]);

    await expect(readTextWithinLimit(streamed.response, bytes.byteLength)).resolves.toBe(
      'before 🎶 after'
    );
  });

  it('cancels an overflowing streamed body before returning null', async () => {
    let cancelled = false;
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3])];
    const reader = {
      read: async () => {
        const value = chunks.shift();
        return value ? { done: false, value } : { done: true, value: undefined };
      },
      cancel: async () => {
        cancelled = true;
      },
    };
    const response = { body: { getReader: () => reader } } as unknown as Response;

    await expect(readTextWithinLimit(response, 2)).resolves.toBeNull();
    expect(cancelled).toBe(true);
  });
});
