import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'admin@acme.com', description: 'User account email' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit password reset verification code' })
  @IsString()
  @IsNotEmpty({ message: 'Reset verification code is required' })
  token!: string;

  @ApiProperty({ example: 'NewStr0ngP@ssw0rd!', description: 'New password (min 8 characters)' })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword!: string;
}

