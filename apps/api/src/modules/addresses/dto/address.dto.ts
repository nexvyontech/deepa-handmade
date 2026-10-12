import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;
export const INDIAN_PIN_PATTERN = /^[1-9]\d{5}$/;

const bool = ({ value }: { value: unknown }): boolean | undefined =>
  value === true || value === 'true' || value === 1
    ? true
    : value === false || value === 'false' || value === 0
      ? false
      : undefined;

export class CreateAddressDto {
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

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  recipient?: string;

  @IsOptional()
  @Matches(INDIAN_MOBILE_PATTERN, { message: 'mobile must be a valid 10-digit Indian mobile number' })
  mobile?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  line2?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  villageTown?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @Matches(INDIAN_PIN_PATTERN, { message: 'pincode must be a valid 6-digit Indian PIN' })
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  landmark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  isDefault?: boolean;
}