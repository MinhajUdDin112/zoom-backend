import { Module } from "@nestjs/common";
import { UtilsService } from "./utils.service";
import { UtilsController } from "./utils.controller";
import { LoggerModule } from "src/logger/logger.module";

@Module({
  imports: [LoggerModule],
  controllers: [UtilsController],
  providers: [UtilsService],
  exports: [UtilsService],
})
export class UtilsModule {}
