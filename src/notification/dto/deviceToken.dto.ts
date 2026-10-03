import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  ValidateNested,
} from "class-validator";

export class DeviceTokenDTO {
  @ApiProperty()
  @IsNotEmpty()
  os: string;
  @ApiProperty()
  @IsNotEmpty()
  deviceToken: string;
}

export class NotificationDTO {
  @ApiProperty()
  @IsNotEmpty()
  title: string;
  @ApiProperty()
  @IsNotEmpty()
  type: string;
  @ApiProperty()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data: any;
}
