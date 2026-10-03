import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { LoggerModule } from "src/logger/logger.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Users } from "./user.entity";
import { UtilsModule } from "src/utils/utils.module";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { StripeModule } from "src/stripe/stripe.module";
import { DeviceToken } from "src/notification/entity/device-token.entity";
import { DriverModule } from "src/driver/driver.module";
import { Rides } from "src/rides/rides.entity";
import { Drivers } from "src/driver/driver.entity";
import { GmailsModule } from "src/gmail/gmail.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Users, DeviceToken, Rides, Drivers]),
    LoggerModule,
    JwtModule,
    StripeModule,
    GmailsModule,
  ],
  exports: [UsersService],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
