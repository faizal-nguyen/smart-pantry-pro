/**
 * Smart Pantry API client helper.
 *
 * All AI / media / extraction calls MUST go through this helper so:
 *  - Auth is consistently a Supabase JWT in the Authorization header.
 *  - Server-only secrets (OpenAI, Deepgram, Cloudinary secret, etc.)
 *    never leak into the client bundle.
 *
 * Reference: PRP-220.02 (migration des secrets VITE_* vers serveur).
 */

import { supabase } from '@/integrations/supabase/client';
import { ApiError } from './apiError';
import { apiFailureMessage, networkFailure } from './apiErrors';

export { ApiError };

const DEFAULT_BASE = '/api';

function resolveBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  return (fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/$/, '') : '') + DEFAULT_BASE;
}

export async function authHeader(expectedUserId?: string): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (expectedUserId && data.session?.user.id !== expectedUserId) {
    throw new ApiError('Reconnecte-toi au compte qui a commencé cette action.', { status: 401, code: 'AUTH_CHANGED' });
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: { code?: string; message?: string; [k: string]: unknown };
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** fetch, with a dropped connection reported as an ApiError (« Load failed » reached the screen). */
async function send(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw networkFailure(error);
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await parseJson(res)) as ApiResponse<T> | unknown;

  if (!res.ok) {
    const err = body as ApiFailure & { code?: string } | undefined;
    const value = err?.error;
    throw new ApiError(apiFailureMessage(res.status, typeof value === 'string' ? value : value?.message), {
      status: res.status, code: typeof value === 'string' ? err?.code : value?.code, details: value,
    });
  }

  // Endpoints follow { success, data } envelope. If absent, return raw body.
  if (body && typeof body === 'object' && 'success' in (body as object)) {
    const envelope = body as ApiResponse<T>;
    if (envelope.success === false) {
      throw new ApiError(apiFailureMessage(res.status >= 400 ? res.status : 0, envelope.error?.message), {
        status: res.status,
        code: envelope.error?.code,
        details: envelope.error,
      });
    }
    return envelope.data;
  }
  return body as T;
}

export async function apiPost<T = unknown>(path: string, body?: unknown, options?: { expectedUserId?: string; signal?: AbortSignal }): Promise<T> {
  const res = await send(`${resolveBase()}${path}`, {
    method: 'POST',
    signal: options?.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader(options?.expectedUserId)),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const value = await unwrap<T>(res);
  if (options?.expectedUserId) await authHeader(options.expectedUserId);
  return value;
}

export async function apiGet<T = unknown>(path: string, query?: Record<string, string | number | boolean | undefined>, options?: { expectedUserId?: string; signal?: AbortSignal }): Promise<T> {
  const url = new URL(`${resolveBase()}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await send(url.pathname + url.search, {
    method: 'GET',
    signal: options?.signal,
    headers: { ...(await authHeader(options?.expectedUserId)) },
  });
  const value = await unwrap<T>(res);
  if (options?.expectedUserId) await authHeader(options.expectedUserId);
  return value;
}

export async function apiPatch<T = unknown>(path: string, body?: unknown, options?: { expectedUserId?: string; signal?: AbortSignal }): Promise<T> {
  const res = await send(`${resolveBase()}${path}`, {
    method: 'PATCH',
    signal: options?.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader(options?.expectedUserId)),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const value = await unwrap<T>(res);
  if (options?.expectedUserId) await authHeader(options.expectedUserId);
  return value;
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await send(`${resolveBase()}${path}`, {
    method: 'DELETE',
    headers: { ...(await authHeader()) },
  });
  return unwrap<T>(res);
}
