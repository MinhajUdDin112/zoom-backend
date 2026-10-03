// stripe.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { PinoLogger } from "nestjs-pino";
import {
  AttachPaymentMethodDTO,
  CreatePaymentSheetDTO,
  RemovePaymentMethodDTO,
} from "./dto/transaction.dto";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { Role } from "src/users/enums/users.enum";
import { CurrentUser } from "src/auth/current-user/current-user.guard";
import { Users } from "src/users/user.entity";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@ApiBearerAuth()
@Controller("transaction")
@ApiTags("transaction")
export class TransactionController {
  constructor(
    private readonly logger: PinoLogger,
    private transactionService: TransactionService
  ) {}

  @Get("/ride/:rideId")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.FINANCE,
    Role.OPERATOR,
    Role.FINANCE,
    Role.CONTROLLER
  )
  async getTransactions(@Param("rideId") rideId: string) {
    this.logger.info("Controller=>getTransactions=>Input: %o", rideId);
    const result = await this.transactionService.getTransactions(rideId);
    this.logger.info("Controller=>getTransactions=>Output: %o", result);
    return result;
  }
}
