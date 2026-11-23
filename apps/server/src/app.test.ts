import { describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.js';

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const server = await new Promise<ReturnType<ReturnType<typeof createApp>['listen']>>((resolve) => {
      const s = createApp().listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(await res.json()).toMatchObject({ ok: true });
    server.close();
  });
});
