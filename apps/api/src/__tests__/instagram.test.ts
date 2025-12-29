import request from 'supertest';
const BASE = 'http://localhost:4000';

describe('Instagram Services', () => {
  const sample = 'https://www.instagram.com/p/CuBzp9J1aXx/';

  it('POST /api/v1/social/instagram/oembed returns success', async () => {
    const res = await request(BASE)
      .post('/api/v1/social/instagram/oembed')
      .send({ url: sample })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    const data = res.body.data || {};
    expect(typeof data).toBe('object');
    if ('code' in data) expect(typeof (data as any).code).toBe('string');
  });

  it('POST /api/v1/social/instagram/thumbnail returns success', async () => {
    const res = await request(BASE)
      .post('/api/v1/social/instagram/thumbnail')
      .send({ url: sample })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    const data = res.body.data || {};
    expect(typeof data).toBe('object');
    if ('code' in data) expect(typeof (data as any).code).toBe('string');
  });
});
