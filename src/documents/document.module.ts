import { Module } from "@nestjs/common";

import { LoggerModule } from "src/logger/logger.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Document } from "./document.entity";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";

@Module({
  imports: [TypeOrmModule.forFeature([Document]), LoggerModule],
  exports: [DocumentService],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
