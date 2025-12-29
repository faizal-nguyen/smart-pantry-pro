import request from 'supertest';
const BASE = 'http://localhost:4000';

describe('YouTube Extract', () => {
  it('POST /api/v1/youtube-extract accepts { url } and returns success', async () => {
    const res = await request(BASE)
      .post('/api/v1/youtube-extract')
      .send({ url: 'https://youtu.be/dQw4w9WgXcQ' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    // data may contain nested success and recipe fields (service result)
    const data = res.body.data || {};
    expect(typeof data).toBe('object');
    if ('code' in data) expect(typeof (data as any).code).toBe('string');
  });
});
