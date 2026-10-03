import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";

import { PinoLogger } from "nestjs-pino";

import { CapabilityChargesService } from "./capabilityCharges.service";
import {
  CreateCapabilityDTO,
  FindAllCapabilityTemplatesQueryDto,
} from "./dto/capabilityCharges.dto";
import { Response } from "express";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "src/Roles.decorator";
import { Role } from "src/users/enums/users.enum";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";

@Controller("capabilityCharges")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles(Role.ADMIN)
export class CapabilityChargesController {
  constructor(
    private readonly capabilitiesChargesService: CapabilityChargesService,
    private readonly logger: PinoLogger
  ) {}

  @Post("/create")
  async createCapabilityCharges(
    @Body(ValidationPipe) data: CreateCapabilityDTO
  ) {
    this.logger.info("Controller=>createCapabilityCharges=>Input: %o", data);
    const res = await this.capabilitiesChargesService.createCapability(data);
    this.logger.info("Controller=>createCapabilityCharges=>Output: %o", res);
    return res;
  }

  @Get()
  async listCapabilityTemplates(
    @Query() query: FindAllCapabilityTemplatesQueryDto,
    @Res() res: Response
  ) {
    try {
      this.logger.info("Controller=>listCapabilityTemplates=>Input: %o", {
        query,
      });
      const result =
        await this.capabilitiesChargesService.listCapabilityChargesTemplates({
          page: query.page || 1,
          limit: query.limit || undefined,
          search: query.search,
          sort: query.sort,
        });
      this.logger.info("Controller=>listCapabilityTemplates=>Output: %o", res);
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @Get("/:id")
  async findCapabilityTemplateById(
    @Param("id") id: string,
    @Query("relations", new DefaultValuePipe(true)) relations: boolean
  ) {
    this.logger.info("Controller=>findCapabilityChargesById=>Input: %s", id);
    const res =
      await this.capabilitiesChargesService.findCapabilityTemplateById(id);
    this.logger.info("Controller=>findCapabilityChargesById=>Output: %o", res);
    return res;
  }

  @Patch("/:id")
  async updateCapabilityTemplate(
    @Param("id") id: string,
    @Body() data: Partial<CreateCapabilityDTO>
  ) {
    try {
      this.logger.info("Controller=>updateCapabilityTemplate=>Input: %s", id);
      const updatedCapabilityTemplate =
        await this.capabilitiesChargesService.updateCapabilityTemplate(
          id,
          data
        );
      this.logger.info(
        "Controller=>updateCapabilityTemplate=>Output: %o",
        updatedCapabilityTemplate
      );
      return updatedCapabilityTemplate;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/:id")
  async deleteCapabilityCharges(@Param("id") id: string, @Res() res: Response) {
    try {
      this.logger.info("Controller=>deleteCapabilityCharges=>Input: %o", id);
      const deletedCapability =
        await this.capabilitiesChargesService.deleteCapabilityCharges(id);
      res.status(HttpStatus.OK).json(deletedCapability);
      this.logger.info(
        "Controller=>deleteCapabilityCharges=>Output: %o",
        deletedCapability
      );
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
}
