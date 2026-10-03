import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { LoginDTO } from "./dto/login.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Users } from "src/users/user.entity";
import { DataSource, Raw, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { PinoLogger } from "nestjs-pino";
import { ResetPasswordDTO } from "./dto/resetPassword.dto";
import { Role } from "src/users/enums/users.enum";
import { DriverTypeEnum, STATUS } from "src/driver/enums/driver.enum";
import { JwtService } from "@nestjs/jwt";
import { CreateUserDTO } from "src/users/dto/user.dto";
import { UsersService } from "src/users/users.service";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { UtilsService } from "src/utils/utils.service";
import firebase from "firebase-admin";
import { Drivers } from "src/driver/driver.entity";
import { Liscense } from "src/liscense/entity/liscense.entity";
import { Vehicle } from "src/vehicles/vehicle.entity";
import { Mode } from "src/driverGroups/constants";
@Injectable()
export class AuthService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Drivers)
    private readonly driverRepository: Repository<Drivers>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly utilsService: UtilsService
  ) {}
  async userLogin(userLogin: LoginDTO) {
    this.logger.info("Service=>userlogin=>Input: %o", userLogin);
    const queryRunner = this.dataSource.createQueryRunner();
    let payload;
    try {
      let user = await this.usersRepository.findOne({
        where: {
          email: Raw((alias) => `LOWER(${alias}) = :email`, {
            email: userLogin.email.toLowerCase(),
          }),
          role: userLogin?.userType,
        },
      });
      if (user) {
        if (user.status === STATUS.SUSPENDED) {
          throw new UnauthorizedException(ERROR_MESSAGE.USER_SUSPENDED);
        }
        if (user.status === STATUS.DISABLED) {
          throw new UnauthorizedException(ERROR_MESSAGE.USER_DISABLED);
        }
        const isMatch = await bcrypt.compare(userLogin.password, user.password);
        if (isMatch) {
          payload = {
            id: user.id,
            userName: user.userName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            role: user.role,
            dob: user.dob,
            stripeCustomerId: user.stripeCustomerId,
          };
          this.logger.info("Service=>userlogin=>Output: %o", payload);
          const token = {
            access_token: await this.jwtService.signAsync(payload, {
              secret: process.env.SECRET_KEY,
              expiresIn: process.env.EXPIRATION_TIME,
            }),
          };
          if (token) {
            const milliseconds = Date.now();
            const date = new Date(milliseconds);
            const utcString = date.toUTCString();
            await queryRunner.manager.update(
              Users,
              { id: user.id },
              { lastLogin: utcString }
            );
          }
          if (user.role === Role.DRIVER) {
            let driver = await this.driverRepository.findOne({
              where: {
                email: userLogin.email?.toLocaleLowerCase(),
              },
              relations: { vehicle: true, driverGroup: true },
            });
            if (driver) {
              if (driver.driverType === DriverTypeEnum.SELF_EMPLOYED) {
                const vehicle = await this.vehicleRepository.findOne({
                  where: {
                    driver: { email: userLogin.email?.toLocaleLowerCase() }, // Assuming `user` is the property in Vehicle entity that relates to User entity
                  },
                });
                if (vehicle?.insuranceExpires) {
                  const date = new Date(vehicle?.insuranceExpires);
                  const insuranceExpired =
                    this.utilsService.checkExpireyDate(date);
                  if (insuranceExpired) {
                    throw new UnauthorizedException(
                      ERROR_MESSAGE.INSURANCE_EXPIRED
                    );
                  }
                }
                if (vehicle?.mdtExpires) {
                  const date = new Date(vehicle?.mdtExpires);
                  const mdtExpired = this.utilsService.checkExpireyDate(date);
                  if (mdtExpired) {
                    throw new UnauthorizedException(ERROR_MESSAGE.MOT_EXPIRED);
                  }
                }
                if (vehicle?.platExpires) {
                  const date = new Date(vehicle?.platExpires);
                  const plateExpired = this.utilsService.checkExpireyDate(date);
                  if (plateExpired) {
                    throw new UnauthorizedException(
                      ERROR_MESSAGE.PLATE_EXPIRED
                    );
                  }
                }
                if (vehicle?.roadtaxExpires) {
                  const date = new Date(vehicle?.roadtaxExpires);
                  const roadtaxExpired =
                    this.utilsService.checkExpireyDate(date);
                  if (roadtaxExpired) {
                    throw new UnauthorizedException(
                      ERROR_MESSAGE.ROAD_TAX_EXPIRED
                    );
                  }
                }
                const updatedDriver = await this.driverRepository.update(
                  { id: driver.id },
                  { currentVehicleId: vehicle.id }
                );
              } else if (driver.driverGroup?.mode !== Mode.ALLOWED_DRIVERS) {
                throw new UnauthorizedException(
                  ERROR_MESSAGE.DRIVER_GROUP_MODE_IS_NOTALLOWED
                );
              }
              return {
                driver: driver,
                access_token: token.access_token,
                user: user,
              };
            }
          }
          return { access_token: token?.access_token, user };
        } else {
          this.logger.error("Service=>userlogin=>Incorrect Password");
          throw new UnauthorizedException(ERROR_MESSAGE.INCORRECT_PASSWORD);
        }
      } else {
        this.logger.error("Service=>userlogin=>User not found");
        throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
      }
    } catch (err) {
      this.logger.error("Service=>userlogin=>Error: %o", err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async resetPassword(data: ResetPasswordDTO) {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      const saltOrRounds = parseInt(process.env.SALT_ROUNDS);
      const hash = await bcrypt.hash(data.password, saltOrRounds);
      try {
        let decodedToken = await firebase
          .auth()
          .verifyIdToken(data.phoneNumber.toString());
        if (decodedToken) {
          const passwordUpdated = await queryRunner.manager.update(
            Users,
            { phoneNumber: decodedToken?.phone_number },
            { password: hash }
          );
          if (passwordUpdated.affected > 0) {
            return passwordUpdated;
          } else {
            throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
          }
        } else {
          throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
        }
      } catch (e) {
        this.logger.error(e);
        if (e?.code === "auth/id-token-expired") {
          throw new ForbiddenException(ERROR_MESSAGE?.FIREBASE_TOKEN_EXPIRED);
        }
        throw new ForbiddenException(e);
      } finally {
        await queryRunner.release();
      }
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(err.message);
    }
  }
  async registerUser(createDto: CreateUserDTO) {
    createDto.role = createDto?.role?.toUpperCase();
    const userByEmail = await this.usersService.findUserByEmail(
      createDto.email?.toLocaleLowerCase()
    );
    const userByPhoneNumber = await this.usersService.findUserByEmail(
      createDto.phoneNumber
    );
    if (userByEmail || userByPhoneNumber) {
      throw new ConflictException(ERROR_MESSAGE.CONFLLICT);
    }
    try {
      let decodedToken = await firebase
        .auth()
        .verifyIdToken(createDto.phoneNumber.toString());
      const result = await this.usersService.createUser({
        ...createDto,
        phoneNumber: decodedToken?.phone_number,
        email: createDto?.email?.toLocaleLowerCase(),
      });
      return result;
    } catch (e) {
      this.logger.error(e);
      if (e?.code === "auth/id-token-expired") {
        throw new ForbiddenException(ERROR_MESSAGE?.FIREBASE_TOKEN_EXPIRED);
      }
      throw new ForbiddenException(e);
    }
  }
}
