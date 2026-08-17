import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Min, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the account',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password for the account',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
