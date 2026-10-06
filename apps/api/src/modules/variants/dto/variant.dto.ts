import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../categories/dto/category.dto.js';

export const OPTION_TYPES = ['COLOR', 'SIZE', 'HANDLE'] as const;
export type OptionType = (typeof OPTION_TYPES)[number];

export function isOptionType(value: unknown): value is OptionType {
  return (OPTION_TYPES as readonly unknown[]).includes(value);
}

const HEX = /^#?[0-9a-f]{6}$/i;

export class CreateVariantOptionDto {
  @IsEnum(OPTION_TYPES)
  optionType: OptionType;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  value: LocalizedTextDto;

  @IsOptional()
  @Matches(HEX, { message: 'hex must look like #RRGGBB' })
  hex?: string;

  @IsOptional()
  @Transform(({ value }): number | undefined => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  active?: boolean;
}

export class UpdateVariantOptionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  value?: LocalizedTextDto;

  @IsOptional()
  @Matches(HEX, { message: 'hex must look like #RRGGBB' })
  hex?: string;

  @IsOptional()
  @Transform(({ value }): number | undefined => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  active?: boolean;
}

export class CreateVariantDto {
  @Matches(/^[0-9a-f]{24}$/, { message: 'productId must be a valid ObjectId' })
  productId: string;

  @IsOptional()
  @IsString({ each: true })
  @Matches(/^[0-9a-f]{24}$/, { each: true, message: 'optionValueIds must be valid ObjectIds' })
  optionValueIds?: string[];

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  variantSku?: string;

  @IsOptional()
  @Transform(({ value }): number | undefined => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  priceDelta?: number;

  @IsOptional()
  @IsIn(['INVENTORY_TRACKED', 'AVAILABLE_ONLY'])
  stockMode?: string;

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString({ each: true })
  @Matches(/^[0-9a-f]{24}$/, { each: true, message: 'imageMediaIds must be valid ObjectIds' })
  imageMediaIds?: string[];

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  isCustomColor?: boolean;

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  isCustomSize?: boolean;
}

export class UpdateVariantDto {
  @IsOptional()
  @IsString({ each: true })
  @Matches(/^[0-9a-f]{24}$/, { each: true, message: 'optionValueIds must be valid ObjectIds' })
  optionValueIds?: string[];

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  variantSku?: string;

  @IsOptional()
  @Transform(({ value }): number | undefined => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  priceDelta?: number;

  @IsOptional()
  @IsIn(['INVENTORY_TRACKED', 'AVAILABLE_ONLY'])
  stockMode?: string;

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString({ each: true })
  @Matches(/^[0-9a-f]{24}$/, { each: true, message: 'imageMediaIds must be valid ObjectIds' })
  imageMediaIds?: string[];

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  isCustomColor?: boolean;

  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true' || value === 1)
  @IsBoolean()
  isCustomSize?: boolean;
}