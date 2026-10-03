import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import {
  createDistanceCostDTO,
  updateDistanceCostDTO,
} from "./distanceCost.dto";
import { createTimeCostDTO, updateTimeCostDTO } from "./timeCost.dto";
import { Type } from "class-transformer";

export class CreateVariableFareTemplateDTO {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCapabilityCostPriceDTO)
  capabilityCostPrice: CreateCapabilityCostPriceDTO[];
}

export class UpdateVariableFareTemplateDTO {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCapabilityCostPriceDTO)
  capabilityCostPrice: UpdateCapabilityCostPriceDTO[];
}

export class UpdateCapabilityCostPriceDTO {
  @IsOptional()
  @IsString()
  id: string;

  @IsOptional()
  @IsBoolean()
  sameCostPrice?: boolean;

  @IsOptional()
  @IsNumber()
  minCost?: number;

  @IsNumber()
  maxCost?: number;

  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  pickupPrice?: number;

  @IsOptional()
  @IsNumber()
  pickupCost?: number;

  @IsOptional()
  @IsString()
  capability: string;

  @IsOptional()
  @IsArray()
  distanceCost?: updateDistanceCostDTO[];

  @IsOptional()
  @IsArray()
  timeCost?: updateTimeCostDTO[];
}

export class CreateCapabilityCostPriceDTO {
  @IsOptional()
  @IsBoolean()
  sameCostPrice?: boolean;

  @IsOptional()
  @IsNumber()
  minCost?: number;

  @IsNumber()
  maxCost?: number;

  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  pickupPrice?: number;

  @IsOptional()
  @IsNumber()
  pickupCost?: number;

  @IsOptional()
  @IsString()
  capability: string;

  @IsOptional()
  @IsArray()
  distanceCost?: createDistanceCostDTO[];

  @IsOptional()
  @IsArray()
  timeCost?: createTimeCostDTO[];
}
