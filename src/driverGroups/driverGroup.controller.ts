import {
  Controller,
  Res,
  Get,
  HttpStatus,
  Body,
  ValidationPipe,
  Post,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { DriverGroupService } from "./driverGroup.service";
import {
  CreateDriverGroupDTO,
  FindAllQueryDto,
  UpdateDriverGroupDTO,
} from "./dto/driverGroup.dto";
import { PinoLogger } from "nestjs-pino";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Role } from "./enums/driverGroup.enum";

@Controller("driver-group")
export class DriverGroupController {
  constructor(
    private readonly logger: PinoLogger,
    private driverGroupService: DriverGroupService
  ) {}

  @ApiBearerAuth()
  @Post("/create")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async createDriverGroup(
    @Body(ValidationPipe) driverGroup: CreateDriverGroupDTO,
    @Res() res
  ) {
    this.logger.info("Controller=>createDriverGroup=>Input: %o", driverGroup);
    try {
      let result = await this.driverGroupService.createDriverGroup(driverGroup);
      this.logger.info("Controller=>createDriverGroup=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>createDriverGroup=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Get("/list")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async listDriverGroups(@Query() query: FindAllQueryDto, @Res() res) {
    {
      try {
        this.logger.info("Controller=>list=>Input: %o, %o, %o, %o, %o", query);
        const result = await this.driverGroupService.listDriverGroups({
          page: query.page || 1,
          limit: query.limit || undefined,
          search: query.search,
          sort: query.sort,
        });
        this.logger.info("Controller=>listDriverGroups=>Output: %o", result);
        res.status(200).json(result);
      } catch (err) {
        this.logger.error(
          "Controller=>listDriverGroups=>error: %o",
          err.message
        );
        res.status(HttpStatus.BAD_REQUEST).json(err.message);
      }
    }
  }

  @ApiBearerAuth()
  @Get(":id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async findDriverGroupById(@Param("id") id: string, @Res() res) {
    this.logger.info("Controller=>findDriverGroupById=>Input: %o", id);
    try {
      const driverGroup = await this.driverGroupService.findDriverGroupById(id);
      this.logger.info("Controller=>findDriverGroupById=>Output: %o", id);
      res.status(HttpStatus.OK).json(driverGroup);
    } catch (err) {
      this.logger.error("Controller=>findDriverGroupById=>Error: %o", id);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Patch("update/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async updateDriverGroup(
    @Body(ValidationPipe) updateDriverGroupDTO: UpdateDriverGroupDTO,
    @Param("id") driverGroupId: string,
    @Res() res
  ) {
    this.logger.info(
      "Controller=>updateDriverGroup=>Input: %o",
      updateDriverGroupDTO
    );
    try {
      let result = await this.driverGroupService.updateDriverGroup(
        driverGroupId,
        updateDriverGroupDTO
      );
      this.logger.info("Controller=>updateDriverGroup=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>updateDriverGroup=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Delete("/delete/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async deleteDriverGroup(@Param("id") driverGroupId: string, @Res() res) {
    this.logger.info("Controller=>deleteDriverGroup=>Input: %o", driverGroupId);
    try {
      const result = await this.driverGroupService.deleteDriverGroup(
        driverGroupId
      );
      this.logger.info("Controller=>deleteDriverGroup=>Output: %o", result);
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error("Controller=>deleteDriverGroup=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
}
