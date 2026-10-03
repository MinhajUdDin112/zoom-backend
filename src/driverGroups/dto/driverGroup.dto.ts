import { PartialType } from "@nestjs/swagger";
import {
  IsDate,
  IsNotEmpty,
  IsString,
  MaxLength,
  IsArray,
  ArrayNotEmpty,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber } from "class-validator";
import { Mode } from "../constants";
export class CreateDriverGroupDTO {
  @IsNotEmpty({ message: "Name must not be empty" })
  @IsString({ message: "Name must be a string" })
  name: string;

  @IsNotEmpty({ message: "Mode must not be empty" })
  mode: Mode; // Using the Mode enum

  @IsOptional()
  @IsArray()
  driverIds: string[]; // Assuming this is an array of driver IDs
}

export class UpdateDriverGroupDTO extends PartialType(CreateDriverGroupDTO) {}

export class FindAllQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filter?: string;

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
