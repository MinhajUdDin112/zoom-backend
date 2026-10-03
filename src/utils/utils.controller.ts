import {
  Controller,
} from '@nestjs/common';
import { UtilsService } from './utils.service';
import {PinoLogger} from "nestjs-pino";

@Controller()
export class UtilsController {
  constructor(
      private readonly utilsService: UtilsService,
      private readonly logger: PinoLogger,
) {
    logger.setContext(UtilsController.name);
  }
}
