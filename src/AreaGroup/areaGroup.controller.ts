import {
  Controller,
  Res,
  Get,
  HttpStatus,
  Body,
  ValidationPipe,
  Patch,
  Param,
  Delete,
  Post,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import {
  CreateAreaGroupDTO,
  FindAllAreaGroupQueryDto,
  UpdateAreaGroupDTO,
} from "./dto/areaGroup.dto";
import { PinoLogger } from "nestjs-pino";
import { AreaGroupsService } from "./areaGroup.service";
import { Role } from "./enums/areaGroup.enum";
import { Roles } from "src/Roles.decorator";
import { ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";

@Controller("area-groups")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles(Role.ADMIN)
export class AreaGroupController {
  constructor(
    private readonly logger: PinoLogger,
    private areaGroupsService: AreaGroupsService
  ) {}

  @Post("/create")
  async createAreaGroup(@Body(ValidationPipe) areaGroup: CreateAreaGroupDTO) {
    this.logger.info("Controller=>createAreaGroup=>Input: %o", areaGroup);
    const result = await this.areaGroupsService.createAreaGroup(areaGroup);
    this.logger.info("Controller=>createAreaGroup=>Output: %o", result);
    return result;
  }

  @Get("/list")
  async listCapabilityTemplates(
    @Query() query: FindAllAreaGroupQueryDto,
    @Res() res: Response
  ) {
    try {
      this.logger.info("Controller=>listCapabilityTemplates=>Input: %o", {
        query,
      });
      const result = await this.areaGroupsService.findAreaGroups({
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

  @Get(":id")
  async findAreaGroupById(@Param("id") id: string) {
    this.logger.info("Controller=>findAreaGroupById=>Input: %o", id);
    const areaGroup = await this.areaGroupsService.findAreaGroupById(id);
    if (!areaGroup) {
      this.logger.warn("Controller=>findAreaGroupById=>NotFound: %o", id);
      throw new NotFoundException(`AreaGroup with id ${id} not found`);
    }
    this.logger.info("Controller=>findAreaGroupById=>Output: %o", areaGroup);
    return areaGroup;
  }

  @Patch("update/:id")
  async updateAreaGroup(
    @Body(ValidationPipe) areaGroup: UpdateAreaGroupDTO,
    @Param("id") areaGroupId: string
  ) {
    this.logger.info("Controller=>updateAreaGroup=>Input: %o", {
      areaGroup,
      areaGroupId,
    });
    const result = await this.areaGroupsService.updateAreaGroup(
      areaGroup,
      areaGroupId
    );
    this.logger.info("Controller=>updateAreaGroup=>Output: %o", result);
    return result;
  }

  @Delete("/delete/:id")
  async deleteAreaGroup(@Param("id") areaGroupId: string, @Res() res) {
    this.logger.info("Controller=>deleteAreaGroup=>Input: %o", areaGroupId);
    const result = await this.areaGroupsService.deleteAreaGroup(areaGroupId);
    if (!result) {
      this.logger.warn(
        "Controller=>deleteAreaGroup=>NotFound: %o",
        areaGroupId
      );
      throw new NotFoundException(`AreaGroup with id ${areaGroupId} not found`);
    }
    this.logger.info("Controller=>deleteAreaGroup=>Output: %o", result);
    return res.status(HttpStatus.OK).json(result);
  }
}
