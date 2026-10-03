// import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

// export class FilterByDTO {
//   @ApiPropertyOptional()
//   filterBy: Object;
// }

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber } from "class-validator";

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
