import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateDocumentDTO {

  @ApiProperty()
  @IsNotEmpty({ message: "Name must not be empty" })
  @IsString({ message: "Name must be a string" })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  description: string;

  @ApiPropertyOptional()
  @IsNotEmpty({ message: "File name must not be empty" })
  @IsString({ message: "File name must be a string" })
  fileName: string;

  @ApiPropertyOptional()
  @IsNotEmpty({ message: "Image URL must not be empty" })
  @IsString({ message: "Image URL must be a string" })
  imageUrl: string;

  @ApiPropertyOptional()
  @IsNotEmpty({ message: "Document type must not be empty" })
  @IsString({ message: "Document type must be a string" })
  documentType: string;
}

export class UpdateDocumentDTO extends PartialType(CreateDocumentDTO) {}
