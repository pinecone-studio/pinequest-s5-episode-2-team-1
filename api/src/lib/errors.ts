import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';
import type { ErrorCode } from '../../../shared/types';

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  console.error(err);
  return c.json({ error: { code: 'INTERNAL', message: 'Серверийн алдаа' } }, 500);
}

/** Request body-г zod schema-аар шалгана; буруу бол 400. */
export async function readBody<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown = {};
  try {
    raw = await c.req.json();
  } catch {
    // хоосон эсвэл JSON биш body → {} гэж үзээд schema шалгана
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    throw new ApiError(400, 'BAD_REQUEST', msg);
  }
  return parsed.data;
}

export function parseId(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, 'BAD_REQUEST', 'Буруу id');
  return n;
}
