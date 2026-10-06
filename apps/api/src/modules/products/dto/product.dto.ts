import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/utils/slug.js';
import { LocalizedTextDto, SeoDto } from '../../categories/dto/category.dto.js';

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const num = ({ value }: { value: unknown }): number | undefined =>
  typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : undefined;
const bool = ({ value }: { value: unknown }): boolean | undefined =>
  value === true || value === 'true' || value === 1
    ? true
    : value === false || value === 'false' || value === 0
      ? false
      : undefined;

export class DimensionsDto {
  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(0)
  length?: number;

  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(0)
  width?: number;

  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;
}

export class CreateProductDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  name: LocalizedTextDto;

  @IsOptional()
  @Matches(SLUG_PATTERN, { message: 'slug may contain lowercase letters, digits and single hyphens' })
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(64)
  sku: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  shortDesc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  description?: string;

  @IsOptional()
  @Matches(/^[0-9a-f]{24}$/, { message: 'categoryId must be a valid ObjectId' })
  categoryId?: string;

  @Transform(num)
  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  moq?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  @IsObject()
  dimensions?: DimensionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  materialText?: LocalizedTextDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional()
  @IsEnum(PRODUCT_STATUSES)
  status?: ProductStatus;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  customizable?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  @IsObject()
  seo?: SeoDto;
}

export class UpdateProductDto {
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
  @MinLength(2)
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  shortDesc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  @IsObject()
  dimensions?: DimensionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsObject()
  materialText?: LocalizedTextDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional()
  @IsEnum(PRODUCT_STATUSES)
  status?: ProductStatus;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  customizable?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  @IsObject()
  seo?: SeoDto;
}

const SORTS = ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'featured'] as const;
export type ProductSort = (typeof SORTS)[number];

export class PublicListProductsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  handle?: string;

  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsEnum(SORTS)
  sort?: ProductSort;

  @IsOptional()
  @Transform(num)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(num)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AdminListProductsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(PRODUCT_STATUSES)
  status?: ProductStatus;

  @IsOptional()
  @Matches(/^[0-9a-f]{24}$/, { message: 'categoryId must be a valid ObjectId' })
  categoryId?: string;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsEnum(SORTS)
  sort?: ProductSort;

  @IsOptional()
  @Transform(num)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(num)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}