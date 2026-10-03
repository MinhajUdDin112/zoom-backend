import { Module } from "@nestjs/common";

import { LoggerModule } from "src/logger/logger.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DriverGroupController } from "./driverGroup.controller";
import { DriverGroupService } from "./driverGroup.service";
// import { Driver } from "./driver.entity";
import { DriverGroup } from "./driverGroup.entity";

import { JwtService } from "@nestjs/jwt";
import { UsersModule } from "src/users/users.module";
import { DriverModule } from "src/driver/driver.module";
import { UtilsModule } from "src/utils/utils.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverGroup]),
    LoggerModule,
    DriverModule,
    UsersModule,
    UtilsModule
  ],
  exports: [DriverGroupService],
  controllers: [DriverGroupController],
  providers: [DriverGroupService, JwtService],
})
export class DriverGroupModule {}
