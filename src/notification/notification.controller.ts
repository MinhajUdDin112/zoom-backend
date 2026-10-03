import { Body, Controller, Get, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Role } from 'src/AreaGroup/enums/areaGroup.enum';
import { AuthGuard } from 'src/auth/auth-guard/auth-guard.guard';
import { CreateCapabilityDTO, GetAllDTO } from 'src/capability/dto/createCapabaility.dto';
import { Roles } from 'src/Roles.decorator';
import { NotificationService } from './notification.service';
import { DeviceTokenDTO, NotificationDTO } from './dto/deviceToken.dto';
import { GetUserDTO } from 'src/users/dto/user.dto';
import { CurrentUser } from 'src/auth/current-user/current-user.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('notification')
export class NotificationController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly logger: PinoLogger
    ){}
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN,Role.CONTROLLER,Role.CUSTOMER,Role.DRIVER,Role.FINANCE,Role.OPERATOR)
  @Post("/create")
  async createDeviceToken(@CurrentUser() user:GetUserDTO, @Body() data: DeviceTokenDTO) {
    this.logger.info("Controller=>createDeviceToken=>Input: %o", data,user);
    const res = await this.notificationService .createDeviceToken(user,data);
    this.logger.info("Controller=>createDeviceToken=>Output: %o", res);
    return res;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN,Role.CONTROLLER,Role.CUSTOMER,Role.DRIVER,Role.FINANCE,Role.OPERATOR)
  @Post("/sendNotification")
  async sendNotification(@CurrentUser() user:GetUserDTO, @Body() data: NotificationDTO) {
    this.logger.info("Controller=>sendNotification=>Input: %o", data,user);
    const res = await this.notificationService .sendNotification(data,user.id);
    this.logger.info("Controller=>sendNotification=>Output: %o", res);
    return res;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN,Role.CONTROLLER,Role.CUSTOMER,Role.DRIVER,Role.FINANCE,Role.OPERATOR)
  @Get("/getAllNotifications")
  async getAllNotifications(@Query() query: GetAllDTO) {
    const { limit, page, filter, search, sort } = query;
    this.logger.info("Controller=>getAllNotifications=>Input: %o", {
      limit,
      page,
      filter,
      search,
      sort,
    });
    const res = await this.notificationService.getAllNotifications({
      limit,
      page,
      filter,
      search,
      sort,
    });
    this.logger.info("Controller=>getAllNotifications=>Output: %o", res);
    return res;
  }
  
}
