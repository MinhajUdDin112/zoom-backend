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
  Req,
  NotFoundException,
} from "@nestjs/common";
import { RidesService } from "./rides.service";
import {
  CancelNoFareRideStatusDTO,
  CompleteJobDTO,
  CreateRideDTO,
  DispatchRideByVehicleIdDTO,
  DisptachRequestedRideByVehicleIdDTO,
  DisptachRideByVehicleIdDTO,
  RecoverJobDTO,
  UpdateRideDTO,
  UpdateRideMessageDto,
  UpdateRideStatusDTO,
  UpdateRideVehicleStatusDTO,
} from "./dto/rides.dto";
import { PinoLogger } from "nestjs-pino";
// import { string } from "yargs";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { FindAllQueryDto } from "src/utils/dto/filterBy.dto";
import { Role } from "src/users/enums/users.enum";
import { Rides } from "./rides.entity";
import { CurrentUser } from "src/auth/current-user/current-user.guard";
import { RideMessages } from "./ride-messages.entity";

@Controller("ride")
@UseGuards(AuthGuard)
export class RidesController {
  constructor(
    private readonly logger: PinoLogger,
    private ridesService: RidesService
  ) {}

  @ApiBearerAuth()
  @Post("/create")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async createRide(
    @Body(ValidationPipe) ride: CreateRideDTO,
    @Req() req,
    @Res() res
  ) {
    this.logger.info("Controller=>createRide=>Input: %o", ride);
    this.logger.info("Controller=>createRide=>req: %o", req?.user);
    try {
      ride.customerId = req?.user?.id;
      if (req?.user?.role == Role.CUSTOMER) {
        ride.account == "PAPP";
      }
      let result = await this.ridesService.createRide(ride, req?.user?.id);
      this.logger.info("Controller=>createRide=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error(
        "Controller=>createRide=>Error: %o",
        err?.message || err
      );
      console.error("error--------", err);
      res.status(HttpStatus.BAD_REQUEST).json(err?.message || err);
    }
  }

  @Patch("recoverJob")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  async recoverJob(
    @Body() recoverJobDto: RecoverJobDTO,
    @CurrentUser() user
  ): Promise<Rides> {
    const userId = user?.id;
    const { vehicleCallSign } = recoverJobDto;
    return this.ridesService.recoverJob(vehicleCallSign, userId);
  }

  @Patch("completeJob")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  async completeJob(
    @Body() completeJobDto: CompleteJobDTO,
    @CurrentUser() user
  ): Promise<Rides> {
    const userId = user?.id;
    const { vehicleCallSign } = completeJobDto;
    return this.ridesService.completeJob(vehicleCallSign, userId);
  }
  @Patch("updateRideStatus")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  async updateRideVehicleStatus(
    @Body() updateRideStatusDto: UpdateRideVehicleStatusDTO
  ): Promise<string> {
    const { callSign, status } = updateRideStatusDto;
    return this.ridesService.updateRideVehicleStatus(callSign, status);
  }

  @Get("getRideByCallSign/:callSign")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  async getRideByCallSign(
    @Param("callSign") callSign: string
  ): Promise<{ rideId: string }> {
    return this.ridesService.getRideByCallSign(callSign);
  }

  @ApiBearerAuth()
  @Get("/history/:rideId")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async findHistory(@Param("rideId") rideId: string, @Res() res) {
    this.logger.info("Controller=>findHistory=>Input: %o", rideId);
    try {
      let result = await this.ridesService.findRideHistory({ rideId });
      this.logger.info("Controller=>findHistory=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>findHistory=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Get("/vehicleQuery/:rideId") // Define rideId as a route parameter
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async findVehicleQueryDetails(@Param("rideId") rideId: string, @Res() res) {
    this.logger.info("Controller=>findVehicleQueryDetails=>Input: %o", rideId);
    try {
      let result = await this.ridesService.findVehicleQueryDetails(rideId); // Pass rideId directly as string
      this.logger.info(
        "Controller=>findVehicleQueryDetails=>Output: %o",
        result
      );
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>findVehicleQueryDetails=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Get("/findOnevehicleQuery/:callSign")
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async findOneVehicleQueryDetails(
    @Param("callSign") callSign: string,
    @Res() res
  ) {
    this.logger.info(
      "Controller=>findOneVehicleQueryDetails=>Input: %o",
      callSign
    );
    try {
      let result = await this.ridesService.findOneVehicleQueryDetails(callSign); // Pass rideId directly as string
      this.logger.info(
        "Controller=>findVehicleQueryDetails=>Output: %o",
        result
      );
      res.status(200).json(result);
    } catch (err) {
      this.logger.error(
        "Controller=>findOneVehicleQueryDetails=>Error: %o",
        err
      );
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
  async findRides(@Query() query: FindAllQueryDto, @Res() res) {
    try {
      this.logger.info("Controller=>list=>Input: %o, %o, %o, %o, %o", query);
      const result = await this.ridesService.findRides({
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
  @Get("allMessages")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async findAllRideMessages() {
    try {
      const rideMessages = await this.ridesService.findAllRideMessages();
      return { data: rideMessages };
    } catch (error) {
      console.error("Error fetching all ride messages:", error);
      throw new Error("Error fetching ride messages");
    }
  }
  @ApiBearerAuth()
  @Get(":id")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR,
    Role.DRIVER
  )
  async findRideById(@Param("id") id: string, @Res() res) {
    this.logger.info("Controller=>findRideById=>Input: %o", id);
    try {
      const ride = await this.ridesService.findRideById(id);
      this.logger.info("Controller=>findRideById=>Output: %o", id);
      res.status(HttpStatus.OK).json(ride);
    } catch (err) {
      this.logger.error("Controller=>findRideById=>Error: %o", id);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @Patch(":id/is-read")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  async updateIsRead(
    @Param("id") id: string,
    @Body() updateDto: UpdateRideMessageDto
  ): Promise<RideMessages> {
    try {
      const { isRead } = updateDto;
      const updatedRideMessage = await this.ridesService.updateIsRead({
        id,
        isRead,
      });
      return updatedRideMessage;
    } catch (error) {
      console.error("Error in updateIsRead controller:", error);
      throw new NotFoundException("Failed to update isRead status");
    }
  }

  @ApiBearerAuth()
  @Patch("update/:id")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async updateRide(
    @Body(ValidationPipe) ride: UpdateRideDTO,
    @Param("id") rideId: string,
    @Res() res
  ) {
    this.logger.info("Controller=>updateRide=>Input: %o", ride);
    try {
      let result = await this.ridesService.updateRide(ride, rideId);
      this.logger.info("Controller=>updateRide=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>updateRide=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Patch("updateStatus/:id")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR,
    Role.DRIVER
  )
  async updateRideStatus(
    @Body(ValidationPipe) ride: UpdateRideStatusDTO,
    @Param("id") rideId: string,
    @Req() req,
    @Res() res
  ) {
    this.logger.info("Controller=>updateRideStatus=>Input: %o", ride);
    try {
      let result = await this.ridesService.updateRideStatus(
        ride,
        rideId,
        req?.user?.id
      );
      this.logger.info("Controller=>updateRideStatus=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>updateRideStatus=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Post("cancelNoFare")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR,
    Role.DRIVER
  )
  async cancelNoFare(
    @Body(ValidationPipe) data: CancelNoFareRideStatusDTO,
    @Req() req,
    @Res() res
  ) {
    this.logger.info("Controller=>cancelNoFare=>Input: %o", data);
    try {
      let result = await this.ridesService.cancelNoFare(
        data.rideId,
        data.status,
        req?.user?.id
      );
      this.logger.info("Controller=>cancelNoFare=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>updateRideStatus=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Post("addRideMessages")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async addRideMessage(@Body() createRideMessageDto: any) {
    const { rideId, driverId, message } = createRideMessageDto;

    try {
      const newMessage = await this.ridesService.addRideMessage(
        rideId,
        driverId,
        message
      );
      return { data: newMessage };
    } catch (error) {
      console.error("Error adding ride message:", error);
      throw new Error("Error adding ride message");
    }
  }

  @Patch("cancelNoFareByVehicleCallSign")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async handleCancelNoFare(
    @Body(ValidationPipe) data: DispatchRideByVehicleIdDTO,
    @CurrentUser() user, // Use custom decorator to get current user
    @Res() res
  ) {
    try {
      const userId = user?.id; // Extract user ID from custom decorator
      const result = await this.ridesService.handleCancelNoFare(
        data.vehicleCallSign,
        data.status,
        userId // Pass user ID to service method if needed
      );
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Get("getArchiveBooking/:id")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async getArchiveBooking(@Param("id") id: string) {
    this.logger.info("Controller=>getArchiveBooking=>Input: %o", id);
    const arichiveBooking = await this.ridesService.getArchiveBooking(id);
    return arichiveBooking;
  }

  @ApiBearerAuth()
  @Get("location-history/:id")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR, Role.DRIVER)
  async findLocationHistoryOfRide(@Param("id") id: string, @Query() query) {
    const locationHistory = await this.ridesService.findLocationHistoryOfRide(
      id,
      query
    );
    return locationHistory;
  }

  @ApiBearerAuth()
  @Patch("requestRideByVehicle")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  async dispatchRequestedRideByVehicle(
    @Body(ValidationPipe) data: DisptachRequestedRideByVehicleIdDTO,
    @Res() res
  ) {
    try {
      const result = await this.ridesService.dispatchRequestedRideByVehicle(
        data.callSign,
        data.rideId
        // data.status
      );
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Patch("dispatchRideByVehicle")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async dispatchRideByVehicle(
    @Body(ValidationPipe) data: DisptachRideByVehicleIdDTO,
    @Req() req,
    @Res() res
  ) {
    this.logger.info("Controller=>dispatchRideByVehicle=>Input: %o", data);
    try {
      let result = await this.ridesService.dispatchRideByVehicle(
        // data.vehicleId,
        data.rideId,
        req?.user?.id
      );
      this.logger.info("Controller=>dispatchRideByVehicle=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>dispatchRideByVehicle=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Patch("fobRequest")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER, Role.FINANCE, Role.OPERATOR)
  async fobRequestedRideByVehicle(
    @Body(ValidationPipe) data: DisptachRequestedRideByVehicleIdDTO,
    @CurrentUser() user,
    @Res() res
  ) {
    try {
      const userId = user?.id;
      const result = await this.ridesService.fobRequestedRideByVehicle(
        data.callSign,
        data.rideId,
        userId
      );
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Patch("fobDisptachedRideByVehicle")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async fobDisptachedRideByVehicle(
    @Body(ValidationPipe) data: DisptachRideByVehicleIdDTO,
    @Req() req,
    @Res() res
  ) {
    this.logger.info("Controller=>fobDisptachedRideByVehicle=>Input: %o", data);
    try {
      let result = await this.ridesService.fobDisptachedRideByVehicle(
        data.rideId,
        req?.user?.id
      );
      this.logger.info(
        "Controller=>fobDisptachedRideByVehicle=>Output: %o",
        result
      );
      res.status(200).json(result);
    } catch (err) {
      this.logger.error(
        "Controller=>fobDisptachedRideByVehicle=>Error: %o",
        err
      );
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @ApiBearerAuth()
  @Delete("/delete/:id")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR
  )
  async deleteRide(@Param("id") rideId: string, @Res() res) {
    this.logger.info("Controller=>deleteRide=>Input: %o", rideId);
    try {
      const result = await this.ridesService.deleteRide(rideId);
      this.logger.info("Controller=>deleteRide=>Output: %o", result);
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error("Controller=>deleteRide=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
  @Get("changeHistory/:id")
  @UseGuards(AuthGuard)
  @Roles(
    Role.CUSTOMER,
    Role.ADMIN,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR,
    Role.DRIVER
  )
  async getRideHistory(@Param("id") id: string, @Res() res) {
    try {
      const rideHistory = await this.ridesService.findRideHistoryByRideId(id);
      res.status(HttpStatus.OK).json(rideHistory);
    } catch (err) {
      this.logger.error(err);
      res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
    }
  }
}
