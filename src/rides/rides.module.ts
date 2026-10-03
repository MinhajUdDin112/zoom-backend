import { Module } from "@nestjs/common";
import { RidesController } from "./rides.controller";
import { RidesService } from "./rides.service";
import { LoggerModule } from "src/logger/logger.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "src/users/users.module";
import { JwtService } from "@nestjs/jwt";
import { DocumentModule } from "src/documents/document.module";
import { CapabilityModule } from "src/capability/capability.module";
import { PusherModule } from "src/pusher/pusher.module";
import { VehicleModule } from "src/vehicles/vehicle.module";
import { StripeModule } from "src/stripe/stripe.module";
import { RideFareDetails } from "./ride-fare-details.entity";
import { RideCapabilityCharges } from "./ride-capability-charges.entity";
import { TwilioModule } from "src/twilio/twilio.module";
import { RideHistory } from "./rides-history.entity";
import { DriverModule } from "src/driver/driver.module";
import { NotificationModule } from "src/notification/notification.module";
import { TarrifsModule } from "src/tarrifs/tarrifs.module";
import { Vehicle } from "src/vehicles/vehicle.entity";
import { Drivers } from "src/driver/driver.entity";
import { Rides } from "./rides.entity";
import { RideLocationHistory } from "./ride-location-history.entity";
import { UtilsModule } from "src/utils/utils.module";
import { Zone } from "src/zone/zone.entity";
import { RideMessages } from "./ride-messages.entity";
import { TransactionModule } from "src/transaction/transaction.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rides,
      RideMessages,
      Drivers,
      RideFareDetails,
      RideCapabilityCharges,
      RideHistory,
      Vehicle,
      RideLocationHistory,
      Zone,
    ]),
    LoggerModule,
    UsersModule,
    DocumentModule,
    CapabilityModule,
    PusherModule,
    VehicleModule,
    StripeModule,
    TwilioModule,
    DriverModule,
    NotificationModule,
    TarrifsModule,
    UtilsModule,
    TransactionModule,
  ],
  exports: [RidesService],
  controllers: [RidesController],
  providers: [RidesService, JwtService],
})
export class RideModule {}
