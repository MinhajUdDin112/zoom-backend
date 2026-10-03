import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ZoneService } from "./zone.service";
import { Zone } from "./zone.entity";
import { Point } from "geojson";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CreateZoneDto } from "./dtos/zone.dto";
import { PinoLogger } from "nestjs-pino";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Role } from "src/users/enums/users.enum";
import { Roles } from "src/Roles.decorator";

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles(
  Role.ADMIN,
  Role.CUSTOMER,
  Role.DRIVER,
  Role.CONTROLLER,
  Role.FINANCE,
  Role.OPERATOR
)
@ApiTags("zones")
@Controller("zones")
export class ZoneController {
  constructor(
    private readonly logger: PinoLogger,
    private readonly zoneService: ZoneService
  ) {}

  @Post("create")
  @ApiOperation({ summary: "Create a new zone" })
  @ApiResponse({
    status: 201,
    description: "The zone has been successfully created.",
  })
  @ApiResponse({ status: 400, description: "Invalid input." })
  async saveZone(@Body() createZoneDto: CreateZoneDto, @Res() res) {
    this.logger.info("Controller=>saveZone=>Input: %o", createZoneDto);
    try {
      let result: Zone = await this.zoneService.saveZone(createZoneDto);
      this.logger.info("Controller=>saveZone=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>createRide=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @Get("find")
  @ApiOperation({ summary: "Find a zone containing a point" })
  @ApiQuery({ name: "lat", description: "Latitude", type: "number" })
  @ApiQuery({ name: "lng", description: "Longitude", type: "number" })
  @ApiResponse({
    status: 200,
    description: "The name of the zone containing the point.",
    type: String,
  })
  @ApiResponse({
    status: 404,
    description: "No zone found containing the point.",
  })
  async findZoneContainingPoint(
    @Query("lat") lat: number,
    @Query("lng") lng: number,
    @Res() res
  ) {
    const point: Point = {
      type: "Point",
      coordinates: [lng, lat],
    };

    try {
      this.logger.info(
        "Controller=>findZoneContainingPoint=>Input: %o, %o, %o, %o, %o",
        point
      );

      const zone = await this.zoneService.findZoneContainingPoint(point);
      this.logger.info("Controller=>findZoneContainingPoint=>Output: %o", zone);
      // return zone ? zone.name : null;
      res.status(200).json(zone);
    } catch (err) {
      this.logger.error("Controller=>findZoneContainingPoint=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @Get("list")
  @ApiOperation({ summary: "Get all zones" })
  @ApiResponse({ status: 200, description: "List of all zones.", type: [Zone] })
  async findAll(@Res() res) {
    try {
      this.logger.info("Controller=>findAll=>Input: %o");
      const result = await this.zoneService.findAll();
      this.logger.info("Controller=>findAll=>Output: %o", result?.length);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>findAll=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
}
