import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class ResetPasswordDTO{
    @ApiProperty()
    @IsNotEmpty()
    phoneNumber:number;
    @ApiProperty()
    @IsNotEmpty()
    password:string;
}