import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class PasswordResetRequestDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export class PasswordResetConfirmDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must be 8-72 characters and include at least one letter and one digit',
  })
  newPassword: string;
}
