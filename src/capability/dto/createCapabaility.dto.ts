import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCapabilityDTO {
  @ApiProperty()
  @IsNotEmpty()
  name: string;
  @ApiProperty()
  @IsNotEmpty()
  shortCode: string;
  @ApiProperty()
  @IsNotEmpty()
  priority: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  priorityCode?: number;
  @ApiProperty()
  @IsNotEmpty()
  type: string;
  @ApiProperty()
  @IsNotEmpty()
  enabled: boolean;
  @ApiProperty()
  @IsNotEmpty()
  colour: boolean;
  @ApiProperty()
  @IsOptional()
  colourCode: string;
  @ApiProperty()
  @IsNotEmpty()
  visibleToDrivers: boolean;
  @ApiProperty()
  @IsNotEmpty()
  exclusiveCapability: boolean;
  @ApiProperty()
  @IsNotEmpty()
  operatorOverride: boolean;
}
export class UpdateCapabilityDTO {
  @ApiPropertyOptional()
  @IsOptional()
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  shortCode?: string;
  @IsOptional()
  @ApiPropertyOptional()
  priority?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  priorityCode?: number;
  @ApiPropertyOptional()
  @IsOptional()
  type?: string;
  @ApiPropertyOptional()
  @IsOptional()
  enabled?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  colour: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  colourCode: string;
  @ApiPropertyOptional()
  @IsOptional()
  visibleToDrivers?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  exclusiveCapability?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  operatorOverride?: boolean;
}

export class GetAllDTO {
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
  limit: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filter: string;
}

export class QueryOptionsDTO {
  skip: number;
  take: number;
  where?: Record<string, string>;
}
