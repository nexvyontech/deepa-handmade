import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/utils/slug.js';
import {
  LocalizedTextDto,
  SeoDto,
} from '../../categories/dto/category.dto.js';

const bool = ({ value }: { value: unknown }): boolean | undefined =>
  value === true || value === 'true' || value === 1
    ? true
    : value === false || value === 'false' || value === 0
      ? false
      : undefined;
const num = ({ value }: { value: unknown }): number | undefined =>
  typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : undefined;

export const CMS_PAGE_TYPES = ['PAGE', 'POLICY', 'CONTACT', 'FAQ'] as const;
export type CmsPageType = (typeof CMS_PAGE_TYPES)[number];
export const CMS_PAGE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type CmsPageStatus = (typeof CMS_PAGE_STATUSES)[number];

export class CreateCmsPageDto {
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug may contain lowercase letters, digits and single hyphens' })
  slug: string;

  @IsEnum(CMS_PAGE_TYPES)
  type: CmsPageType;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  title: LocalizedTextDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  @IsObject()
  content?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  @IsObject()
  seo?: SeoDto;

  @IsOptional()
  @Transform(num)
  @IsInt()
  sortOrder?: number;
}

export class UpdateCmsPageDto {
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: 'slug may contain lowercase letters, digits and single hyphens' })
  slug?: string;

  @IsOptional()
  @IsEnum(CMS_PAGE_TYPES)
  type?: CmsPageType;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  title?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  @IsObject()
  content?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  @IsObject()
  seo?: SeoDto;

  @IsOptional()
  @Transform(num)
  @IsInt()
  sortOrder?: number;
}

const PAGE_ACTIONS = ['publish', 'unpublish', 'archive'] as const;

export class PageStatusActionDto {
  @IsEnum(PAGE_ACTIONS)
  action: (typeof PAGE_ACTIONS)[number];
}

export class CreateBannerDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  title?: LocalizedTextDto;

  @IsString()
  @Matches(/^[0-9a-f]{24}$/, { message: 'imageMediaId must be a valid ObjectId' })
  imageMediaId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  ctaLabel?: LocalizedTextDto;

  @IsOptional()
  @IsEnum(['PRODUCT', 'CATEGORY', 'PAGE', 'EXTERNAL'])
  target?: 'PRODUCT' | 'CATEGORY' | 'PAGE' | 'EXTERNAL';

  @IsOptional()
  @IsString()
  @MaxLength(60)
  location?: string;

  @IsOptional()
  @Transform(num)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(String(value)) : undefined))
  startAt?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(String(value)) : undefined))
  endAt?: Date;
}

export class UpdateBannerDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  title?: LocalizedTextDto;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-f]{24}$/, { message: 'imageMediaId must be a valid ObjectId' })
  imageMediaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  ctaLabel?: LocalizedTextDto;

  @IsOptional()
  @IsEnum(['PRODUCT', 'CATEGORY', 'PAGE', 'EXTERNAL'])
  target?: 'PRODUCT' | 'CATEGORY' | 'PAGE' | 'EXTERNAL';

  @IsOptional()
  @IsString()
  @MaxLength(60)
  location?: string;

  @IsOptional()
  @Transform(num)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(String(value)) : undefined))
  startAt?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(String(value)) : undefined))
  endAt?: Date;
}