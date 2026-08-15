import {
  IsEmail,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}
export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  code!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
