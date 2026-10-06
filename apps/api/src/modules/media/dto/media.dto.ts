import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OWNER_TYPES } from '../media-validation.js';

export const MEDIA_BUCKETS = ['PUBLIC', 'PRIVATE'] as const;
export const MEDIA_STATUSES = ['AVAILABLE', 'PENDING_MODERATION', 'REJECTED', 'HIDDEN'] as const;

export class UploadMediaFieldsDto {
  @Matches(/^[A-Za-z]+$/, { message: 'ownerType must be alphabetic' })
  ownerType: string;

  @Matches(/^[0-9a-f]{24}$/, { message: 'ownerId must be a valid ObjectId' })
  ownerId: string;

  @IsOptional()
  @IsEnum(MEDIA_BUCKETS)
  bucket?: (typeof MEDIA_BUCKETS)[number];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateMediaDto {
  @IsOptional()
  @IsObject()
  alt?: { en?: string; ta?: string };

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(MEDIA_STATUSES)
  status?: (typeof MEDIA_STATUSES)[number];
}

export class ListMediaDto {
  @IsOptional()
  @Matches(/^[A-Za-z]+$/, { message: 'ownerType must be alphabetic' })
  ownerType?: string;

  @IsOptional()
  @Matches(/^[0-9a-f]{24}$/, { message: 'ownerId must be a valid ObjectId' })
  ownerId?: string;

  @IsOptional()
  @IsEnum(MEDIA_STATUSES)
  status?: (typeof MEDIA_STATUSES)[number];

  @IsOptional()
  @IsEnum(MEDIA_BUCKETS)
  bucket?: (typeof MEDIA_BUCKETS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(({ value }: { value: number }) => Math.min(value, 100))
  limit: number = 20;
}

export function isOwnerType(value: string): boolean {
  return (OWNER_TYPES as readonly string[]).includes(value);
}

export interface ActorContext {
  id: string;
  role: string;
  ip?: string;
  userAgent?: string;
}