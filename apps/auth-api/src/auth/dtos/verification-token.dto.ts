import { IsString, Min, MinLength } from 'class-validator';

export class VerificationTokenDto {
  @IsString()
  token_id!: string;

  @IsString()
  @MinLength(6)
  code!: string;
}
