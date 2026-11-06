import { IsString, IsNotEmpty, IsEmail, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@clm/shared-types';

export class CreateUserDto {
  @ApiProperty({ example: 'devops@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'TemporaryPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @ApiProperty({ example: 'Alice' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Vance' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ enum: Role, default: Role.DEVOPS_ENGINEER })
  @IsEnum(Role)
  role!: Role;
}

