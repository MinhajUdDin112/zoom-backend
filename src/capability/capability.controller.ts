import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { CapabilityService } from "./capability.service";
import {
  CreateCapabilityDTO,
  GetAllDTO,
  UpdateCapabilityDTO,
} from "./dto/createCapabaility.dto";
import { PinoLogger } from "nestjs-pino";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { Role } from "src/users/enums/users.enum";
import { ApiBearerAuth } from "@nestjs/swagger";

@Controller("capability")
@ApiBearerAuth()
export class CapabilityController {
  constructor(
    private readonly capabilitiesService: CapabilityService,
    private readonly logger: PinoLogger
  ) {}
  @Post("/create")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async createCapabilities(@Body(ValidationPipe) data: CreateCapabilityDTO) {
    this.logger.info("Controller=>createCapabilities=>Input: %o", data);
    const res = await this.capabilitiesService.createCapabilities(data);
    this.logger.info("Controller=>createCapabilities=>Output: %o", data);
    return res;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR,
    Role.DRIVER
  )
  @Get("/findCapabilities")
  async findAll(@Query() query: GetAllDTO) {
    const { limit, page, filter, search, sort } = query;
    this.logger.info("Controller=>findAll=>Input: %o", {
      limit,
      page,
      filter,
      search,
      sort,
    });
    const res = await this.capabilitiesService.findAll({
      limit,
      page,
      filter,
      search,
      sort,
    });
    this.logger.info("Controller=>findAll=>Output: %o", res);
    return res;
  }
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  @Get("/:id")
  async findById(@Param("id") id: string) {
    this.logger.info("Controller=>findById=>Input: %o", id);
    const res = await this.capabilitiesService.findById(id);
    this.logger.info("Controller=>findById=>Output: %o", res);
    return res;
  }
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  @Patch("/update/:id")
  async updateCapability(
    @Body(ValidationPipe) data: UpdateCapabilityDTO,
    @Param("id") id: string
  ) {
    this.logger.info("Controller=>updateCapability=>Input: %o", data);
    const res = await this.capabilitiesService.updateCapability(data, id);
    this.logger.info("Controller=>updateCapability=>Output: %o", res);
    return res;
  }
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  @Delete("/delete/:id")
  async deleteCapability(@Param("id") id: string) {
    this.logger.info("Controller=>deleteUser=>Input: %o", id);
    const result = await this.capabilitiesService.deleteCapability(id);
    this.logger.info("Controller=>deleteUser=>Output: %o", result);
    return result;
  }
}
