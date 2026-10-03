import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RatingDTO, SkipRatingDTO, UpdateRatingDTO } from "./dto/ratings.dto";
import { UsersService } from "src/users/users.service";
import { DriversService } from "src/driver/driver.service";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { InjectRepository } from "@nestjs/typeorm";
import { Rating } from "./rating.entity";
import { Repository } from "typeorm";
import { GetUserDTO } from "src/users/dto/user.dto";
import { Rides } from "src/rides/rides.entity";

@Injectable()
export class RatingService {
  constructor(
    private readonly usersService: UsersService,
    private readonly driverService: DriversService,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(Rides)
    private readonly ridesRepository: Repository<Rides>
  ) {}
  async createRating(data: RatingDTO, user: GetUserDTO) {
    try {
      const driver = await this.driverService.findDriverById(data?.driverId);
      if (driver) {
        const customer = await this.usersService.findUserById(user?.id);
        if (customer) {
          const ride = await this.ridesRepository.findOne({
            where: {
              id: data?.rideId,
            },
          });
          if (ride) {
            const rating = new Rating();
            rating.comment = data?.comment;
            rating.driver = driver;
            rating.user = customer;
            rating.rideId = ride.id;
            rating.star = data.star;
            const savedRating = await this.ratingRepository.save(rating);

            ride.ratingId = savedRating.id;

            await this.ridesRepository.save(ride);

            return savedRating;
          }
        } else {
          throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
        }
      } else {
        throw new NotFoundException(ERROR_MESSAGE.DRIVER_NOT_FOUND);
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async updateRating(data: UpdateRatingDTO) {
    const rating = await this.ratingRepository.findOne({
      where: { id: data.id },
    });
    if (rating) {
      const updatedRating = await this.ratingRepository.update(data.id, data);
      if (updatedRating.affected > 0) {
        const updatedRow = await this.ratingRepository.findOne({
          where: { id: data.id },
        });
        return updatedRow;
      } else {
        throw new BadRequestException();
      }
    } else {
      throw new NotFoundException(ERROR_MESSAGE.RATING_NOT_FOUND);
    }
  }

  async skipRating(data: SkipRatingDTO) {
    const ride = await this.ridesRepository.findOne({
      where: { id: data.rideId },
    });
    if (ride) {
      const updatedRide = await this.ridesRepository.update(data.rideId, {
        isSkipRating: true,
      });
      if (updatedRide) {
        return { message: "Rating Skipped" };
      } else {
        throw new BadRequestException();
      }
    } else {
      throw new NotFoundException(ERROR_MESSAGE.RIDE_NOT_FOUND);
    }
  }

  async getAllRatings() {
    const ratings = await this.ratingRepository.findAndCount();
    return ratings;
  }

  async getRatingById(id: string) {
    try {
      const rating = await this.ratingRepository.findOne({
        where: {
          id,
        },
      });
      if (rating) {
        return rating;
      } else {
        throw new NotFoundException(ERROR_MESSAGE.RATING_NOT_FOUND);
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async deleteById(id: string) {
    try {
      const rating = await this.ratingRepository.findOne({
        where: {
          id,
        },
      });
      if (rating) {
        const deleteRating = await this.ratingRepository.delete(id);
        if (deleteRating.affected > 0) {
          return "success";
        }
      } else {
        throw new NotFoundException(ERROR_MESSAGE.RATING_NOT_FOUND);
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
