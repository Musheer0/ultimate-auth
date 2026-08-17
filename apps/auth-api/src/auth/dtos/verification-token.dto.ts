import { ApiProperty } from '@nestjs/swagger';
import { IsString, Min, MinLength } from 'class-validator';

export class VerificationTokenDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Token identifier associated with the verification',
  })
  @IsString()
  token_id!: string;

  @ApiProperty({
    example: '123456',
    description: 'Verification code',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  code!: string;
}
