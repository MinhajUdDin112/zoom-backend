// stripe.controller.ts

import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { PinoLogger } from "nestjs-pino";
import {
  AttachPaymentMethodDTO,
  CreatePaymentSheetDTO,
  RemovePaymentMethodDTO,
} from "./dto/stripe.dto";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { Role } from "src/users/enums/users.enum";
import { CurrentUser } from "src/auth/current-user/current-user.guard";
import { Users } from "src/users/user.entity";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@ApiBearerAuth()
@Controller("stripe")
@ApiTags("stripe")
export class StripeController {
  constructor(
    private readonly logger: PinoLogger,
    private stripeService: StripeService
  ) {}

  @Post("webhook")
  async handleWebhook(@Req() req, @Res() res): Promise<void> {
    const result = await this.stripeService.webhook(req);
    if (result.startsWith("Webhook Error:")) {
      res.status(HttpStatus.BAD_REQUEST).send(result);
    } else {
      res.status(HttpStatus.OK).send(result);
    }
  }

  @Post("/payment-sheet")
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  async createPaymentSheet(@Body(ValidationPipe) input: CreatePaymentSheetDTO) {
    this.logger.info("Controller=>createPaymentSheet=>Input: %o", input);
    const result = await this.stripeService.createPaymentSheet(
      input.amount,
      input.customerId
    );
    this.logger.info("Controller=>createPaymentSheet=>Output: %o", result);
    return result;
  }

  @Post("/setup-intent")
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  async createSetupIntent(@CurrentUser() user: Users) {
    this.logger.info(
      "Controller=>setup-intent=>Input: %o",
      user.stripeCustomerId
    );
    const result = await this.stripeService.createSetupIntent(
      user.stripeCustomerId
    );
    this.logger.info("Controller=>createPaymentSheet=>Output: %o", result);
    return result;
  }

  @Post("/payment-method/attach")
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  async attachPaymentMethod(
    @Body(ValidationPipe) input: AttachPaymentMethodDTO
  ) {
    this.logger.info("Controller=>attachPaymentMethod=>Input: %o", input);
    const result = await this.stripeService.attachPaymentMethod(
      input.customerId,
      input.paymentMethodId
    );
    this.logger.info("Controller=>attachPaymentMethod=>Output: %o", result);
    return result;
  }

  @Post("/payment-method/remove")
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  async removePaymentMethod(
    @Body(ValidationPipe) input: RemovePaymentMethodDTO
  ) {
    this.logger.info("Controller=>removePaymentMethod=>Input: %o", input);
    const result = await this.stripeService.detachPaymentMethod(
      input.paymentMethodId
    );
    this.logger.info("Controller=>removePaymentMethod=>Output: %o", result);
    return result;
  }

  @Post("/payment-method/list")
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  async listPaymentMethod(@CurrentUser() user: Users) {
    this.logger.info("Controller=>listPaymentMethod=>Input: %o", user);
    const result = await this.stripeService.getPaymentMethods(
      user.stripeCustomerId
    );
    this.logger.info("Controller=>listPaymentMethod=>Output: %o", result);
    return result;
  }
}
