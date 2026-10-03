import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
  } from "class-validator";
import { createZoneCostDTO, updateZoneCostDTO } from "./zoneCost.dto";
  
  export class CreateZoneTemplateDTO {
    @IsString()
    matixName: string;

    @IsOptional()
    @IsBoolean()
    mirrorAllEnteredAmount?: boolean;
  
    @IsOptional()
    @IsNumber()
    globalIncrementAmount?: number;
  
    @IsNumber()
    costPerExtraMile: number;
  
    @IsNumber()
    pricePerExtraMile: number;

    @IsOptional()
    @IsArray()
    zoneCost?: createZoneCostDTO[];
  }


export class UpdateZoneTemplateDTO {
  @IsString()
  @IsOptional()
  matixName?: string;

  @IsBoolean()
  @IsOptional()
  mirrorAllEnteredAmount?: boolean;

  @IsNumber()
  @IsOptional()
  costPerExtraMile?: number;

  @IsNumber()
  @IsOptional()
  pricePerExtraMile?: number;

  @IsNumber()
  @IsOptional()
  globalIncrementAmount?: number;


  @IsArray()
  @IsOptional()
  zoneCost?: updateZoneCostDTO[];
}
