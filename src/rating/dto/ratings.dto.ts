import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional } from "class-validator";

export class RatingDTO {
  @ApiProperty()
  @IsOptional()
  comment?: string;

  @ApiProperty()
  @IsNotEmpty()
  star: number;

  @ApiProperty()
  @IsNotEmpty()
  driverId: string;

  @ApiProperty()
  @IsNotEmpty()
  rideId: string;
}

export class UpdateRatingDTO {
  @ApiProperty()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsOptional()
  comment?: string;

  @ApiProperty()
  @IsOptional()
  star?: number;

  @ApiProperty()
  @IsOptional()
  driverId?: string;

  @ApiProperty()
  @IsOptional()
  rideId?: string;
}
export class SkipRatingDTO {
  @ApiProperty()
  @IsNotEmpty()
  rideId: string;
}
