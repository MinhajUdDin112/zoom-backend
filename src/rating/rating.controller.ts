import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Role } from "src/AreaGroup/enums/areaGroup.enum";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { RatingDTO, UpdateRatingDTO } from "./dto/ratings.dto";
import { PinoLogger } from "nestjs-pino";
import { RatingService } from "./rating.service";
import { CurrentUser } from "src/auth/current-user/current-user.guard";
import { GetUserDTO } from "src/users/dto/user.dto";

@Controller("rating")
@ApiBearerAuth()
export class RatingController {
  constructor(
    private readonly logger: PinoLogger,
    private readonly ratingService: RatingService
  ) {}
  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  @Post("/create")
  async createRating(
    @Body(ValidationPipe) data: RatingDTO,
    @CurrentUser() user: GetUserDTO
  ) {
    this.logger.info("Controller=>createRating=>Input: %o", data);
    const rating = await this.ratingService.createRating(data, user);
    return rating;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  @Patch("/update")
  async updateRating(@Body(ValidationPipe) data: UpdateRatingDTO) {
    this.logger.info("Controller=>updateRating=>Input: %o", data);
    const rating = await this.ratingService.updateRating(data);
    return rating;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Get("/get-all")
  async getAll() {
    const rating = await this.ratingService.getAllRatings();
    return rating;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Get("/:id")
  async getRatingById(@Param("id") id: string) {
    const rating = await this.ratingService.getRatingById(id);
    return rating;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  @Delete("/:id")
  async deleteById(@Param("id") id: string) {
    const rating = await this.ratingService.deleteById(id);
    return rating;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  @Post("/skip/:rideId")
  async skipRating(@Param("rideId") rideId: string) {
    this.logger.info("Controller=>skipRating=>Input: %o", rideId);
    const rating = await this.ratingService.skipRating({ rideId });
    this.logger.info("Controller=>skipRating=>output: %o", rating);
    return rating;
  }
}
