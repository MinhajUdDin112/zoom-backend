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
  UseGuards,
} from "@nestjs/common";
import { VehicleService } from "./vehicle.service";
import {
  CreateVehicleDTO,
  FindAllQueryDto,
  GetRidesByCallSignDto,
  UpdateVehicleDTO,
} from "./dto/vehicle.dto";
import { PinoLogger } from "nestjs-pino";
import { ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Role, VehicleStatus } from "./enums/document.enum";
import { Roles } from "src/Roles.decorator";

@Controller("vehicle")
export class VehicleController {
  constructor(
    private readonly logger: PinoLogger,
    private vehicleService: VehicleService
  ) {}

  @ApiBearerAuth()
  @Post("/create")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async createVehicle(
    @Body(ValidationPipe) vehicle: CreateVehicleDTO,
    @Res() res
  ) {
    try {
      const result = await this.vehicleService.createVehicle(vehicle);
      res.status(HttpStatus.CREATED).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Get("/list")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR,
    Role.DRIVER
  )
  async listVehicles(@Query() query: FindAllQueryDto, @Res() res) {
    {
      try {
        const result = await this.vehicleService.listVehicles({
          page: query.page || 1,
          limit: query.limit || undefined,
          search: query.search,
          sort: query.sort,
        });
        res.status(HttpStatus.OK).json(result);
      } catch (err) {
        this.logger.error(err);
        res.status(HttpStatus.BAD_REQUEST).json(err.message);
      }
    }
  }
  @ApiBearerAuth()
  @Get(":id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async findVehicleById(@Param("id") id: string, @Res() res) {
    try {
      const vehicle = await this.vehicleService.findVehicleById(id);
      res.status(HttpStatus.OK).json(vehicle);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
  @ApiBearerAuth()
  @Get("/byDriver/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.DRIVER)
  async findVehicleByDriverId(
    @Param("id") id: string,
    checkExpiry: boolean,
    @Query() query
  ) {
    const vehicle = await this.vehicleService.findVehicleByDriverId(
      id,
      query?.role,
      query?.checkExpiry
    );
    return vehicle;
  }
  @ApiBearerAuth()
  @Patch("update/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async updateVehicle(
    @Param("id") vehicleId: string,
    @Body(ValidationPipe) vehicle: UpdateVehicleDTO,
    @Res() res
  ) {
    try {
      const result = await this.vehicleService.updateVehicle(
        vehicleId,
        vehicle
      );
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
  @ApiBearerAuth()
  @Delete("/delete/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async deleteVehicle(@Param("id") vehicleId: string, @Res() res) {
    try {
      const result = await this.vehicleService.deleteVehicle(vehicleId);
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
  @ApiBearerAuth()
  @Patch("/suspend/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async suspendVehicle(
    @Param("id") vehicleId: string,
    @Body(ValidationPipe) data: { status: VehicleStatus },
    @Res() res
  ) {
    try {
      const result = await this.vehicleService.suspendVehicle(
        vehicleId,
        data?.status
      );
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
}
