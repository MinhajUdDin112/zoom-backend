// stripe.service.ts

import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentMethodDTO } from "./dto/transaction.dto";
import { PinoLogger } from "nestjs-pino";
import { RidesService } from "src/rides/rides.service";
import { RIDE_PAYMENT_STATUS } from "src/rides/enums/rides.enum";
import { Rides } from "src/rides/rides.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { PusherService } from "src/pusher/pusher.service";
import { Transaction } from "./transaction.entity";

@Injectable()
export class TransactionService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly logger: PinoLogger
  ) {}

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    try {
      this.logger.info("Service=>createTransaction=>Input: %o %o", data);

      const transaction = this.transactionRepository.create(data);
      const result = await this.transactionRepository.save(transaction);
      this.logger.info("Service=>createTransaction=>Output: %o", result);
      return result;
    } catch (error) {
      this.logger.error("Service=>createTransaction=>Error: %o", error);
      throw new Error(error);
    }
  }

  async getTransactions(rideId: string): Promise<Transaction[]> {
    try {
      this.logger.info("Service=>createTransaction=>Input: %o %o", rideId);
      const result = await this.transactionRepository.find({
        where: { rideId },
        order: { createdAt: "ASC" },
      });
      this.logger.info("Service=>createTransaction=>Output: %o", result);
      return result;
    } catch (error) {
      this.logger.error("Service=>createTransaction=>Error: %o", error);
      throw new Error(error);
    }
  }
}
