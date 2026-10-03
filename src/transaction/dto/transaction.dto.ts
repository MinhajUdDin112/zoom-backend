import { IsNumber, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePaymentSheetDTO {
  @ApiProperty()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "amount must be a number" }
  )
  amount: number;

  @ApiProperty()
  @IsString()
  customerId: string;
}

export class AttachPaymentMethodDTO {
  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  paymentMethodId: string;
}

export class RemovePaymentMethodDTO {
  @ApiProperty()
  @IsString()
  paymentMethodId: string;
}

export class PaymentMethodDTO {
  stripePaymentMethodId: string;
  last4: string;
  expMonth: number;
  expYear: number;
  brand: string;
}
