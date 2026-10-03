// stripe.module.ts

import { Module, forwardRef } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { TransactionController } from "./transaction.controller";
import { ConfigModule } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transaction } from "./transaction.entity";
import { UsersModule } from "src/users/users.module";

@Module({
  exports: [TransactionService],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Transaction]),
    forwardRef(() => UsersModule),
  ],
  providers: [TransactionService, JwtService],
  controllers: [TransactionController],
})
export class TransactionModule {}
