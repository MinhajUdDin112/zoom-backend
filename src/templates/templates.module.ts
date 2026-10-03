import { Module } from "@nestjs/common";
import { VariableFareTemplateController } from "./controllers/variableFareTemplate.controller";
import { VaraiableFareTemplateService } from "./services/variableFareTemplate.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VariableFareTemplate } from "./entities/variableFareTemplate.entity";
import { TimeCost } from "./entities/timeCost.entity";
import { DistanceCost } from "./entities/distanceCost.entity";
import { Capability } from "src/capability/entity/capability.entity";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "src/users/users.module";
import { ZoneCost } from "./entities/zoneCost.entity";
import { ZoneTemplate } from "./entities/zoneTemplate.entity";
import { ZoneTemplateController } from "./controllers/zoneTemplate.controller";
import { ZoneTemplateService } from "./services/zoneTemplate.service";
import { CapabilityCostPrice } from "./entities/capabilityCostPrice.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VariableFareTemplate,
      TimeCost,
      DistanceCost,
      Capability,
      ZoneCost,
      ZoneTemplate,
      CapabilityCostPrice,
    ]),
    JwtModule,
    UsersModule,
  ],
  controllers: [VariableFareTemplateController, ZoneTemplateController],
  providers: [VaraiableFareTemplateService, ZoneTemplateService],
})
export class TemplatesModule {}
