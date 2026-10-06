import type { Request } from 'express';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/** Extract ip/user-agent for audit `meta` persistence and logging. */
export function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}