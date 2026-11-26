import express from 'express';
import request from 'supertest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createRecipesRouter } from '../recipes.routes.js';

const mockService = { getAll: jest.fn(), getById: jest.fn() };
jest.mock('../../services/RecipeService.js', () => ({ RecipeService: jest.fn(() => mockService) }));
jest.mock('../../config/logger.js', () => ({ logError: jest.fn() }));

const USER = '00000000-0000-4000-8000-000000000001';

/** The router behind a stand-in for the auth middleware: a signed-in user and a user-scoped client. */
function app() {
  const server = express();
  server.use(express.json());
  server.use((req, _res, next) => { Object.assign(req, { user: { id: USER }, supabaseClient: {} }); next(); });
  server.use('/recipes', createRecipesRouter({} as SupabaseClient));
  return server;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockService.getById.mockResolvedValue(null);
  mockService.getAll.mockResolvedValue([]);
});

describe('recipe favourite routes retired (V11-06 E4b, R9)', () => {
  test('POST /:id/favorite is no longer routed', async () => {
    const res = await request(app()).post('/recipes/r1/favorite').send({});
    expect(res.status).toBe(404);
  });

  test('GET /favorites is read as a recipe id, like any other', async () => {
    // In the database a non-UUID id fails the read (Postgres 22P02), as for any other non-UUID id.
    mockService.getById.mockRejectedValue(Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' }));
    const res = await request(app()).get('/recipes/favorites');
    expect(mockService.getById).toHaveBeenCalledWith(USER, 'favorites');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch recipe' });
  });

  test('the other recipe routes stay', async () => {
    const res = await request(app()).get('/recipes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });
});
