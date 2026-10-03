import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { CapabilityCharges } from "src/capabilityCharges/entity/capabilityCharges.entity";

export class CreateTariffDTO {
  @IsString()
  name: string;

  @IsString()
  shortName: string;

  @IsString()
  type: string;

  @IsString()
  jobType: string;

  @IsString()
  pickupType: string;

  @IsOptional()
  @IsString()
  pickupValue?: string;

  @IsString()
  destinationType: string;

  @IsOptional()
  @IsString()
  destinationValue?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  capabilityTemplate?: string;

  @IsOptional()
  @IsDateString()
  tariffDate: Date;
  @IsOptional()
  @IsNumber()
  pickupLatitude: number;
  @IsOptional()
  @IsNumber()
  pickupLongitude: number;
  @IsOptional()
  @IsNumber()
  destinationLatitude: number;
  @IsOptional()
  @IsNumber()
  destinationLongitude: number;

  // @IsOptional()
  // @IsString()
  // zoneTemplate?: string;

  // @IsOptional()
  // @IsString()
  // destinationZone?: string;

  // @IsOptional()
  // @IsString()
  // pickupZone?: string;
}

export class UpdateTariffDTO {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  shortName: string;

  @IsString()
  @IsOptional()
  jobType: string;

  @IsString()
  @IsOptional()
  pickupType: string;

  @IsOptional()
  @IsString()
  pickupValue?: string;

  @IsString()
  @IsOptional()
  destinationType: string;

  @IsOptional()
  @IsString()
  destinationValue?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsOptional()
  @IsDateString()
  tariffDate: Date;

  @IsString()
  @IsOptional()
  capabilityTemplate: string;
  @IsOptional()
  @IsNumber()
  pickupLatitude: number;
  @IsOptional()
  @IsNumber()
  pickupLongitude: number;
  @IsOptional()
  @IsNumber()
  destinationLatitude: number;
  @IsOptional()
  @IsNumber()
  destinationLongitude: number;
  // @IsOptional()
  // @IsString()
  // zoneTemplate?: string;

  // @IsOptional()
  // @IsString()
  // pickupZone?: string;
}
export interface ICoordinate {
  latitude: number;
  longitude: number;
}

export class CoordinateDTO implements ICoordinate {
  @ApiProperty()
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  longitude: number;
}

export class RecommendedFareDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  capabilityId: string;

  @ApiProperty()
  @IsString()
  pickupLocationAddress: string;

  @ApiProperty()
  @IsString()
  pickupTown: string;

  @ApiProperty()
  @IsString()
  pickupLocationPostalAddress: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CoordinateDTO)
  pickupCoordinates: CoordinateDTO;

  @ApiProperty()
  @IsString()
  destinationLocationAddress: string;

  @ApiProperty()
  @IsString()
  destinationTown: string;

  @ApiProperty()
  @IsString()
  destinationLocationPostalAddress: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CoordinateDTO)
  destinationCoordinates: CoordinateDTO;

  @ApiProperty()
  @IsNumber()
  distance: number;

  @ApiProperty()
  @IsNumber()
  time: number;
}

export class TemplatePriceCostDto {
  type: string;
  tarrifId: string;
  templateId: string;

  price: number;
  cost: number;

  capabilityChargesCost: number;
  capabilityChargesPrice: number;
  activeCapabilityCharges: CapabilityCharges[];

  chargingZonesChargesPrice: number;

  totalCost: number;
  totalPrice: number;
}
