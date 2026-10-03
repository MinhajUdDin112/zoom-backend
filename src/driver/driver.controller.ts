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
  Req,
  HttpException,
} from "@nestjs/common";
import { DriversService } from "./driver.service";
import * as jwt from "jsonwebtoken";
import {
  CreateDriverDTO,
  DriverInfoDto,
  DriverOnline,
  DriverUserDTO,
  ForceDriverOnlineDTO,
  LocationDTO,
  UpdateDriverDTO,
  UpdateDriverStatusDTO,
} from "./dto/driver.dto";
import { PinoLogger } from "nestjs-pino";
// import { string } from "yargs";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { FindAllQueryDto } from "src/utils/dto/filterBy.dto";
import { Role } from "src/users/enums/users.enum";
import { CurrentUser } from "src/auth/current-user/current-user.guard";
import { Request } from "express";
import { Drivers } from "./driver.entity";
import { UsersService } from "src/users/users.service";
import { UtilsService } from "src/utils/utils.service";

@Controller("driver")
export class DriversController {
  constructor(
    private readonly logger: PinoLogger,
    private driversService: DriversService,
    private readonly usersService: UsersService,
    private readonly utilsService: UtilsService
  ) {}

  @ApiBearerAuth()
  @Post("/create")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async createDriver(
    @Body(ValidationPipe) driver: CreateDriverDTO,
    @Res() res
  ) {
    this.logger.info("Controller=>createDriver=>Input: %o", driver);
    try {
      let result = await this.driversService.createDriver(driver);
      this.logger.info("Controller=>createDriver=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>createDriver=>Error: %o", err);
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
  async findDrivers(@Query() query: FindAllQueryDto, @Res() res) {
    try {
      this.logger.info("Controller=>list=>Input: %o, %o, %o, %o, %o", query);
      const result = await this.driversService.findDrivers({
        page: query.page || 1,
        limit: query.limit || undefined,
        search: query.search,
        sort: query.sort,
        filter: query.filter,
      });
      this.logger.info("Controller=>list=>Output: %o", result[1]);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>list=>error: %o", err.message);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Get("available")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.OPERATOR, Role.FINANCE)
  async getDriversWithoutSpecificRideStatuses(@Res() res) {
    this.logger.info(
      "Controller=>getDriversWithoutSpecificRideStatuses=>Input: %o"
    );
    try {
      const drivers =
        await this.driversService.getDriversWithoutSpecificRideStatuses();
      this.logger.info(
        "Controller=>getDriversWithoutSpecificRideStatuses=>Output: %o",
        drivers
      );
      res.status(HttpStatus.OK).json(drivers);
    } catch (err) {
      this.logger.error(
        "Controller=>getDriversWithoutSpecificRideStatuses=>Error: %o",
        err
      );
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Get("workingHours")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.OPERATOR, Role.FINANCE)
  async getDriversWorkingHours(
    @Query("driverId") driverId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Res() res
  ) {
    this.logger.info("Controller=>getDriversWorkingHours=>Input: %o", {
      driverId,
      startDate,
      endDate,
    });

    try {
      // Fetch working hours
      const driverWorkingHours =
        await this.driversService.getDriverWorkingHours(
          driverId,
          startDate,
          endDate
        );

      this.logger.info(
        "Controller=>getDriversWorkingHours=>Output: %o",
        driverWorkingHours
      );
      res.status(HttpStatus.OK).json(driverWorkingHours);
    } catch (err) {
      this.logger.error("Controller=>getDriversWorkingHours=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Get("nearestByLocation")
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  async getNearestDriver(
    @Query("latitude") latitude: number,
    @Query("longitude") longitude: number,
    @Res() res
  ) {
    this.logger.info(
      "Controller=>getNearestDriver=>Input: %o, %o",
      latitude,
      longitude
    );
    try {
      const driver = await this.driversService.getNearestDriverByLocation({
        latitude,
        longitude,
      });
      this.logger.info("Controller=>getNearestDriver=>Output: %o", driver);
      res.status(HttpStatus.OK).json(driver);
    } catch (err) {
      this.logger.error("Controller=>getNearestDriver=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Patch("update/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async updateDriver(
    @Body(ValidationPipe) driver: UpdateDriverDTO,
    @Param("id") driverId: string,
    @Res() res
  ) {
    this.logger.info("Controller=>updateDriver=>Input: %o", driver);
    try {
      let result = await this.driversService.updateDriver(driver, driverId);
      this.logger.info("Controller=>updateDriver=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>updateDriver=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Patch("updateStatus/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async updateDriverStatus(
    @Body(ValidationPipe) driver: UpdateDriverStatusDTO,
    @Param("id") driverId: string,
    @Res() res
  ) {
    this.logger.info("Controller=>updateDriverStatus=>Input: %o", driver);
    try {
      let result = await this.driversService.updateDriverStatus(
        driver,
        driverId
      );
      this.logger.info("Controller=>updateDriverStatus=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>updateDriverStatus=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Delete("/delete/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async deleteDriver(@Param("id") driverId: string, @Res() res) {
    this.logger.info("Controller=>deleteDriver=>Input: %o", driverId);
    try {
      const result = await this.driversService.deleteDriver(driverId);
      this.logger.info("Controller=>deleteDriver=>Output: %o", result);
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error("Controller=>deleteDriver=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles(Role.DRIVER)
  @Patch("/update-online")
  async driverOnlineUpdate(@Body() driver: DriverOnline, @Req() req: Request) {
    this.logger.info("Controller=>driverOnlineUpdate=>Input: %o", driver);

    const headers = req.headers as { authorization?: string };
    const authorizationHeader = headers.authorization;
    const result = await this.driversService.driverOnlineUpdate(
      authorizationHeader,
      driver.online
    );
    const response = { message: result };
    return response;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  @Patch("/driverOnlineUpdateByCallSign")
  async driverOnlineUpdateByCallSign(@Body() driverData: ForceDriverOnlineDTO) {
    this.logger.info(
      "Controller=>driverOnlineUpdateByCallSign=>Input: %o",
      driverData
    );
    const result = await this.driversService.driverOnlineUpdateByCallSign(
      driverData?.callSign,
      driverData?.online
    );
    const response = { message: result };
    return response;
  }

  @ApiBearerAuth()
  @Get("/rideCount")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  async getRideStatusCount(): Promise<any> {
    try {
      const rideStatusCounts = await this.driversService.countRidesByStatus();
      return {
        success: true,
        data: rideStatusCounts,
      };
    } catch (error) {
      this.logger.error("Error fetching ride status counts:", error);
      throw new HttpException(
        "Failed to fetch ride status counts",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  @Get("/nearest")
  async getNearestDrivers(@Query("rideId") rideId: string): Promise<Drivers[]> {
    return this.driversService.findNearestDrivers(rideId);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.DRIVER)
  @Post("/logout")
  async driverLogout(@Body() driver: DriverOnline, @Req() req: Request) {
    this.logger.info("Controller=>driverlogout=>Input: %o", driver);

    const headers = req.headers as { authorization?: string };
    const authorizationHeader = headers.authorization;
    const result = await this.usersService.driverLogout(
      authorizationHeader,
      driver
    );
    const response = { message: result };
    return response;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles(Role.DRIVER, Role.ADMIN)
  @Get("/driver-zones/")
  async viewDriverZones(
    @CurrentUser() user: DriverUserDTO,
    @Query() query: FindAllQueryDto
  ) {
    const result = await this.driversService.viewDriverZones(user, query);
    return result;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.DRIVER)
  @Post("/set-current-vehicle/:registration")
  async setCurrentVehicle(
    @Req() req: Request,
    @Param("registration") registration: string
  ) {
    this.logger.info("Controller=>driverLogin=>Input: %o", registration);

    const headers = req.headers as { authorization?: string };
    const authorizationHeader = headers.authorization;
    const result = await this.driversService.setCurrentVehicle(
      authorizationHeader,
      registration
    );
    const response = { message: result };
    return response;
  }

  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  @Get("/activeVehicle")
  async getActiveDriversWithVehiclesAndRides(@Res() res) {
    try {
      const result =
        await this.driversService.getActiveDriversWithVehicleAndRideStatus();
      res.status(200).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @UseGuards(AuthGuard)
  @Roles(Role.DRIVER)
  @Patch("/set-location")
  async setLocation(
    @CurrentUser() user: DriverUserDTO,
    @Body() locationData: LocationDTO
  ) {
    this.logger.info("Controller=>setLocation=>Input: %o", locationData);
    const result = await this.driversService.setLocation(user.id, locationData);
    return result;
  }
  @UseGuards(AuthGuard)
  @Roles(Role.DRIVER)
  @Get("/initialAPI")
  async initialAPI(@CurrentUser() user: DriverUserDTO) {
    this.logger.info("Controller=>initialAPI=>Input: %o", user);
    const result = await this.driversService.initialAPI(user);
    return result;
  }

  @ApiBearerAuth()
  @Get(":id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async findDriverById(@Param("id") id: string, @Res() res) {
    this.logger.info("Controller=>findDriverById=>Input: %o", id);
    try {
      const driver = await this.driversService.findDriverById(id);
      this.logger.info("Controller=>findDriverById=>Output: %o", id);
      res.status(HttpStatus.OK).json(driver);
    } catch (err) {
      this.logger.error("Controller=>findDriverById=>Error: %o", id);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
}
