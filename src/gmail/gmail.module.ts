import { Module } from "@nestjs/common";
import { LoggerModule } from "src/logger/logger.module";
import { GmailController } from "./gmail.controller";
import { GmailService } from "./gmail.service";

@Module({
  imports: [LoggerModule],
  controllers: [GmailController],
  providers: [GmailService],
  exports: [GmailService],
})
export class GmailsModule {}
