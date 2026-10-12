import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OBJECT_ID_PATTERN } from '../../../common/utils/object-id.js';

/** Max quantity of a single cart line (server-enforced cap). */
export const CART_LINE_MAX_QTY = 99;
/** Max number of distinct lines in one cart. */
export const CART_MAX_LINES = 50;

export class CartCustomDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  colorText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sizeText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  handleText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AddCartItemDto {
  @Matches(OBJECT_ID_PATTERN, { message: 'productId must be a valid ObjectId' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @Matches(OBJECT_ID_PATTERN, { message: 'variantId must be a valid ObjectId' })
  variantId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CART_LINE_MAX_QTY)
  qty: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CartCustomDetailsDto)
  @IsObject()
  customDetails?: CartCustomDetailsDto;
}

export class UpdateCartItemQtyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CART_LINE_MAX_QTY)
  qty: number;
}

export const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MergeCartDto {
  @Matches(SESSION_ID_PATTERN, { message: 'sessionId must be a valid cart session' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}