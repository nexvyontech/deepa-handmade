import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

const num = ({ value }: { value: unknown }): number | undefined =>
  typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : undefined;

export class UpdatePricingDto {
  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @Transform(num)
  @IsNumber()
  @Min(1)
  moq?: number;
}