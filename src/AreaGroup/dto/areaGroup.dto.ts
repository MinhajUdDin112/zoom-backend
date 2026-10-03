import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  Length,
  IsNumber,
  IsArray,
  IsUUID,
  ArrayNotEmpty,
} from "class-validator";
import { STATUS } from "../enums/areaGroup.enum";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAreaGroupDTO {
  @IsString({ message: "Name must be a string" })
  name: string;

  @IsString({ message: "Company must be a string" })
  company: string;

  @IsNumber()
  price: number;

  @IsString({ message: "Description must be Provided" })
  description: string;

  @IsArray({
    message: "Zones must be an array with at least one zone selected",
  })
  zones: string[];

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

export class UpdateAreaGroupDTO {
  @IsString({ message: "Name must be a string" })
  name?: string;

  @IsString({ message: "Company must be a string" })
  company?: string;

  @IsNumber({}, { message: "Price must be a number" })
  price: number;

  @IsString({ message: "Description must be provided" })
  description?: string;

  @IsArray({ message: "Zones must be an array" })
  @ArrayNotEmpty({
    message: "Zones must be an array with at least one zone selected",
  })
  @IsString({ each: true, message: "Each zone must be a string" })
  zones: string[];

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

export class FindAllAreaGroupQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;
}
class ZoneDTO {
  @IsUUID()
  id: string;
}
