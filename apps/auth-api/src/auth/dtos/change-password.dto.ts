import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the account',
  })
  @IsEmail()
  email!: string;
}
export class ResetPasswordDto {
  @ApiProperty({
    example: '123456',
    description: 'Verification code sent to the email',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  code!: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'New password for the account',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
