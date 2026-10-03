import { IsNumber, IsOptional, IsString } from 'class-validator';

export class createZoneCostDTO {
    @IsString()
    from: string;

    @IsString()
    to: string;
  
    @IsNumber()
    cost: number;

    @IsNumber()
    price: number;
  
  }

  export class updateZoneCostDTO {

    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    @IsOptional()
    from?: string;

    @IsString()
    @IsOptional()
    to?: string;
  
    @IsNumber()
    @IsOptional()
    cost?: number;

    @IsNumber()
    @IsOptional()
    price?: number;

  }