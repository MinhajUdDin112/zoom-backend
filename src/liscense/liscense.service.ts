import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  Brackets,
  DataSource,
  ILike,
  IsNull,
  LessThan,
  MoreThan,
  MoreThanOrEqual,
  QueryBuilder,
  Repository,
  getRepository,
} from "typeorm";
import { Liscense } from "./entity/liscense.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { GetAllDTO, LiscenseDTO, UpdateLiscenseDTO } from "./dto/liscense.dto";
import { query } from "express";
import { Vehicle } from "src/vehicles/vehicle.entity";
import { VehicleService } from "src/vehicles/vehicle.service";
import { DriversService } from "src/driver/driver.service";
import { UsersService } from "src/users/users.service";
import { CreateUserDTO, GetUserDTO } from "src/users/dto/user.dto";
import { Role } from "src/users/enums/users.enum";
import { Users } from "src/users/user.entity";
import { UtilsService } from "src/utils/utils.service";
import { MailDTO } from "src/utils/dto/mail.dto";
import { Logger, PinoLogger } from "nestjs-pino";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { QueryOptionsDTO } from "src/utils/dto/queryOption.dto";
import { LicenceFiltersType } from "./enums/filter.enum";
import { GmailService } from "src/gmail/gmail.service";
import { RidesService } from "src/rides/rides.service";
import { DeviceToken } from "src/notification/entity/device-token.entity";

@Injectable()
export class LiscenseService {
  constructor(
    @InjectRepository(Liscense)
    private readonly liscenseRepository: Repository<Liscense>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    private readonly dataSource: DataSource,
    private readonly vehicleService: VehicleService,
    private readonly driverService: DriversService,
    private readonly usersService: UsersService,
    private readonly utilsService: UtilsService,
    private readonly gmailService: GmailService,
    private readonly rideService: RidesService,
    private readonly logger: PinoLogger
  ) {}
  async createLiscense(
    liscense: LiscenseDTO,
    authenticatedUserData: GetUserDTO
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // also find driver and vehicle id already to exist ni kr rahi liscense ma
      const vehicle = await this.vehicleService.findVehicleById(
        liscense.vehicleId
      );
      const driver = await this.driverService.findDriverById(liscense.driverId);
      const driverInLiscense = await this.liscenseRepository.findOne({
        where: { driver: { id: liscense.driverId } },
        relations: ["driver"],
      });

      const driverEmail = liscense.email?.toLocaleLowerCase();

      const user = await this.usersService.findUserByEmail(driverEmail);
      const userByPhone = await this.usersService.findUserByPhone(
        driver.mobile
      );
      const randomPassword = this.utilsService.generatePassword();

      const createUser: CreateUserDTO = {
        phoneNumber: driver.mobile,
        userName: driver.firstName,
        email: driverEmail,
        password: randomPassword,
        confirmPassword: randomPassword,
        role: Role.DRIVER,
        dob: driver.dob,
        company: driver.company,
        creater: authenticatedUserData.id,
      };

      if (userByPhone) {
        throw new NotFoundException(
          "User with this phone number already exists"
        );
      }

      if (driver.email !== driverEmail) {
        throw new NotFoundException("Invalid email");
      }

      if (driverInLiscense) {
        throw new ConflictException(
          "Driver is already associated with a liscense"
        );
      }

      if (user) {
        throw new ConflictException("user already exists");
      }
      if (driver === null || vehicle === null) {
        throw new NotFoundException("vehicle/driver doesnot exist");
      }
      await this.usersService
        .createUser(createUser, queryRunner)
        .then((result) => {
          this.gmailService.sendEmail(
            driverEmail,
            "License Created",
            `
            <html>
              <body>
                <h2>License Created</h2>
                <p>Here are your credentials:</p>
                <p><strong>Username:</strong> ${driverEmail}</p>
                <p><strong>Password:</strong> ${randomPassword}</p>
              </body>
            </html>
            `
          );
        })
        .catch((err) => {
          throw err;
        });
      const savedUser = await queryRunner.manager.findOne(Users, {
        where: { email: createUser.email },
      });
      liscense.userId = savedUser.id;
      delete liscense.email;
      const savedLiscense = await queryRunner.manager.save(Liscense, {
        ...liscense,
        vehicle,
        driver,
        user: savedUser,
      });
      await queryRunner.commitTransaction();
      return savedLiscense;
    } catch (err) {
      this.logger.error(err);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  async findAll(options: GetAllDTO) {
    let skip: number | undefined;
    let take: number | undefined;
    let search: string | undefined;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // Check if page and limit are provided
    if (options.page && options.limit) {
      skip = (options.page - 1) * options.limit;
      take = options.limit;
      search = options.search;
    }

    let { filter } = options;

    try {
      await queryRunner.startTransaction();
      const queryOptions = await this.dataSource.manager
        .createQueryBuilder(Liscense, "liscense")
        .leftJoinAndSelect("liscense.driver", "driver")
        .leftJoinAndSelect("liscense.vehicle", "vehicle")
        .leftJoinAndSelect("liscense.user", "user");

      if (filter) {
        if (filter.toUpperCase() === LicenceFiltersType.LAST_14_DAYS) {
          const filterValue = this.utilsService.isWithinLast14Days();
          queryOptions.andWhere("user.lastLogin >= :filterValue", {
            filterValue,
          });
        } else if (filter.toUpperCase() === LicenceFiltersType.LAST_30_DAYS) {
          const filterValue = this.utilsService.isWithinLast30Days();
          queryOptions.andWhere("user.lastLogin >= :filterValue", {
            filterValue,
          });
        } else if (filter.toUpperCase() === LicenceFiltersType.OVER_14_DAYS) {
          const filterValue = this.utilsService.isWithinLast14Days();
          queryOptions.andWhere("user.lastLogin < :filterValue", {
            filterValue,
          });
        } else if (filter.toUpperCase() === LicenceFiltersType.OVER_30_DAYS) {
          const filterValue = this.utilsService.isWithinLast30Days();
          queryOptions.andWhere("user.lastLogin < :filterValue", {
            filterValue,
          });
        } else if (filter?.toUpperCase() === LicenceFiltersType.NEVER) {
          queryOptions.andWhere("user.lastLogin IS NULL");
        }
      }
      if (search) {
        const searchSplitted = search.split(" ");
        // for(const search of searchSplitted) {

        // }
        // const searchSplitted = search.split(' ');

        queryOptions.andWhere(
          new Brackets((qb) => {
            searchSplitted.forEach((word, index) => {
              const parameterKey = `search${index}`;
              qb.orWhere(
                new Brackets((subQb) => {
                  subQb
                    .where(`user.email ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`user.userName ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`user.phoneNumber ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`user.role ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`user.status ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`driver.callSign ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`driver.company ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`vehicle.callSign ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`driver.lastName ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    })
                    .orWhere(`driver.firstName ILIKE :${parameterKey}`, {
                      [parameterKey]: `%${word}%`,
                    });
                })
              );
            });
          })
        );
      }

      queryOptions.skip(skip).take(take).getMany();
      const [licenses, count] = await queryOptions.getManyAndCount();
      const filteredLicenses = await Promise.all(
        licenses.map(async (license) => {
          const user = await this.usersService.findUserByEmail(
            license.driver.email
          );
          if (user) {
            const creater = await this.usersService.findUserById(user.creater);
            user.creater = creater;
            return { ...license, user };
          }
          return null;
        })
      );
      // Remove null values from the filtered licenses
      const validLicenses = filteredLicenses.filter(
        (license) => license !== null
      );
      const response = {
        rows: validLicenses,
        count: count,
      };
      await queryRunner.commitTransaction();
      // this.logger.info("service=>list=>Output: %o", validLicenses);
      return response;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>findAll=>Error: %o", err);
      throw new BadRequestException(err);
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string) {
    this.logger.info("service=>findById=>Input: %o", id);
    try {
      const capabaility = await this.liscenseRepository.findOne({
        where: {
          id,
        },
        relations: {
          driver: true,
          vehicle: true,
        },
      });
      if (!capabaility) {
        this.logger.error(
          "Service=>findById=>Error: %o",
          ERROR_MESSAGE.LISCENSE_NOT_FOUND
        );
        throw new NotFoundException(ERROR_MESSAGE.LISCENSE_NOT_FOUND);
      }
      this.logger.info("service=>findById=>Output: %o", capabaility);
      return capabaility;
    } catch (err) {
      this.logger.error("Service=>findById=>Error: %o", err);
      throw new InternalServerErrorException(err);
    }
  }
  async deleteLiscense(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    this.logger.info("Service=>deleteLiscense=>Input: %o", id);
    const liscense = await this.findById(id);
    if (!liscense) {
      throw new NotFoundException(ERROR_MESSAGE.LISCENSE_NOT_FOUND);
    }

    try {
      await queryRunner.startTransaction();

      const driverRides = await this.rideService.findRidesByDriverId(
        liscense?.driver?.id
      );

      if (driverRides?.length > 0) {
        throw new BadRequestException(
          ERROR_MESSAGE.LICENSE_DRIVER_RIDES_EXISTS
        );
      }
      const driverUser = await this.usersService.findUserByEmail(
        liscense?.driver?.email
      );

      await queryRunner.manager.delete(DeviceToken, { userId: driverUser?.id });

      const liscenseDeleted = await queryRunner.manager.delete(Liscense, id);
      const userDeleted = await queryRunner.manager.delete(Users, {
        email: liscense.driver.email,
      });
      this.logger.info("Service=>deleteLiscense=>Output: %o", liscenseDeleted);
      await queryRunner.commitTransaction();
      return "success";
    } catch (err) {
      this.logger.error("Service=>deleteLiscense=>Error: %o", err);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(err);
    } finally {
      await queryRunner.release();
    }
  }
  async updateLiscense(data: UpdateLiscenseDTO, id: string) {
    this.logger.info("service=>updateLiscense=>Input: %o", data);
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: data.vehicleId },
    });
    const liscense = await this.liscenseRepository.findOne({
      where: { vehicle: { id: data.vehicleId } },
    });
    const updateLiscense = await this.liscenseRepository.findOne({
      where: { id },
      relations: ["vehicle"],
    });
    if (!updateLiscense) {
      throw new NotFoundException(ERROR_MESSAGE.LISCENSE_NOT_FOUND);
    }
    if (!vehicle) {
      throw new NotFoundException(ERROR_MESSAGE.VEHICLE_NOT_FOUND);
    }
    if (liscense) {
      if (id === liscense.id) {
        return updateLiscense;
      }
      throw new ConflictException(ERROR_MESSAGE.VEHICLE_ASSOCIATED);
    }
    updateLiscense.vehicle = vehicle;
    try {
      const response = await this.liscenseRepository.save(updateLiscense);
      //   const capability = await this.findById(id);
      this.logger.info("service=>updateLiscense=>Output: %o", response);
      return response;
    } catch (err) {
      this.logger.error("Service=>updateLiscense=>Error: %o", err);
      throw new InternalServerErrorException(err);
    }
  }
}
