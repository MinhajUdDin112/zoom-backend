import { Module } from "@nestjs/common";
import { CapabilityService } from "./capability.service";
import { CapabilityController } from "./capability.controller";
import { Capability } from "./entity/capability.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "src/users/users.service";
import { UsersModule } from "src/users/users.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [TypeOrmModule.forFeature([Capability]), UsersModule, JwtModule],
  providers: [CapabilityService],
  controllers: [CapabilityController],
  exports: [CapabilityService],
})
export class CapabilityModule {}
