import { Module } from "@nestjs/common";

import { LoggerModule } from "src/logger/logger.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VehicleService } from "./vehicle.service";
import { VehicleController } from "./vehicle.controller";
import { Vehicle } from "./vehicle.entity";

import { DocumentModule } from "src/documents/document.module";
import { JwtService } from "@nestjs/jwt";
import { UsersModule } from "src/users/users.module";
import { Document } from "src/documents/document.entity";
import { CapabilityModule } from "src/capability/capability.module";
import { Capability } from "src/capability/entity/capability.entity";
import { Liscense } from "src/liscense/entity/liscense.entity";
import { DriverGroup } from "src/driverGroups/driverGroup.entity";
import { DriverGroupModule } from "src/driverGroups/driverGroup.module";
import { UtilsService } from "src/utils/utils.service";
import { UtilsModule } from "src/utils/utils.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, Document, Capability,Liscense]),
    CapabilityModule,
    LoggerModule,
    UsersModule,
    DocumentModule,
    DriverGroupModule,
    UtilsModule
],
  exports: [VehicleService],
  controllers: [VehicleController],
  providers: [VehicleService, JwtService],
})
export class VehicleModule {}
