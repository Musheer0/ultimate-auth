import { IsString, Min } from 'class-validator';

export class VerificationTokenDto {
  @IsString()
  token_id!: string;

  @IsString()
  @Min(6)
  code!: string;
}
