import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ERROR_CODES } from '../errors/error-codes.js';
import { ApiException } from '../exceptions/api.exception.js';
import { USER_REFRESH_TOKEN_MODEL } from '../../database/schemas/index.js';

/**
 * Persisted shape of a `UserRefreshToken` record.
 */
export interface RefreshSessionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByRef?: Types.ObjectId | null;
  userAgent?: string;
  ip?: string;
  createdAt?: Date;
}

export interface RefreshSessionView {
  id: string;
  createdAt?: string;
  expiresAt: string;
  revokedAt?: string;
  replacedByRef?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * CRUD + rotation bookkeeping for refresh sessions.
 *
 * The model is injected optionally: the app supports a documented boot mode
 * without `MONGODB_URI`, where `MongooseModule.forFeature` is not registered.
 * Any operation in that mode fails with 503 SERVICE_UNAVAILABLE instead of
 * crashing bootstrap.
 *
 * Rotation: the presented session is marked `revokedAt` and linked to its
 * successor through `replacedByRef`. Reuse detection walks that chain forward
 * and revokes the whole lineage (`revokeLineage`).
 */
@Injectable()
export class RefreshSessionService {
  constructor(
    @Optional()
    @InjectModel(USER_REFRESH_TOKEN_MODEL)
    private readonly model?: Model<RefreshSessionDoc>,
  ) {}

  private db(): Model<RefreshSessionDoc> {
    if (!this.model) {
      throw new ApiException(
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Authentication requires a configured database',
      );
    }
    return this.model;
  }

  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: number;
    userAgent?: string;
    ip?: string;
  }): Promise<string> {
    const doc = await this.db().create({
      userId: new Types.ObjectId(input.userId),
      tokenHash: input.tokenHash,
      expiresAt: new Date(input.expiresAt),
      userAgent: input.userAgent,
      ip: input.ip,
    });
    return String(doc._id);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshSessionDoc | null> {
    return this.db().findOne({ tokenHash });
  }

  async findById(sessionId: string): Promise<RefreshSessionDoc | null> {
    return this.db().findById(sessionId);
  }

  /** Rotates a live session: revokes the old record and links the successor. */
  async rotate(
    oldSession: RefreshSessionDoc,
    next: { userId: string; tokenHash: string; expiresAt: number; userAgent?: string; ip?: string },
  ): Promise<string> {
    const newId = await this.create(next);
    await this.db().updateOne(
      { _id: oldSession._id, replacedByRef: null },
      { $set: { revokedAt: new Date(), replacedByRef: new Types.ObjectId(newId) } },
    );
    return newId;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db().updateOne(
      { _id: new Types.ObjectId(sessionId), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  /** Revokes the presented session and every successor minted from it. */
  async revokeLineage(start: RefreshSessionDoc): Promise<void> {
    const db = this.db();
    const seen = new Set<string>();
    let current: RefreshSessionDoc | null = start;

    while (current) {
      const id = String(current._id);
      if (seen.has(id)) break;
      seen.add(id);
      if (!current.revokedAt) {
        await db.updateOne({ _id: current._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
      }
      if (!current.replacedByRef) break;
      const nextId = String(current.replacedByRef);
      if (seen.has(nextId)) break;
      current = await db.findById(current.replacedByRef);
    }
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.db().updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    return result.modifiedCount;
  }

  async listForUser(userId: string): Promise<RefreshSessionView[]> {
    const docs = await this.db()
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
    return docs.map((doc) => toRefreshSessionView(doc));
  }
}

export function toRefreshSessionView(doc: RefreshSessionDoc): RefreshSessionView {
  return {
    id: String(doc._id),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    expiresAt: new Date(doc.expiresAt).toISOString(),
    revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : undefined,
    replacedByRef: doc.replacedByRef ? String(doc.replacedByRef) : undefined,
    userAgent: doc.userAgent,
    ip: doc.ip,
  };
}
