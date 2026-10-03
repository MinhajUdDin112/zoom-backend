import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ValidationPipe,
  UseGuards,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { TarrifsService } from "./tarrifs.service";
import {
  CreateTariffDTO,
  RecommendedFareDTO,
  UpdateTariffDTO,
} from "./dto/tarrif.dto";
import { PinoLogger } from "nestjs-pino";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { Role } from "src/users/enums/users.enum";

@ApiBearerAuth()
@ApiTags("tarrif")
@UseGuards(AuthGuard)
@Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR, Role.CUSTOMER)
@Controller("api/tarrif")
export class TarrifsController {
  constructor(
    private readonly tarrifsService: TarrifsService,
    private readonly logger: PinoLogger
  ) {}

  @Post("create")
  async create(@Body() data: CreateTariffDTO) {
    this.logger.info("Controller=>createTarrif=>Input: %o", data);
    const res = this.tarrifsService.create(data);
    this.logger.info("Controller=>createTarrif=>Output: %o", res);
    return res;
  }

  @Get("findAll")
  async findAll(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
    @Query("page") page: number,
    @Query("filter") filter?: string,
    @Query("search") search?: string
  ) {
    this.logger.info("Controller=>Tarrif=>findAll=>Input: %o", { limit, page });
    const res = await this.tarrifsService.findAll({
      limit,
      page,
      filter,
      search,
    });
    this.logger.info("Controller=>Tarrif=>findAll=>Output: %o", res);
    return res;
  }

  @Get("find/:id")
  async findOne(@Param("id") id: string) {
    this.logger.info("Controller=>Tarrif=>findById=>Input: %o", id);
    const res = this.tarrifsService.findOne(id);
    this.logger.info("Controller=>Tarrif=>findById=>Output: %o", res);
    return res;
  }

  @Post("recommeded-fare/")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async getRecommendedFare(
    @Body(ValidationPipe) data: RecommendedFareDTO,
    @Res() res
  ) {
    this.logger.info("Controller=>getRecommendedFare=>Input: %o", data);
    try {
      const result = await this.tarrifsService.getRecommendedFare(data);
      this.logger.info("Controller=>getRecommendedFare=>Output: %o", result);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.logger.error(error);
      res.status(HttpStatus.BAD_REQUEST).json(error.message);
    }
  }

  @Patch("update/:id")
  async update(
    @Body(ValidationPipe) data: UpdateTariffDTO,
    @Param("id") id: string
  ) {
    this.logger.info("Controller=>updateTarrif=>Input: %o", data);
    const res = await this.tarrifsService.update(id, data);
    this.logger.info("Controller=>updateTarrif=>Output: %o", res);
    return res;
  }

  @Delete("/delete/:id")
  async deleteCapability(@Param("id") id: string) {
    this.logger.info("Controller=>deleteTarrif=>Input: %o", id);
    const result = await this.tarrifsService.remove(id);
    this.logger.info("Controller=>deleteTarrif=>Output: %o", result);
    return result;
  }

  @Get("findDistanceTime")
  async getDistanceAndTime(
    @Query("from") from: string,
    @Query("to") to: string
  ) {
    this.logger.info(
      "Controller=>Tarrif=>findDistanceTime=>Input: %o %o",
      from,
      to
    );
    const res = this.tarrifsService.getDistanceAndTime(from, to);
    this.logger.info("Controller=>Tarrif=>findDistanceTime=>Output: %o", res);
    return res;
  }

  @Get("findDistanceTimeBetweenPoints")
  async getDistanceAndTimeBetweenPoints(@Query("points") points: string[]) {
    this.logger.info(
      "Controller=>Tarrif=>findDistanceTimeBetweenPoints=>Input: %o",
      points
    );

    const res = await this.tarrifsService.getDistanceAndTimeBetweenPoints(
      points
    );

    this.logger.info(
      "Controller=>Tarrif=>findDistanceTimeBetweenPoints=>Output: %o",
      res
    );

    return res;
  }

  @Get("getDirections")
  async getDirections(@Query("from") from: string, @Query("to") to: string) {
    this.logger.info(
      "Controller=>Tarrif=>getDirections=>Input: %o %o",
      from,
      to
    );
    const res = this.tarrifsService.getDirections(from, to);
    this.logger.info("Controller=>Tarrif=>getDirections=>Output: %o", res);
    return res;
  }
}
