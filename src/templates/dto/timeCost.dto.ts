import { IsNumber, IsOptional, IsString } from 'class-validator';

export class createTimeCostDTO {
    @IsNumber()
    fromMinutes: number;

    @IsNumber()
    toMinutes: number;

    @IsNumber()
    fromSeconds: number;

    @IsNumber()
    toSeconds: number;
  
    @IsNumber()
    cost: number;

    @IsNumber()
    price: number;

  }

  export class updateTimeCostDTO {

    @IsOptional()
    @IsString()
    id?: string;

    @IsNumber()
    fromMinutes: number;

    @IsNumber()
    toMinutes: number;

    @IsNumber()
    fromSeconds: number;

    @IsNumber()
    toSeconds: number;
  
    @IsNumber()
    cost: number;

    @IsNumber()
    price: number;


  }