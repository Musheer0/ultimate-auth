import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreatePasswordUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
