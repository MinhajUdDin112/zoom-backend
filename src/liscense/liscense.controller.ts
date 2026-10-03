import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "src/Roles.decorator";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Role } from "src/users/enums/users.enum";
import { GetAllDTO, LiscenseDTO, UpdateLiscenseDTO } from "./dto/liscense.dto";
import { PinoLogger } from "nestjs-pino";
import { LiscenseService } from "./liscense.service";
import { CurrentUser } from "src/auth/current-user/current-user.guard";
import { CreateUserDTO, GetUserDTO } from "src/users/dto/user.dto";

@Controller("liscense")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles(Role.ADMIN, Role.CONTROLLER)
export class LiscenseController {
  constructor(
    private readonly liscenseService: LiscenseService,
    private readonly logger: PinoLogger
  ) {}
  @Post("create")
  async createLiscense(
    @Body(ValidationPipe) liscense: LiscenseDTO,
    @CurrentUser() user: GetUserDTO
  ) {
    this.logger.info("Controller=>createLiscense=>Input: %o", user);
    const response = this.liscenseService.createLiscense(liscense, user);
    this.logger.info("Controller=>createLiscense=>output: %o", response);
    return response;
  }
  @Get("findAll")
  async findAll(@Query() query: GetAllDTO) {
    const { limit, page, filter, search } = query;
    this.logger.info("Controller=>findAll=>Input: %o", {
      limit,
      page,
      filter,
      search,
    });
    const res = await this.liscenseService.findAll({
      limit,
      page,
      filter,
      search,
    });
    this.logger.info("Controller=>findAll=>Output: %o", res);
    return res;
  }
  @Get("findOne/:id")
  async findById(@Param("id") id: string) {
    this.logger.info("Controller=>findById=>Input: %o", id);
    const res = await this.liscenseService.findById(id);
    this.logger.info("Controller=>findById=>Output: %o", res);
    return res;
  }
  @Delete("/delete/:id")
  async deleteLiscense(@Param("id") id: string) {
    this.logger.info("Controller=>deleteLiscense=>Input: %o", id);
    const result = await this.liscenseService.deleteLiscense(id);
    this.logger.info("Controller=>deleteLiscense=>Output: %o", result);
    return result;
  }
  @Patch("/update/:id")
  async updateLiscense(
    @Body(ValidationPipe) vehicle: UpdateLiscenseDTO,
    @Param("id") id: string
  ) {
    this.logger.info("Controller=>updateLiscense=>Input: %o", id);
    const result = await this.liscenseService.updateLiscense(vehicle, id);
    this.logger.info("Controller=>updateLiscense=>Output: %o", result);
    return result;
  }
}
