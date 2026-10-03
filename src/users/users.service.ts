import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  ChangePasswordDTO,
  CreateUserDTO,
  UpdateUserDTO,
} from "./dto/user.dto";
import { PinoLogger } from "nestjs-pino";
import { InjectRepository } from "@nestjs/typeorm";
import * as jwtToken from "jsonwebtoken";
import { Users } from "./user.entity";
import {
  Brackets,
  DataSource,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  QueryBuilder,
  Repository,
} from "typeorm";
import * as bcrypt from "bcrypt";
import { Role, STATUS } from "./enums/users.enum";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { LicenceFiltersType } from "src/liscense/enums/filter.enum";
import firebase from "firebase-admin";
import { Roles } from "src/Roles.decorator";
import { option } from "yargs";
import { StripeService } from "src/stripe/stripe.service";
import { DeviceToken } from "src/notification/entity/device-token.entity";
import { RIDE_PAYMENT_STATUS, RIDE_STATUS } from "src/rides/enums/rides.enum";
import { DriverTypeEnum } from "src/driver/enums/driver.enum";
import { Rides } from "src/rides/rides.entity";
import { Drivers } from "src/driver/driver.entity";
import { GmailService } from "src/gmail/gmail.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
    private readonly stripeService: StripeService,
    private readonly gmailService: GmailService,
    @InjectRepository(Users)
    private readonly UsersRepository: Repository<Users>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(Rides)
    private readonly rideRepository: Repository<Rides>,
    @InjectRepository(Drivers)
    private readonly driverRepository: Repository<Drivers>
  ) {}
  async createUser(user: CreateUserDTO, queryRunner?) {
    this.logger.info("Service=>createUser=>Input: %o", user);
    try {
      const emailExist = await this.findUserByEmail(user.email);
      if (emailExist) {
        throw new ConflictException("Email already exists");
      }
      const phoneNumberExist = await this.findUserByPhone(user.phoneNumber);
      if (phoneNumberExist) {
        throw new ConflictException("Phone number already exists");
      }
      const saltOrRounds = parseInt(process.env.SALT_ROUNDS);
      const hash = await bcrypt.hash(user.password, saltOrRounds);
      const parseDob = new Date(user.dob);
      const userObj = {
        userName: user.userName,
        password: hash,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        dob: user.dob,
        company: user.company,
        creater: user.creater ? user.creater : null,
      };
      let userCreated;
      if (queryRunner) {
        userCreated = await queryRunner.manager.save(Users, userObj);
      } else {
        userCreated = await this.UsersRepository.save(userObj);
      }
      let updatedUser = userCreated;
      if (userCreated && userCreated.role === Role.CUSTOMER) {
        const customer = await this.stripeService.createCustomer({
          name: userCreated?.userName,
          email: userCreated?.email,
          phone: userCreated?.phone,
        });

        const updatedUserData = await this.UsersRepository.update(
          { id: userCreated?.id },
          { stripeCustomerId: customer.id }
        );
        updatedUser = updatedUserData;
      }
      try {
        const userRecord = await firebase
          .auth()
          .getUserByPhoneNumber(user?.phoneNumber);
        // User already exists
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          // User does not exist, create a new user
          try {
            const userRecord = await firebase.auth().createUser({
              phoneNumber: user?.phoneNumber,
            });
            this.logger.info("Successfully created new user:", userRecord.uid);
          } catch (createError) {
            this.logger.error("Error creating new user:", createError);
          }
        } else {
          this.logger.error("Error fetching user data:", error);
        }
      }
      this.logger.info("Service=>createUser=>Output: %o", userCreated);
      let response = {
        id: updatedUser.id,
        userName: updatedUser.userName,
        phoneNumber: updatedUser.phoneNumber,
        email: updatedUser.email,
        role: updatedUser.role,
        dob: updatedUser.dob,
      };
      return response;
    } catch (err) {
      this.logger.error("Service=>createUser=>Error: %o", err);
      throw err;
    }
  }
  async updateUser(user: UpdateUserDTO, userId: string) {
    this.logger.info("Service=>updateUser=>Input: %o", user);
    if (user.email) {
      const emailExist = await this.findUserByEmail(user.email);
      if (emailExist && emailExist.id !== userId) {
        throw new ConflictException("Email already exists");
      }
    }
    if (user.phoneNumber) {
      const phoneNumberExist = await this.findUserByPhone(user.phoneNumber);
      if (phoneNumberExist && phoneNumberExist.id !== userId) {
        throw new ConflictException("Phone number already exists");
      }
    }
    let saltOrRounds;
    let hash;
    let parseDob;
    if (user.password) {
      saltOrRounds = parseInt(process.env.SALT_ROUNDS);
      hash = await bcrypt.hash(user.password, saltOrRounds);
      user.password = hash;
    }
    if (user.dob) {
      parseDob = new Date(user.dob);
    }
    if (user.role) {
      user.role = user.role.toUpperCase();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const response = await queryRunner.manager.update(
        Users,
        { id: userId },
        user
      );
      if (response.affected === 0) {
        throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
      }
      const updatedUser = await this.UsersRepository.findOne({
        where: { id: userId },
      });
      try {
        const userRecord = await firebase
          .auth()
          .getUserByPhoneNumber(user?.phoneNumber);
        // User already exists
        this.logger.info("User already exists:", userRecord.uid);
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          // User does not exist, create a new user
          try {
            const userRecord = await firebase.auth().createUser({
              phoneNumber: user?.phoneNumber,
            });
            this.logger.info("Successfully created new user:", userRecord.uid);
          } catch (createError) {
            this.logger.error("Error creating new user:", createError);
          }
        } else {
          this.logger.error("Error fetching user data:", error);
        }
      }
      this.logger.info("Service=>updateUser=>Output: %o", updatedUser);
      return updatedUser;
    } catch (err) {
      this.logger.error("Service=>updateUser=>Error: %o", err);
      throw new InternalServerErrorException(err);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteUser(userId: string) {
    this.logger.info("Service=>deleteUser=>Input: %o", userId);
    try {
      const userDeleted = await this.UsersRepository.delete(userId);
      this.logger.info("Service=>deleteUser=>Ouput: %o", userDeleted);
      return "success";
    } catch (err) {
      this.logger.error("Service=>deleteUser=>Error: %o", err);
      throw new InternalServerErrorException(err);
    }
  }

  async findUsers(options) {
    let skip = (options.page - 1) * options.limit;
    let take = options.limit;
    let role = options.role;
    try {
      this.logger.error("service=>list=>Input: %o", skip, take);
      let qb = this.UsersRepository.createQueryBuilder("user").select();
      if (role?.toUpperCase() === Role.ADMIN) {
        qb.where(
          new Brackets((qb) => {
            qb.orWhere("user.role=:controller", {
              controller: Role.CONTROLLER,
            });
            qb.orWhere("user.role=:operator", {
              operator: Role.OPERATOR,
            });
            qb.orWhere("user.role=:finance", {
              finance: Role.FINANCE,
            });
            qb.orWhere("user.role=:admin", {
              admin: Role.ADMIN,
            });
          })
          //     "user.role=:controller", {
          //   controller: Role.CONTROLLER,
          // }
        );
      }

      if (options.search) {
        qb.andWhere(
          new Brackets((qb) => {
            qb.where("user.userName ILIKE :search", {
              search: `%${options.search}%`,
            })
              .orWhere("user.email ILIKE :search", {
                search: `%${options.search}%`,
              })
              .orWhere("user.company ILIKE :search", {
                search: `%${options.search}%`,
              })
              .orWhere("user.phoneNumber ILIKE :search", {
                search: `%${options.search}%`,
              })
              .orWhere("user.role ILIKE :search", {
                search: `%${options.search}%`,
              });
          })
        );
      }
      const list = await qb.skip(skip).take(take).getManyAndCount();
      //   let list = await this.UsersRepository.findAndCount({ skip, take });
      this.logger.info("service=>list=>Output: %o", list);
      // if (list[0].length > 0) {
      let response = {
        rows: list[0],
        count: list[1],
      };
      return response;
      // } else {
      //   this.logger.error("service=>list=>Error: %o", "user not found");
      //   throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
      // }
    } catch (err) {
      this.logger.error("service=>list=>Error: %o", "internal server error");
      throw new InternalServerErrorException(err.message);
    }
  }

  async findPassengers(options) {
    let skip = (options.page - 1) * options.limit;
    let take = options.limit;
    let role = options.role;
    try {
      this.logger.error("service=>list=>Input: %o", skip, take);
      let qb = this.UsersRepository.createQueryBuilder("user").select();
      qb.where("user.role=:customer", {
        customer: Role.CUSTOMER,
      });

      if (options.search) {
        qb.andWhere(
          new Brackets((qb) => {
            qb.where("user.userName ILIKE :search", {
              search: `%${options.search}%`,
            })
              .orWhere("user.email ILIKE :search", {
                search: `%${options.search}%`,
              })
              .orWhere("user.company ILIKE :search", {
                search: `%${options.search}%`,
              })
              .orWhere("user.phoneNumber ILIKE :search", {
                search: `%${options.search}%`,
              })
              .orWhere("user.role ILIKE :search", {
                search: `%${options.search}%`,
              });
          })
        );
      }
      const list = await qb.skip(skip).take(take).getManyAndCount();
      //   let list = await this.UsersRepository.findAndCount({ skip, take });
      this.logger.info("service=>list=>Output: %o", list);
      // if (list[0].length > 0) {
      let response = {
        rows: list[0],
        count: list[1],
      };
      return response;
      // } else {
      //   this.logger.error("service=>list=>Error: %o", "user not found");
      //   throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
      // }
    } catch (err) {
      this.logger.error("service=>list=>Error: %o", "internal server error");
      throw new InternalServerErrorException(err.message);
    }
  }

  async findUserByEmail(
    email: string,
    date?: Date | undefined | null,
    filterType?: string | undefined | null
  ) {
    this.logger.info("Service=>findUserByEmail=>Input: %o", email);
    let user;
    if (!email) {
      throw new InternalServerErrorException("Email must not be empty");
    }
    try {
      if (
        filterType &&
        filterType !== undefined &&
        filterType === LicenceFiltersType.OVER_14_DAYS
      ) {
        user = await this.UsersRepository.findOne({
          // where: { email, status: STATUS.ACTIVE, lastLogin: LessThan(date) },
          where: { email, lastLogin: LessThan(date) },
        });
      } else if (filterType === LicenceFiltersType.NEVER) {
        user = await this.UsersRepository.findOne({
          // where: { email, status: STATUS.ACTIVE, lastLogin: IsNull() },
          where: { email, lastLogin: IsNull() },
        });
      } else if (
        filterType &&
        filterType !== undefined &&
        filterType === LicenceFiltersType.LAST_14_DAYS
      ) {
        user = await this.UsersRepository.findOne({
          where: {
            email,
            // status: STATUS.ACTIVE,
            lastLogin: MoreThanOrEqual(date),
          },
        });
      } else {
        user = await this.UsersRepository.findOne({
          // where: { email, status: STATUS.ACTIVE },
          where: { email },
        });
      }
      this.logger.info("Service=>findUserByEmail=>Output: %o", user);
      if (!user) {
        this.logger.error(
          "Service=>findUserByEmail=>Error: %o",
          ERROR_MESSAGE.NOT_FOUND
        );
        return null;
      }

      return user;
    } catch (err) {
      this.logger.error("Service=>findUserByEmail=>Error: %o", err);
      throw new InternalServerErrorException(err.message);
    }
  }
  async findUserByEmailWithoutFilter(email: string) {
    this.logger.info("Service=>findUserByEmail=>Input: %o", email);
    let user;
    try {
      user = await this.UsersRepository.findOne({
        where: { email },
      });
      this.logger.info("Service=>findUserByEmail=>Output: %o", user);
      if (!user) {
        this.logger.error(
          "Service=>findUserByEmail=>Error: %o",
          ERROR_MESSAGE.NOT_FOUND
        );
        return null;
      }

      return user;
    } catch (err) {
      this.logger.error("Service=>findUserByEmail=>Error: %o", err);
      throw new InternalServerErrorException(err.message);
    }
  }
  async findUserByPhone(phoneNumber: string) {
    this.logger.info("Service=>findUserByPhone=>Input: %o", phoneNumber);
    try {
      const user = await this.UsersRepository.findOne({
        where: { phoneNumber, status: STATUS.ACTIVE },
      });
      this.logger.info("Service=>findUserByPhone=>Output: %o", user);
      if (!user) {
        this.logger.error(
          "Service=>findUserByPhonel=>Error: %o",
          "user doesnot exist"
        );
        return null;
      }

      return user;
    } catch (err) {
      this.logger.error("Service=>findUserByPhone=>Error: %o", err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async findUserById(id: string, role?: string) {
    this.logger.info("Service=>findUserById=>Input: %o", id);
    try {
      let user;
      if (role === Role.ADMIN) {
        user = await this.UsersRepository.findOne({
          where: { id },
        });
        this.logger.info("Service=>findUserById=>Output: %o", id);
      } else {
        user = await this.UsersRepository.findOne({
          where: { id, status: STATUS.ACTIVE },
        });
      }
      this.logger.info("Service=>findUserById=>Output: %o", id);
      if (!user) {
        this.logger.error(
          "Service=>findUserById=>Error: %o",
          "user doesnot exist"
        );
        return null;
      }

      return user;
    } catch (err) {
      this.logger.error("Service=>findUserById=>Error: %o", err);
      throw new InternalServerErrorException(err.message);
    }
  }
  async driverLogout(authorizationHeader, driverObj) {
    try {
      const token = authorizationHeader.split(" ")[1]; // Assuming "Bearer <token>"
      // Verify and decode the JWT token
      const decoded: any = jwtToken.decode(token);
      const user = await this.findUserByEmail(decoded.email);
      if (user) {
        let statusUpdated;
        const driver = await this.driverRepository.findOne({
          where: { email: user.email },
        });
        if (driver) {
          statusUpdated = await this.driverRepository.update(
            { id: driver.id },
            { online: false }
          );
          if (statusUpdated.affected == 0) {
            throw new BadRequestException();
          }
        }
        await this.deviceTokenRepository.delete({ userId: user.id });
        if (driver && driver.driverType != DriverTypeEnum.SELF_EMPLOYED) {
          if (statusUpdated.affected > 0) {
            const updated = await this.driverRepository.update(
              { id: driver.id },
              {
                currentVehicleId: null,
                bearing: null,
                longitude: null,
                latitude: null,
                zone: null,
              }
            );
            if (updated.affected == 0) {
              throw new BadRequestException();
            }
            return "success";
          } else {
            throw new BadRequestException();
          }
        } else {
          return "success";
        }
      } else {
        throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
      }
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }
  async userLogout(userId) {
    try {
      await this.deviceTokenRepository.delete({ userId });
      const response = { message: "success" };
      return response;
    } catch (err) {
      this.logger.error("Service=>userLogout=>Error: %o", err);
      throw err;
    }
  }

  async findUserWithoutStatus(email: string) {
    try {
      const driver = await this.driverRepository
        .createQueryBuilder("d")
        .leftJoinAndSelect("d.rides", "r")
        .where("d.email = :email", { email })
        .andWhere("r.status NOT IN (:...statuses)", {
          statuses: [
            RIDE_STATUS.COMPLETED,
            RIDE_STATUS.NO_FARE,
            RIDE_STATUS.CANCELLED,
          ],
        })
        .getOne();
      return driver;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }
  async initialAPI(user) {
    if (user?.email) {
      const passenger = await this.UsersRepository.findOne({
        where: { email: user.email, role: Role.CUSTOMER },
      });
      if (passenger?.id) {
        try {
          const rides = await this.rideRepository
            .createQueryBuilder("ride")
            // ASAP RIDE
            .where(
              "ride.customerId = :id AND ride.paymentStatus=:paymentStatusASAP AND ride.isScheduled = :isScheduledASAP AND ride.status NOT IN (:...statusesASAP) ",
              {
                id: user.id,
                paymentStatusASAP: RIDE_PAYMENT_STATUS.PAID,
                isScheduledASAP: false,
                statusesASAP: [
                  RIDE_STATUS.CANCELLED,
                  RIDE_STATUS.NO_FARE,
                  RIDE_STATUS.COMPLETED,
                ],
              }
            )
            // SCHEDULED RIDE
            .orWhere(
              "ride.customerId = :id AND ride.paymentStatus=:paymentStatus AND ride.isScheduled = :isScheduled AND ride.status NOT IN (:...statuses) ",
              {
                id: user.id,
                paymentStatus: RIDE_PAYMENT_STATUS.PAID,
                isScheduled: true,
                statuses: [
                  RIDE_STATUS.PENDING,
                  RIDE_STATUS.HELD,
                  RIDE_STATUS.REQUESTED,
                  RIDE_STATUS.DISPATCHED,
                  RIDE_STATUS.REJECTED,
                  RIDE_STATUS.CANCELLED,
                  RIDE_STATUS.NO_FARE,
                  RIDE_STATUS.COMPLETED,
                ],
              }
            )
            // COMPLETED RIDE
            .orWhere(
              "ride.paymentStatus=:paymentStatusCompeleted AND ride.customerId = :id AND ride.status = :rideStatus AND ride.ratingId IS NULL AND ride.isSkipRating = :isSkipRating ",
              {
                id: user.id,
                rideStatus: RIDE_STATUS.COMPLETED,
                paymentStatusCompeleted: RIDE_PAYMENT_STATUS.PAID,
                isSkipRating: false,
              }
            )
            .getOne();
          return rides;
        } catch (err) {
          this.logger.error(err);
          throw err;
        }
      }
    }
  }

  async deleteUserRequest(email: string) {
    this.logger.info("Service=>deleteUserRequest=>Input: %o", email);

    try {
      const user = await this.UsersRepository.createQueryBuilder("user")
        .where("user.email = :email", { email })
        .getOne();

      if (!user) {
        throw new BadRequestException(ERROR_MESSAGE.USER_NOT_FOUND);
      }

      // const admins = await this.UsersRepository.createQueryBuilder("user")
      //   .where("user.role = :role AND user.status = :status", {
      //     role: Role.ADMIN,
      //     status: STATUS.ACTIVE,
      //   })
      //   .getMany();

      // Sending the email to active admins
      // for (const admin of admins) {
      // this.logger.info("Service=>deleteUserRequest=>Admin: %o", admin?.email);
      await this.gmailService.sendEmail(
        "info@zoomcars.org",
        "Account Deletion Requested",
        `
          <html>
            <body>
              <h2>Account Deletion Requested</h2>
              <p>The following user has submitted a request for their account deletion:</p>
              <p><strong>Email:</strong> ${user?.email}</p>
              <p><strong>Phone Number:</strong> ${user?.phoneNumber}</p>
              <p><strong>Username:</strong> ${user?.userName}</p>
              <p><strong>Role:</strong> ${user?.role}</p>
            </body>
          </html>
          `
      );
      // }
      this.logger.info(
        "Service=>deleteUserRequest=>CurrentUser: %o",
        user?.email
      );

      // Sending the email to the customer
      await this.gmailService.sendEmail(
        user?.email,
        "Account Deletion Request Received",
        `
        <html>
          <body>
            <h2>Your Account Deletion Request Has Been Received</h2>
            <p>Dear ${user?.userName},</p>
            <p>We have received your request to delete your account. Our support team will review your request and contact you soon with further instructions.</p>
            <p>If you have any questions or need immediate assistance, please don't hesitate to reach out to our support team.</p>
            <br/>
            <p>Thank you,</p>
            <p>Zoom Cars</p>
          </body>
        </html>
        `
      );

      return { message: "Success" };
    } catch (err) {
      this.logger.error("Service=>deleteUserRequest=>Error: %o", err);
      throw new HttpException(err?.response || err?.message, err?.status);
    }
  }

  async changePasswordOfDriver(data: ChangePasswordDTO) {
    this.logger.info(
      "Service=>changePasswordOfDriver=>Input: %o",
      data?.driverEmail
    );
    const email = data?.driverEmail;
    const role = Role?.DRIVER;
    const saltOrRounds = parseInt(process.env.SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(data.newPassword, saltOrRounds);
    try {
      const user = await this.UsersRepository.createQueryBuilder("user")
        .where("user.email = :email", { email })
        .andWhere("user.role = :role", { role })
        .getOne();

      if (!user) {
        throw new BadRequestException(ERROR_MESSAGE.USER_NOT_FOUND);
      }
      const updatedUserData = await this.UsersRepository.update(
        { id: user?.id },
        { password: hashedPassword }
      );
      this.logger.info(
        "Service=>changePasswordOfDriver=>data: %o",
        user?.email
      );

      return { message: "Success" };
    } catch (err) {
      this.logger.error("Service=>deleteUserRequest=>Error: %o", err);
      throw new HttpException(err?.response || err?.message, err?.status);
    }
  }

  //   async registerUser(createDto: CreateUserDTO) {
  //     createDto.role = createDto?.role?.toUpperCase();
  //     const userByEmail = await this.findUserByEmail(
  //       createDto.email
  //     );
  //     const userByPhoneNumber = await this.findUserByEmail(
  //       createDto.phoneNumber
  //     );
  //     if (userByEmail || userByPhoneNumber) {
  //       throw new ConflictException(ERROR_MESSAGE.CONFLLICT);
  //     }
  //     try {
  //     //   let decodedToken = await firebase
  //     //     .auth()
  //     //     .verifyIdToken(createDto.phoneNumber.toString());
  //       const result = await this.createUser({
  //         ...createDto,,
  //         phoneNumber: createDto.phoneNumber
  //       });
  //       return result;
  //     } catch (e) {
  //     //   if (e?.code === "auth/id-token-expired") {
  //     //     throw new ForbiddenException(ERROR_MESSAGE?.FIREBASE_TOKEN_EXPIRED);
  //     //   }
  //       throw new ForbiddenException(e);
  //     }
  //   }
}
