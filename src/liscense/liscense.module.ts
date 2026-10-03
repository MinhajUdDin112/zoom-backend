import { Module } from "@nestjs/common";
import { LiscenseController } from "./liscense.controller";
import { LiscenseService } from "./liscense.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Liscense } from "./entity/liscense.entity";
import { UsersModule } from "src/users/users.module";
import { JwtModule } from "@nestjs/jwt";
import { VehicleModule } from "src/vehicles/vehicle.module";
import { DriverModule } from "src/driver/driver.module";
import { Vehicle } from "src/vehicles/vehicle.entity";
import { Drivers } from "src/driver/driver.entity";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { UtilsModule } from "src/utils/utils.module";
import { GmailsModule } from "src/gmail/gmail.module";
import { RideModule } from "src/rides/rides.module";
import { DeviceToken } from "src/notification/entity/device-token.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Liscense, Vehicle, Drivers, DeviceToken]),
    UsersModule,
    JwtModule,
    UtilsModule,
    VehicleModule,
    DriverModule,
    UsersModule,
    GmailsModule,
    RideModule,
  ],
  controllers: [LiscenseController],
  providers: [LiscenseService],
})
export class LiscenseModule {}
