import { Body, Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Roles } from './Roles.decorator';
import { PinoLogger } from 'nestjs-pino';
import { LoggerService } from './logger/logger.service';
@Controller()
export class AppController {
  constructor(
    private readonly logger: PinoLogger,
    private readonly appService: AppService,
  ) {
    logger.setContext(AppController.name);
  }

  @Get()
  getHello(): string {
    return this.appService.getProjectName();
  }
}
