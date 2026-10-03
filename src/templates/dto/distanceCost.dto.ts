import { IsNumber, IsOptional, IsString } from 'class-validator';

export class createDistanceCostDTO {
    @IsNumber()
    from: number;

    @IsNumber()
    to: number;
  
    @IsNumber()
    cost: number;

    @IsNumber()
    price: number;
  
  }

  export class updateDistanceCostDTO {

    @IsOptional()
    @IsString()
    id?: string;

    @IsNumber()
    from: number;

    @IsNumber()
    to: number;
  
    @IsNumber()
    cost: number;

    @IsNumber()
    price: number;

  }