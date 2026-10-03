import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Drivers } from "src/driver/driver.entity";
import { Vehicle } from "src/vehicles/vehicle.entity";

export class LiscenseDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @ApiProperty()
  @IsNotEmpty()
  driverId: string;
  @ApiProperty()
  @IsNotEmpty()
  vehicleId: string;
  @IsOptional()
  userId:string
}

export class UpdateLiscenseDTO{
    @ApiProperty()
    @IsNotEmpty()
    vehicleId: string;
}

export class GetAllDTO {
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
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search: string;
  }
