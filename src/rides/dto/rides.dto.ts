import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  isObject,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { RIDE_STATUS } from "../enums/rides.enum";

export class ActiveCapabilityChargesDTO {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsNumber()
  cost: number;

  @ApiProperty()
  @IsBoolean()
  isCommissionable: boolean;

  @ApiProperty()
  @IsString()
  status: string;
}
export class FareDTO {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  tarrifId: string;

  @ApiProperty()
  @IsString()
  templateId: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsNumber()
  cost: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minCost: number;

  @ApiPropertyOptional()
  @IsString()
  pickupZoneId: string;

  @ApiPropertyOptional()
  @IsString()
  destinationZoneId: string;

  @ApiProperty()
  @IsNumber()
  capabilityChargesCost: number;
  @ApiProperty()
  @IsNumber()
  capabilityChargesPrice: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ActiveCapabilityChargesDTO)
  activeCapabilityCharges: ActiveCapabilityChargesDTO[];

  @ApiProperty()
  @IsNumber()
  chargingZonesChargesPrice: number;

  @ApiProperty()
  @IsNumber()
  totalCost: number;
  @ApiProperty()
  @IsNumber()
  totalPrice: number;
}

export class CreateRideDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  capabilityId: string;

  @ApiPropertyOptional()
  driverId: string;

  @ApiPropertyOptional()
  vehicleId: string;

  @ApiProperty()
  @IsNotEmpty()
  fromAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  toAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  fromLatitude: number;

  @ApiProperty()
  @IsNotEmpty()
  fromLongitude: number;

  @ApiProperty()
  @IsNotEmpty()
  toLatitude: number;

  @ApiProperty()
  @IsNotEmpty()
  toLongitude: number;

  @ApiProperty()
  isScheduled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduleDateTime: Date;

  @ApiPropertyOptional()
  @IsOptional()
  promo: string;

  @ApiPropertyOptional()
  @IsOptional()
  driverComments: string;

  @ApiProperty()
  @IsNotEmpty()
  distance: number;

  @ApiProperty()
  @IsNotEmpty()
  time: number;

  @ApiPropertyOptional()
  status: string;

  @ApiPropertyOptional()
  account: string;
  @ApiPropertyOptional()
  priority: number;
  @ApiPropertyOptional()
  passengers: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => FareDTO)
  fare: FareDTO;
}

export class UpdateRideDTO extends PartialType(CreateRideDTO) {}

export class UpdateRideStatusDTO {
  @ApiProperty()
  @IsNotEmpty()
  status: string;
}

export class CancelNoFareRideStatusDTO {
  @ApiProperty()
  @IsNotEmpty()
  rideId: string;

  @ApiProperty()
  @IsNotEmpty()
  status: RIDE_STATUS.CANCELLED | RIDE_STATUS.NO_FARE;
}

export class DisptachRideByVehicleIdDTO {
  // @ApiProperty()
  // @IsNotEmpty()
  // vehicleId: string;

  @ApiProperty()
  @IsNotEmpty()
  rideId: string;
}

export class UpdateRideVehicleStatusDTO {
  @IsString()
  callSign: string;

  @IsString()
  status: string;
}

export class DisptachRequestedRideByVehicleIdDTO {
  @ApiProperty()
  @IsNotEmpty()
  callSign: string;

  @ApiProperty()
  @IsNotEmpty()
  rideId: string;
}

export class DispatchRideByVehicleIdDTO {
  @ApiProperty()
  @IsNotEmpty()
  vehicleCallSign: string;

  @ApiProperty()
  @IsNotEmpty()
  status?: string;
}
export class RecoverJobDTO {
  vehicleCallSign: string;
}

export class CompleteJobDTO {
  vehicleCallSign: string;
}

export class UpdateRideMessageDto {
  @ApiProperty()
  @IsNotEmpty()
  id: string;

  @IsBoolean()
  isRead: boolean;
}
