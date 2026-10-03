import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDate,
  IsEmail,
  IsEmpty,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPasswordOptions,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
export class CreateUserDTO {
  @ApiProperty()
  @IsNotEmpty()
  phoneNumber: string;
  @ApiProperty()
  @IsEmail()
  email: string;
  @ApiProperty()
  @IsNotEmpty()
  userName: string;
  @ApiProperty()
  @IsNotEmpty()
  password: string;
  @ApiProperty()
  @IsNotEmpty()
  confirmPassword: string;
  @ApiProperty()
  // @IsNotEmpty()
  dob: Date;
  @ApiProperty()
  @IsOptional()
  company: string;
  @ApiProperty()
  @IsNotEmpty()
  role: string;
  @ApiPropertyOptional()
  @IsOptional()
  creater?: string;
  @ApiPropertyOptional()
  @IsOptional()
  lastLogin?: Date;
  @ApiPropertyOptional()
  latestAppVersion?: string;

  @ApiPropertyOptional()
  deviceVersion?: string;
}

export class UpdateUserDTO {
  @ApiPropertyOptional()
  phoneNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  userName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  password?: string;
  @ApiPropertyOptional()
  @IsOptional()
  // @IsNotEmpty()
  dob?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  role?: string;
  @ApiPropertyOptional()
  latestAppVersion?: string;
  @ApiPropertyOptional()
  deviceVersion?: string;
}

export class GetUserDTO {
  @ApiProperty()
  id: string;
  @ApiPropertyOptional()
  phoneNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  userName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  password?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  dob?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  role?: string;
  @ApiPropertyOptional()
  latestAppVersion?: string;

  @ApiPropertyOptional()
  deviceVersion?: string;
}

export class OptionsDTO {
  @IsNotEmpty()
  page?: number;
  @IsNotEmpty()
  limit?: number;
}
export class ChangePasswordDTO {
  @ApiProperty()
  @IsNotEmpty()
  driverEmail: string;

  @ApiProperty()
  @IsNotEmpty()
  newPassword: string;
}
