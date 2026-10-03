import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class CapabilityChargeDTO {
  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  cost: number;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isCommissionable: boolean;

  @ApiProperty({ type: [String] }) // Array of capability IDs
  @IsArray()
  @IsNotEmpty()
  capabilities: string[]; // Array of capability IDs
}

export class CreateCapabilityDTO {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ type: [CapabilityChargeDTO] })
  // @ValidateNested({ each: true })
  capabilityCharges: CapabilityChargeDTO[];
}

export class UpdateCapabilityDTO {
  @ApiProperty()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ type: [CapabilityChargeDTO] })
  // @ValidateNested({ each: true })
  capabilityCharges: CapabilityChargeDTO[];
}

export class FindAllCapabilityTemplatesQueryDto {
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
