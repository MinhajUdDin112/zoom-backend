// stripe.module.ts

import { Module, forwardRef } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { StripeController } from "./stripe.controller";
import { ConfigModule } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UsersModule } from "src/users/users.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Rides } from "src/rides/rides.entity";
import { PusherModule } from "src/pusher/pusher.module";
import { TransactionModule } from "src/transaction/transaction.module";

@Module({
  exports: [StripeService],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Rides]),
    forwardRef(() => UsersModule),
    PusherModule,
    forwardRef(() => TransactionModule),
  ],
  providers: [StripeService, JwtService],
  controllers: [StripeController],
})
export class StripeModule {}
