import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export class CreateDriverDTO {
  @ApiProperty()
  // @IsNotEmpty()
  profileImageUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  // @IsNotEmpty()
  dob: Date;

  @ApiPropertyOptional()
  landLine: string;

  @ApiProperty()
  @IsNotEmpty()
  mobile: string;

  @ApiPropertyOptional()
  addressLine1: string;

  @ApiPropertyOptional()
  addressLine2: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  country: string;

  @ApiPropertyOptional()
  town: string;

  @ApiPropertyOptional()
  postcode: string;

  @ApiProperty()
  @IsNotEmpty({ message: "Call sign must not be empty" })
  callSign: string;

  @ApiPropertyOptional()
  driverComment1: string;

  @ApiPropertyOptional()
  driverComment2: string;

  @ApiProperty()
  @IsNotEmpty()
  company: string;

  @ApiProperty()
  @IsNotEmpty()
  acceptedPayments: string;

  @ApiPropertyOptional()
  cashBookings: boolean;

  @ApiPropertyOptional()
  accountBookings: boolean;

  @ApiPropertyOptional()
  canCustomerCall: boolean;

  @ApiPropertyOptional()
  transactionGroup: string;

  @ApiProperty()
  @IsNotEmpty()
  driverType: string;

  @ApiPropertyOptional()
  nationalInsuranceNumber: string;

  @ApiPropertyOptional()
  bankName: string;

  @ApiPropertyOptional()
  bankShortCode: string;

  @ApiPropertyOptional()
  bankAccountNumber: string;

  @ApiPropertyOptional()
  badgeNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  badgeExpiry: Date;

  @ApiPropertyOptional()
  driverLicenseNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  driverLicenseExpiry: Date;

  @ApiPropertyOptional()
  bankTransfer: boolean;

  @ApiPropertyOptional()
  ebpJournalCode: string;

  @ApiPropertyOptional()
  ebpBankCode: string;

  @ApiPropertyOptional()
  ebpPaymentMethod: string;

  @ApiPropertyOptional()
  ebpPaypalEmail: string;

  @ApiPropertyOptional()
  ePayout: boolean;

  @ApiPropertyOptional()
  ebpWorkJournalCode?: string;

  @ApiPropertyOptional()
  online: boolean;

  @ApiPropertyOptional()
  ebpWorkBankCode: string;

  @ApiPropertyOptional()
  ebpWorkPaymentMethod: string;

  @ApiPropertyOptional()
  ebpWorkPaypalEmail: string;

  @ApiPropertyOptional()
  currencyCode: string;

  @IsOptional()
  @IsArray({ message: "Capabilities must be an array" })
  capabilities: string[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  driverDocuments: string[];
}

export class UpdateDriverDTO extends PartialType(CreateDriverDTO) {}

export class UpdateDriverStatusDTO {
  @ApiProperty()
  @IsNotEmpty()
  status: string;
}

export class DriverInfoDto {
  vehicleId: string;
  driverId: string;
  callSign: string;
  capabilityShortCodes: string[];
  zone: string;
  timeSinceLastRide: string;
}

export class DriverOnline {
  online: boolean;
}

export class ForceDriverOnlineDTO {
  @ApiProperty()
  @IsString()
  callSign: string;

  @ApiProperty()
  @IsBoolean()
  online: boolean;
}

export class DriverUserDTO {
  readonly id?: string;
  readonly userName?: string;
  readonly phoneNumber: string;
  readonly email?: string;
  readonly role?: string;
  readonly dob?: Date;
  readonly iat?: number;
}

export class LocationDTO {
  bearing: number;
  longitude: number;
  latitude: number;
  zone?: string;
  rideId?: string;
}
export enum RIDE_PAYMENT_STATUS {
  UNPAID = "UNPAID",
  PAID = "PAID",
}

export enum DriverStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
}
