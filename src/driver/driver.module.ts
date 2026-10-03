import { Module } from "@nestjs/common";
import { DriversController } from "./driver.controller";
import { DriversService } from "./driver.service";
import { LoggerModule } from "src/logger/logger.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Drivers } from "./driver.entity";
import { UsersModule } from "src/users/users.module";
import { JwtService } from "@nestjs/jwt";
import { DocumentModule } from "src/documents/document.module";
import { CapabilityModule } from "src/capability/capability.module";
import { Vehicle } from "src/vehicles/vehicle.entity";
import { ZoneModule } from "src/zone/zone.module";
import { DeviceToken } from "src/notification/entity/device-token.entity";
import { Users } from "src/users/user.entity";
import { Zone } from "src/zone/zone.entity";
import { UtilsModule } from "src/utils/utils.module";
import { TarrifsService } from "src/tarrifs/tarrifs.service";
import { TarrifsModule } from "src/tarrifs/tarrifs.module";
import { Rides } from "src/rides/rides.entity";
import { RideLocationHistory } from "src/rides/ride-location-history.entity";
import { DriverWorkingHour } from "./driverWorkingHours.entity";
import { Capability } from "src/capability/entity/capability.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Drivers,
      DeviceToken,
      Vehicle,
      Users,
      Zone,
      Rides,
      RideLocationHistory,
      DriverWorkingHour,
      Capability,
    ]),
    LoggerModule,
    UsersModule,
    DocumentModule,
    ZoneModule,
    CapabilityModule,
    UsersModule,
    TarrifsModule,
    UtilsModule,
  ],
  exports: [DriversService],
  controllers: [DriversController],
  providers: [DriversService, JwtService],
})
export class DriverModule {}
