import type { Response } from 'express';
import type { ApiResponse } from '../types/api.js';

export function ok<T>(res: Response, data: T, message?: string, code?: string, status = 200) {
  const body: ApiResponse<T> = { success: true, data, ...(message ? { message } : {}), ...(code ? { code } : {}) };
  return res.status(status).json(body);
}

export function fail(res: Response, error: unknown, status = 400, code?: string, message?: string) {
  const err = typeof error === 'string' ? error : (error as any)?.message ?? 'Unknown error';
  return res.status(status).json({ success: false, error: err, ...(message ? { message } : {}), ...(code ? { code } : {}) });
}

