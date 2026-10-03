import { Module } from "@nestjs/common";

import { LoggerModule } from "src/logger/logger.module";
import { TypeOrmModule } from "@nestjs/typeorm";

import { JwtModule, JwtService } from "@nestjs/jwt";
import { AreaGroup } from "./areaGroup.entity";
import { AreaGroupsService } from "./areaGroup.service";
import { AreaGroupController } from "./areaGroup.controller";
import { UsersModule } from "src/users/users.module";

//To do add jwt service
@Module({
  imports: [
    TypeOrmModule.forFeature([AreaGroup]),
    LoggerModule,
    JwtModule,
    UsersModule,
  ],

  controllers: [AreaGroupController],
  providers: [AreaGroupsService],
})
export class AreaGroupModule {}
