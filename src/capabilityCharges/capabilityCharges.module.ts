import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "src/users/users.module";
import { JwtModule } from "@nestjs/jwt";
import { CapabilityCharges } from "./entity/capabilityCharges.entity";
import { CapabilityTemplate } from "./entity/capabilityTemplate.entity";
import { CapabilityChargesService } from "./capabilityCharges.service";
import { CapabilityChargesController } from "./capabilityCharges.controller";
import { Capability } from "src/capability/entity/capability.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CapabilityCharges,
      CapabilityTemplate,
      Capability,
    ]),
    UsersModule,
    JwtModule,
  ],
  providers: [CapabilityChargesService],
  controllers: [CapabilityChargesController],
})
export class CapabilityChargesModule {}
