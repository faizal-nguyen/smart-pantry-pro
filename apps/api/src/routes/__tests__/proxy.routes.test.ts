import express from 'express';
import request from 'supertest';
import { proxyRouter } from '../proxy.js';

jest.mock('node:dns/promises', () => ({ lookup: async () => [{ address: '157.240.0.35', family: 4 }] }));
const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock as unknown as typeof fetch; });
const app = express().use('/api/proxy', proxyRouter);
const image = 'https://scontent.cdninstagram.com/v/t51/photo.jpg';
const upstream = (body: string, headers: Record<string, string>, status = 200) => new Response(body, { status, headers });

// Audit 2026-11-07, security P2 5: content-type passed through, no size cap, redirects followed.
describe('image proxy', () => {
  test('an image comes back as an image that cannot run anything', async () => {
    fetchMock.mockResolvedValueOnce(upstream('jpeg-bytes', { 'content-type': 'image/jpeg' }));
    const res = await request(app).get('/api/proxy/image').query({ url: image });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
  });
  test('a page that is not an image is refused, never served from our origin', async () => {
    fetchMock.mockResolvedValueOnce(upstream('<script>alert(1)</script>', { 'content-type': 'text/html' }));
    const res = await request(app).get('/api/proxy/image').query({ url: image });
    expect(res.status).toBe(415);
    expect(res.text).not.toContain('<script>');
  });
  test('an image over 10 MB is refused', async () => {
    fetchMock.mockResolvedValueOnce(upstream('x', { 'content-type': 'image/png', 'content-length': String(20 * 1024 * 1024) }));
    expect((await request(app).get('/api/proxy/image').query({ url: image })).status).toBe(413);
  });
  test('a redirect to an internal address is refused', async () => {
    fetchMock.mockResolvedValueOnce(upstream('', { location: 'http://169.254.169.254/latest/meta-data/' }, 302));
    expect((await request(app).get('/api/proxy/image').query({ url: image })).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  test('a host outside the list is refused', async () => {
    expect((await request(app).get('/api/proxy/image').query({ url: 'https://evil.example/x.jpg' })).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
