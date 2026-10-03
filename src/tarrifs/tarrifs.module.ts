import { Module } from "@nestjs/common";
import { TarrifsService } from "./tarrifs.service";
import { TarrifsController } from "./tarrifs.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tariff } from "./entities/tarrif.entity";
import { VariableFareTemplate } from "src/templates/entities/variableFareTemplate.entity";
import { ZoneTemplate } from "src/templates/entities/zoneTemplate.entity";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "src/users/users.module";
import { CapabilityTemplate } from "src/capabilityCharges/entity/capabilityTemplate.entity";
import { Zone } from "src/zone/zone.entity";
import { ZoneModule } from "src/zone/zone.module";
import { AreaGroup } from "src/AreaGroup/areaGroup.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tariff,
      VariableFareTemplate,
      ZoneTemplate,
      CapabilityTemplate,
      Zone,
      AreaGroup,
    ]),
    ZoneModule,
    JwtModule,
    UsersModule,
  ],
  controllers: [TarrifsController],
  providers: [TarrifsService],
  exports: [TarrifsService],
})
export class TarrifsModule {}
