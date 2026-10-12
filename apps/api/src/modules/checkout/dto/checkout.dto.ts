import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { INDIAN_MOBILE_PATTERN, INDIAN_PIN_PATTERN } from '../../addresses/dto/address.dto.js';
import { OBJECT_ID_PATTERN } from '../../../common/utils/object-id.js';

/** Delivery address entered inline at checkout (guests and signed-in users). */
export class CheckoutInlineAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  recipient: string;

  @Matches(INDIAN_MOBILE_PATTERN, { message: 'mobile must be a valid 10-digit Indian mobile number' })
  @IsString()
  mobile: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  line2?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  villageTown: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  state: string;

  @Matches(INDIAN_PIN_PATTERN, { message: 'pincode must be a valid 6-digit Indian PIN' })
  @IsString()
  pincode: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  landmark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;
}

/**
 * Checkout preparation (Phase 7). Delivers a validated cart + delivery address
 * + server-calculated order summary. It never persists an order — order
 * creation arrives with the payment phase.
 */
export class CheckoutPrepareDto {
  /** Saved address id — only usable by the signed-in owner. */
  @IsOptional()
  @Matches(OBJECT_ID_PATTERN, { message: 'addressId must be a valid ObjectId' })
  addressId?: string;

  /** Inline delivery address (guests, or a one-time delivery target). */
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutInlineAddressDto)
  @IsObject()
  address?: CheckoutInlineAddressDto;
}