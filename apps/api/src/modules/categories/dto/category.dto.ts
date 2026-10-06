import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/utils/slug.js';

export class LocalizedTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  en: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ta?: string;
}

export class SeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ogTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  ogDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  canonicalUrl?: string;

  @IsOptional()
  @Matches(/^[0-9a-f]{24}$/, { message: 'ogImageMediaId must be a valid ObjectId' })
  ogImageMediaId?: string;

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  noindex?: boolean;
}

const OBJECT_ID = { message: 'Must be a valid ObjectId' };

export class CreateCategoryDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  name: LocalizedTextDto;

  @IsOptional()
  @Matches(SLUG_PATTERN, { message: 'slug may contain lowercase letters, digits and single hyphens' })
  slug?: string;

  @IsOptional()
  @Matches(/^[0-9a-f]{24}$/, OBJECT_ID)
  parentId?: string;

  @IsOptional()
  @Matches(/^[0-9a-f]{24}$/, OBJECT_ID)
  imageMediaId?: string;

  @IsOptional()
  @Matches(/^[0-9a-f]{24}$/, OBJECT_ID)
  bannerMediaId?: string;

  @IsOptional()
  @Transform(({ value }): number | undefined => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  @IsObject()
  seo?: SeoDto;
}

export class UpdateCategoryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  name?: LocalizedTextDto;

  @IsOptional()
  @Matches(SLUG_PATTERN, { message: 'slug may contain lowercase letters, digits and single hyphens' })
  slug?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  imageMediaId?: string;

  @IsOptional()
  @IsString()
  bannerMediaId?: string;

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Transform(({ value }): number | undefined => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  @IsObject()
  seo?: SeoDto;
}