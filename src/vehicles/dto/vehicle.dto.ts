import {
  IsNotEmpty,
  IsBoolean,
  IsArray,
  IsOptional,
  IsString,
} from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber } from "class-validator";
import { Expose } from "class-transformer";
export class CreateVehicleDTO {
  @IsNotEmpty({ message: "Call sign must not be empty" })
  callSign: string;

  @IsNotEmpty({ message: "Make must not be empty" })
  make: string;

  @IsNotEmpty({ message: "Model must not be empty" })
  model: string;

  @IsNotEmpty({ message: "MDT ID must not be empty" })
  mdtId: string;

  @IsNotEmpty({ message: "Colour must not be empty" })
  colour: string;

  @IsNotEmpty({ message: "Registration must not be empty" })
  registration: string;

  @IsNotEmpty({ message: "Passengers must not be empty" })
  passengers: string;

  @IsOptional()
  year: string;

  @IsOptional()
  plateNumber: string;

  @IsOptional()
  driverId: string;

  @IsOptional()
  driverGroupId: string;

  @IsOptional()
  @IsBoolean({ message: "Is suspended must be a boolean" })
  isSuspended: boolean;

  @IsOptional()
  @IsArray({ message: "Capabilities must be an array" })
  //   @Expose({ name: 'Capabilities' })
  capabilities: string[];

  @IsOptional()
  @IsString({ message: "Vehicle comment one must be a string" })
  vehicleCommentOne: string;

  @IsOptional()
  @IsString({ message: "Vehicle comment two must be a string" })
  vehicleCommentTwo: string;

  @IsOptional()
  @IsString({ message: "Vehicle comment three must be a string" })
  vehicleCommentThree: string;

  @IsOptional()
  @IsString({ message: "Vehicle comment four must be a string" })
  vehicleCommentFour: string;

  @IsOptional()
  @IsString({ message: "Vehicle comment five must be a string" })
  vehicleCommentFive: string;

  @IsOptional()
  @IsBoolean({ message: "Is card enable must be a boolean" })
  isCardEnable: boolean;

  @IsOptional()
  @IsString({ message: "Card number must be a string" })
  cardNumber: string;

  @IsOptional()
  @IsString({ message: "Machine must be a string" })
  machine: string;

  @IsOptional()
  @IsString({ message: "Driver login mode must be a string" })
  driverLoginMode: string;

  @IsNotEmpty({ message: "Passengers must not be empty" })
  @IsString({ message: "Road tax expires must be a string" })
  roadtaxExpires: string;

  @IsNotEmpty({ message: "Passengers must not be empty" })
  @IsString({ message: "Plate expires must be a string" })
  platExpires: string;

  @IsNotEmpty({ message: "Passengers must not be empty" })
  @IsString({ message: "MDT expires must be a string" })
  mdtExpires: string;

  @IsNotEmpty({ message: "Passengers must not be empty" })
  @IsString({ message: "Insurance expires must be a string" })
  insuranceExpires: string;

  @ApiProperty()
  @IsArray()
  VehicleDocuments: string[];
}

export class UpdateVehicleDTO extends PartialType(CreateVehicleDTO) {}
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

// src/vehicles/dto/get-rides-by-callsign.dto.ts
export class GetRidesByCallSignDto {
  callSign: string;
}
