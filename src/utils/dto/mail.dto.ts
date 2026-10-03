import { IsEmail, IsNotEmpty, IsString } from "class-validator"

export class MailDTO{
    @IsEmail()
    from: string;
    @IsEmail()
    to: string;
    @IsString()
    @IsNotEmpty()
    subject: string;
    @IsString()
    @IsNotEmpty()
    text: string;
}