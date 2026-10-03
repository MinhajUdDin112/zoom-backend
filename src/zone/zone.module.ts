import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Zone } from "./zone.entity";
import { ZoneService } from "./zone.service";
import { ZoneController } from "./zone.controller";
import { UsersModule } from "src/users/users.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [TypeOrmModule.forFeature([Zone]), JwtModule, UsersModule],
  exports:[ZoneService],
  providers: [ZoneService],
  controllers: [ZoneController],
})
export class ZoneModule {}
