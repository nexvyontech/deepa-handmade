import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const MOBILE_PATTERN = /^\+?\d{7,15}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const PASSWORD_MESSAGE =
  'Password must be 8-72 characters and include at least one letter and one digit';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(MOBILE_PATTERN, { message: 'Mobile must be 7-15 digits with an optional leading +' })
  mobile: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
