import request from 'supertest';
import { spawn } from 'child_process';

const BASE = 'http://localhost:4000';
let proc: any;

beforeAll((done) => {
  proc = spawn('node', ['apps/api/dist/index.js'], { stdio: 'ignore' });
  setTimeout(done, 800); // give server time to boot
});

afterAll(() => {
  if (proc && !proc.killed) proc.kill();
});

describe('API Health', () => {
  it('GET /api/health returns success with data', async () => {
    const res = await request(BASE).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    const data = res.body.data || res.body; // be tolerant if shape differs
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('service');
  });

  it('GET /api/v1/health returns success with data', async () => {
    const res = await request(BASE).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});
