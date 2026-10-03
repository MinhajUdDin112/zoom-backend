import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  CreateDriverDTO,
  DriverInfoDto,
  DriverStatus,
  DriverUserDTO,
  LocationDTO,
  RIDE_PAYMENT_STATUS,
  UpdateDriverDTO,
  UpdateDriverStatusDTO,
} from "./dto/driver.dto";
import { PinoLogger } from "nestjs-pino";
import * as jwt from "jsonwebtoken";
import { InjectRepository } from "@nestjs/typeorm";
import { Drivers } from "./driver.entity";
import { Between, Brackets, DataSource, ILike, In, Repository } from "typeorm";
import { DocumentService } from "src/documents/document.service";
import { DriverTypeEnum, STATUS } from "./enums/driver.enum";
import { CapabilityService } from "src/capability/capability.service";
import { RIDE_STATUS } from "src/rides/enums/rides.enum";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { UsersService } from "src/users/users.service";
import { Vehicle } from "src/vehicles/vehicle.entity";
import { ZoneService } from "src/zone/zone.service";
import { Users } from "src/users/user.entity";
import { DeviceToken } from "src/notification/entity/device-token.entity";
import firebase from "firebase-admin";
import { Role } from "src/AreaGroup/enums/areaGroup.enum";
import { Zone } from "src/zone/zone.entity";
import { TarrifsService } from "src/tarrifs/tarrifs.service";
import { UtilsService } from "src/utils/utils.service";
import getCurrentUTCFormatted from "src/rides/utils";
import { RideLocationHistory } from "src/rides/ride-location-history.entity";
import { Rides } from "src/rides/rides.entity";
import centroid from "@turf/centroid";
import { featureCollection, polygon } from "@turf/helpers";
import { Geometry, Feature, Polygon as GeoJSONPolygon } from "geojson";
import { IsLatitude } from "class-validator";
import { DEFAULT_ZONE_NAME } from "src/constants";
import { FindAllQueryDto } from "src/vehicles/dto/vehicle.dto";
import { DriverWorkingHour } from "./driverWorkingHours.entity";
import { Capability } from "src/capability/entity/capability.entity";
import * as moment from "moment";

@Injectable()
export class DriversService {
  constructor(
    private readonly capabilityService: CapabilityService,
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
    private readonly documentService: DocumentService,
    private readonly usersService: UsersService,
    private readonly zoneService: ZoneService,
    private readonly tarrifsService: TarrifsService,
    private readonly utilsService: UtilsService,
    @InjectRepository(Drivers)
    private readonly DriverRepository: Repository<Drivers>,
    @InjectRepository(Capability)
    private readonly capabilityRepository: Repository<Capability>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(DriverWorkingHour)
    private readonly DriverWorkingHourRepository: Repository<DriverWorkingHour>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    @InjectRepository(Rides)
    private readonly rideRepository: Repository<Rides>,
    @InjectRepository(RideLocationHistory)
    private readonly rideLocationHistoryRepository: Repository<RideLocationHistory>
  ) {}
  async createDriver(driver: CreateDriverDTO) {
    this.logger.info("Service=>createDriver=>Input: %o", driver);
    let driverCreated;
    if (driver.callSign) {
      const driverExist = await this.DriverRepository.findOne({
        where: { callSign: driver.callSign },
      });
      if (driverExist) {
        throw new ConflictException(ERROR_MESSAGE.DRIVER_CALLSIGN);
      }
    }
    try {
      let driverPayload = await this.DriverRepository.create({
        profileImageUrl: driver.profileImageUrl,
        firstName: driver.firstName,
        lastName: driver.lastName,
        landLine: driver.landLine,
        mobile: driver.mobile,
        addressLine1: driver.addressLine1,
        addressLine2: driver.addressLine2,
        email: driver.email?.toLocaleLowerCase(),
        country: driver.country,
        town: driver.town,
        postcode: driver.postcode,
        callSign: driver.callSign,
        driverComment1: driver.driverComment1,
        driverComment2: driver.driverComment2,
        company: driver.company,
        acceptedPayments: driver.acceptedPayments,
        cashBookings: driver.cashBookings,
        accountBookings: driver.accountBookings,
        canCustomerCall: driver.canCustomerCall,
        transactionGroup: driver.transactionGroup,
        driverType: driver.driverType,
        nationalInsuranceNumber: driver.nationalInsuranceNumber,
        bankName: driver.bankName,
        bankShortCode: driver.bankShortCode,
        bankAccountNumber: driver.bankAccountNumber,
        badgeNumber: driver.badgeNumber,
        badgeExpiry: driver.badgeExpiry,
        driverLicenseNumber: driver.driverLicenseNumber,
        driverLicenseExpiry: driver.driverLicenseExpiry,
        bankTransfer: driver.bankTransfer,
        ebpJournalCode: driver.ebpJournalCode,
        ebpBankCode: driver.ebpBankCode,
        ebpPaymentMethod: driver.ebpPaymentMethod,
        ebpPaypalEmail: driver.ebpPaypalEmail,
        ePayout: driver.ePayout,
        ebpWorkJournalCode: driver.ebpWorkJournalCode,
        ebpWorkBankCode: driver.ebpWorkBankCode,
        ebpWorkPaymentMethod: driver.ebpWorkPaymentMethod,
        ebpWorkPaypalEmail: driver.ebpWorkPaypalEmail,
        currencyCode: driver.currencyCode,
        status: STATUS.ACTIVE,
        dob: driver.dob,
      });
      // const isMatch = await bcrypt.compare(driver.confirmPassword, hash);
      //   let driverCreated = await this.DriverRepository.save(driverPayload);
      if (driver.driverDocuments && driver.driverDocuments.length > 0) {
        const documents = await Promise.all(
          driver.driverDocuments.map(async (documentId) => {
            // Fetch documents using DocumentService
            return await this.documentService.findDocumentById(documentId);
          })
        );

        // Assign documents to the driver
        driverPayload.documents = documents;
        // Save the driver entity with associated documents
      }
      if (driver.capabilities && driver.capabilities.length > 0) {
        const capabilities =
          await this.capabilityService.findBulkCapabilitiesById(
            driver.capabilities
          );
        driverPayload.capabilities = capabilities;
      }
      driverCreated = await this.DriverRepository.save(driverPayload);
      try {
        const userRecord = await firebase
          .auth()
          .getUserByPhoneNumber(driver?.mobile);
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          // User does not exist, create a new user
          try {
            const userRecord = await firebase.auth().createUser({
              phoneNumber: driver?.mobile,
            });
            this.logger.info("Successfully created new user:", userRecord.uid);
          } catch (createError) {
            this.logger.error("Error creating new user:", createError);
          }
        } else {
          this.logger.error("Error fetching user data:", error);
        }
      }
      this.logger.info("Service=>createDriver=>Output: %o", driverCreated);
      return driverPayload;
    } catch (err) {
      this.logger.error("Service=>createDriver=>Error: %o", err);
      if (
        err?.detail?.toString().includes("Key (email)=(") &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new Error(ERROR_MESSAGE.EMAIL_ALREADY_EXISTS);
      } else {
        throw new Error(err);
      }
    }
  }
  async updateDriver(driver: UpdateDriverDTO, driverId: string) {
    this.logger.info("Service=>updateDriver=>Input: %o", driver);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const oldDriver = await this.DriverRepository.createQueryBuilder("driver")
        .select()
        .where("driver.id = :driverId", {
          driverId,
        })
        .getOne();

      const userName = driver.firstName + " " + driver.lastName;
      const { dob, email, mobile, company } = driver;
      const userObject = {
        ...(dob !== undefined && { dob }),
        ...(email !== undefined && { email: email?.toLocaleLowerCase() }),
        ...(userName !== undefined && { userName }),
        ...(mobile !== undefined && { phoneNumber: mobile }),
        ...(company !== undefined && { company }),
      };
      // Begin a transaction
      await queryRunner.startTransaction();
      if (driver.callSign) {
        const existingDriver = await this.DriverRepository.createQueryBuilder(
          "driver"
        )
          .select()
          .where("driver.callSign=:callSign AND driver.id != :driverId", {
            callSign: driver.callSign,
            driverId,
          })
          .getOne();
        if (existingDriver) {
          throw new ConflictException(ERROR_MESSAGE.DRIVER_CALLSIGN);
        }
      }

      const driverDocuments = driver.driverDocuments;
      const driverCapabilities = driver.capabilities;
      delete driver.driverDocuments;
      delete driver.capabilities;
      const partialDriverObject: Partial<Drivers> = {};
      for (const key in driver) {
        if (driver[key] !== undefined) {
          if (key == "email") {
            partialDriverObject[key] = driver[key]?.toLocaleLowerCase();
          } else {
            partialDriverObject[key] = driver[key];
          }
        }
      }
      let updateResult;
      // Update the driver entity
      if (Object.entries(partialDriverObject).length !== 0) {
        updateResult = await queryRunner.manager.update(
          Drivers,
          { id: driverId },
          partialDriverObject //driver object
        );
      }
      const user = await this.usersService.findUserByEmailWithoutFilter(
        oldDriver.email?.toLocaleLowerCase()
      );
      if (user) {
        await this.usersService.updateUser(userObject, user?.id);
      }
      // If the driver is not found, rollback the transaction and throw an error
      if (updateResult?.affected === 0) {
        await queryRunner.rollbackTransaction();
        throw new Error("Driver not found");
      }
      const currentDriver = await this.DriverRepository.findOne({
        where: { id: driverId },
        relations: ["documents", "capabilities"], // Load associated documents
      });
      // Update associated documents if provided
      if (driverDocuments && driverDocuments.length > 0) {
        const documents = await Promise.all(
          driverDocuments.map(async (documentId) => {
            // Fetch documents using DocumentService
            return await this.documentService.findDocumentById(documentId);
          })
        );
        // Get the current driver entity

        // Remove existing documents
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Drivers, "documents")
          .of(currentDriver)
          .remove(currentDriver.documents);

        // Add new documents
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Drivers, "documents")
          .of(currentDriver)
          .add(driverDocuments);

        // Commit the transaction
      }
      if (driverCapabilities && driverCapabilities.length > 0) {
        const capabilities =
          await this.capabilityService.findBulkCapabilitiesById(
            driverCapabilities
          );
        if (capabilities[0] !== null) {
          await queryRunner.manager
            .createQueryBuilder()
            .relation(Drivers, "capabilities")
            .of(currentDriver)
            .remove(currentDriver.capabilities);

          await queryRunner.manager
            .createQueryBuilder()
            .relation(Drivers, "capabilities")
            .of(currentDriver)
            .add(capabilities);
        }
      } else {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Drivers, "capabilities")
          .of(currentDriver)
          .remove(currentDriver.capabilities);
      }
      // Fetch and return the updated driver entity
      //   const updatedDriver = await this.DriverRepository.findOne({
      //     where: { id: driverId },
      //     relations: ["documents","capabilities"], // Load associated documents
      //   });
      const updatedDriver = await queryRunner.manager.findOne(Drivers, {
        where: { id: driverId },
        relations: ["capabilities", "documents"],
      });
      try {
        const userRecord = await firebase
          .auth()
          .getUserByPhoneNumber(driver?.mobile);
        // User already exists
        this.logger.info("User already exists:", userRecord.uid);
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          // User does not exist, create a new user
          try {
            const userRecord = await firebase.auth().createUser({
              phoneNumber: driver?.mobile,
            });
            this.logger.info("Successfully created new user:", userRecord.uid);
          } catch (createError) {
            this.logger.error("Error creating new user:", createError);
          }
        } else {
          this.logger.error("Error fetching user data:", error);
        }
      }
      await queryRunner.commitTransaction();
      this.logger.info("Service=>updateDriver=>Output: %o", updatedDriver);
      return updatedDriver;
    } catch (err) {
      // Rollback the transaction in case of any error
      await queryRunner.rollbackTransaction();

      this.logger.error("Service=>updateDriver=>Error: %o", err);
      if (
        err?.detail?.toString().includes("Key (email)=(") &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new Error(ERROR_MESSAGE.EMAIL_ALREADY_EXISTS);
      } else {
        throw new Error(err);
      }
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async updateDriverStatus(driver: UpdateDriverStatusDTO, driverId: string) {
    this.logger.info("Service=>updateDriverStatus=>Input: %o", driver);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const response = await queryRunner.manager.update(
        Drivers,
        { id: driverId },
        driver
      );
      if (response.affected === 0) {
        throw new Error("Driver not found");
      }
      const updatedDriver = await this.DriverRepository.findOne({
        where: { id: driverId },
      });
      await queryRunner.manager.update(
        Users,
        { email: updatedDriver?.email },
        { status: driver?.status }
      );
      // if (responseUser.affected === 0) {
      //   throw new Error("User not found");
      // }
      this.logger.info(
        "Service=>updateDriverStatus=>Output: %o",
        updatedDriver
      );
      return updatedDriver;
    } catch (err) {
      this.logger.error("Service=>updateDriverStatus=>Error: %o", err);
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteDriver(driverId: string) {
    this.logger.info("Service=>deleteDriver=>Input: %o", driverId);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const driver = await this.DriverRepository.findOne({
        where: {
          id: driverId,
        },
        relations: ["documents", "capabilities"],
      });
      if (driver === null) {
        throw new NotFoundException("User not found");
      }
      if (driver.capabilities && driver.capabilities.length > 0) {
        const capabilities = driver.capabilities.map(
          (capability) => capability.id
        );
        const driverCapabilitiesIds =
          await this.capabilityService.findBulkCapabilitiesById(capabilities);

        if (driverCapabilitiesIds && driverCapabilitiesIds.length > 0) {
          await queryRunner.manager
            .createQueryBuilder()
            .relation(Drivers, "capabilities")
            .of(driver)
            .remove(capabilities);
        }
      }
      const driverDeleted = await this.DriverRepository.delete(driverId);
      this.logger.info("Service=>deleteDriver=>Ouput: %o", driverDeleted);
      return "success";
    } catch (err) {
      this.logger.error("Service=>deleteDriver=>Error: %o", err);
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async findDrivers(options) {
    let skip = options?.limit ? (options.page - 1) * options.limit : undefined;
    let take = options.limit;
    let searchInput = options.search;
    let sortBy = options.sort;
    let filter = options.filter;

    let where: any = {};

    const orConditions = [];

    if (searchInput) {
      orConditions.push(
        { callSign: ILike(`%${searchInput}%`) },
        { firstName: ILike(`%${searchInput}%`) },
        { lastName: ILike(`%${searchInput}%`) },
        { badgeNumber: ILike(`%${searchInput}%`) },
        { mobile: ILike(`%${searchInput}%`) }
      );
    }

    if (orConditions.length > 0) {
      where = orConditions;
    }

    if (filter) {
      const allFilters = filter.split("&");
      for (const filterItem of allFilters) {
        const [key, value] = filterItem.split(":");
        where = { ...where, [key]: value };
      }
    }

    const order: any = {};
    if (sortBy) {
      // Assuming sort is in the format of "key:order"
      const allSorting = sortBy.split(",");
      for (const sortItem of allSorting) {
        const [key, orderDirection] = sortItem.split(":");
        order[key] = orderDirection.toUpperCase();
      }
    }
    try {
      this.logger.info(
        "service=>list=>Input: %o, %o, %o, %o",
        skip,
        take,
        where,
        order
      );

      const queryBuilder = this.DriverRepository.createQueryBuilder("driver")
        .where(where)
        .skip(skip) // Apply pagination here
        .take(take)
        .orderBy(
          `LENGTH(driver.callSign) - LENGTH(TRIM(BOTH '*' FROM driver.callSign))`,
          "DESC"
        )
        .addOrderBy(
          `CAST(REGEXP_REPLACE(driver.callSign, '^[*]+', '') AS INTEGER)`,
          "ASC"
        );

      // COUNT
      const queryBuilderCount = this.DriverRepository.createQueryBuilder(
        "driver"
      )
        .where(where)
        .orderBy(
          `LENGTH(driver.callSign) - LENGTH(TRIM(BOTH '*' FROM driver.callSign))`,
          "DESC"
        )
        .addOrderBy(
          `CAST(REGEXP_REPLACE("callSign", '^[*]+', '') AS INTEGER)`,
          "DESC"
        );

      let list = await queryBuilder.getRawMany();
      let count = await queryBuilderCount.getCount();

      const rows = await Promise.all(
        list.map(async (item) => {
          const formattedItem: any = {};

          // Iterate over each key in the raw result
          for (const key in item) {
            if (item.hasOwnProperty(key)) {
              // Split the key into parts (e.g., "driver_firstName" -> ["driver", "firstName"])
              const [prefix, ...rest] = key.split("_");

              // Special case: don't nest "driver", keep at root level
              if (prefix === "driver") {
                formattedItem[rest.join("_")] = item[key];
              } else {
                formattedItem[prefix] = item[key];
              }
            }
          }

          // Fetch capabilities for the current driver using a repository method
          const capabilities = await this.capabilityRepository
            .createQueryBuilder("capability")
            .leftJoin("capability.drivers", "driver")
            .where("driver.id = :driverId", { driverId: item.driver_id })
            .getMany();

          // Assign the fetched capabilities to the driver object
          formattedItem.capabilities = capabilities;

          return formattedItem;
        })
      );
      const result = { rows: rows, count: count };
      this.logger.info("service=>list=>Output: %o", result);
      return result;
    } catch (err) {
      this.logger.error("service=>list=>Error: %o", "internal server error");
      throw new Error(err.message);
    }
  }

  async findDriverById(id: string) {
    this.logger.info("Service=>findDriverById=>Input: %o", id);
    try {
      const driver = await this.DriverRepository.createQueryBuilder("driver")
        .leftJoinAndSelect("driver.documents", "documents")
        .leftJoinAndSelect("driver.capabilities", "capabilities")
        .where("driver.id = :id", { id })
        .orderBy("documents.createdAt", "ASC")
        .getOne();

      this.logger.info("Service=>findDriverById=>Output: %o", driver);
      if (driver) {
        return driver;
      } else {
        this.logger.error(
          "Service=>findDriverById=>Error: %o",
          "driver does not exist"
        );
        throw new Error("driver does not exist");
      }
    } catch (err) {
      this.logger.error("Service=>findDriverById=>Error: %o", err);
      throw new Error(err.message);
    }
  }

  async getDriversWithoutSpecificRideStatuses() {
    // Define the statuses to exclude
    const excludedStatuses = [
      RIDE_STATUS.DISPATCHED,
      RIDE_STATUS.ACCEPTED,
      RIDE_STATUS.ARRIVED,
      RIDE_STATUS.PICKEDUP,
      RIDE_STATUS.DROPOFF,
    ];

    // .where("driver.online = :online", { online: true }) // Filter for drivers where online is true

    // Fetch drivers who do not have any rides with the excluded statuses
    // const drivers=[];
    const drivers = await this.DriverRepository.createQueryBuilder("driver")
      .where("driver.online = :online", { online: true })
      // .getMany()

      .innerJoinAndSelect("driver.vehicle", "vehicle")
      .leftJoinAndSelect("vehicle.capabilities", "vehicleCapabilities") // Join with Vehicle entity and use inner join
      .leftJoinAndSelect("driver.rides", "ride")
      .leftJoinAndSelect("driver.capabilities", "capability")
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("ride.driverId")
          .from(Rides, "ride")
          .where("ride.status IN (:...statuses)", {
            statuses: excludedStatuses,
          })
          .andWhere("ride.driverId IS NOT NULL")
          .getQuery();
        return "driver.id NOT IN " + subQuery;
      })
      .orWhere(
        new Brackets((qb) => {
          qb.where("ride.id IS NULL").andWhere("driver.online = :online", {
            online: true,
          });
        })
      ) // Include drivers with no rides
      .getMany();

    // Map the result to the DriverInfoDto
    const driversUpdated = [];
    for (const driver of drivers) {
      const driverCapabilityShortCodes = driver?.capabilities?.map(
        (capability) => capability.shortCode
      );
      const vehicleCapabilityShortCodes = driver?.vehicle?.capabilities?.map(
        (capability) => capability.shortCode
      );

      const lastRideStatuses = [
        RIDE_STATUS.CANCELLED,
        RIDE_STATUS.NO_FARE,
        RIDE_STATUS.COMPLETED,
      ];

      const driverRides = driver?.rides?.filter((ride) =>
        lastRideStatuses.includes(ride?.status as RIDE_STATUS)
      );

      const lastRide = driverRides?.sort(
        (a, b) => b?.createdAt?.getTime() - a?.createdAt?.getTime()
      )[0];

      const workingHours =
        await this.DriverWorkingHourRepository.createQueryBuilder(
          "workingHours"
        )
          .where("workingHours.driverId = :driverId", { driverId: driver?.id })
          .orderBy("workingHours.createdAt", "DESC")
          .getOne();

      const lastOnlineTime = workingHours?.createdAt;

      let timeToCheck;
      if (lastRide && lastRide?.endTime) {
        if (lastOnlineTime) {
          if (moment(lastRide?.endTime)?.isAfter(lastOnlineTime)) {
            timeToCheck = lastRide?.endTime;
          } else {
            timeToCheck = lastOnlineTime;
          }
        } else {
          timeToCheck = lastRide?.endTime;
        }
      } else if (lastOnlineTime) {
        timeToCheck = lastOnlineTime;
      }

      const timeSinceLastRide = timeToCheck
        ? this.getTimeSince(timeToCheck)
        : 0 + "s";
      let zone;
      if (driver?.zone) {
        zone = await this.zoneRepository.findOne({
          where: { id: driver?.zone },
        });
      }

      driversUpdated.push({
        vehicleId: driver?.vehicle?.id,
        driverId: driver?.id,
        online: driver?.online,
        callSign: driver?.vehicle?.callSign,
        driverCapabilityShortCodes,
        vehicleCapabilityShortCodes,
        longitude: driver?.longitude,
        latitude: driver?.latitude,
        isNoFareRide: lastRide?.status === RIDE_STATUS.NO_FARE ? true : false,
        zone: zone?.name || DEFAULT_ZONE_NAME,
        timeSinceLastRide,
      });
    }
    // Sort in ascending order based on timeSinceLastRide
    driversUpdated.sort((a, b) => {
      // A
      const timePartsA = a?.timeSinceLastRide?.split(" ");
      let secondsA = 0;

      if (timePartsA) {
        timePartsA.forEach((part) => {
          if (part.endsWith("h")) {
            secondsA += parseInt(part) * 3600; // Convert hours to seconds
          } else if (part.endsWith("m")) {
            secondsA += parseInt(part) * 60; // Convert minutes to seconds
          } else if (part.endsWith("s")) {
            secondsA += parseInt(part); // Seconds
          }
        });
      }

      // B
      const timePartsB = b?.timeSinceLastRide?.split(" ");
      let secondsB = 0;

      if (timePartsB) {
        timePartsB.forEach((part) => {
          if (part.endsWith("h")) {
            secondsB += parseInt(part) * 3600; // Convert hours to seconds
          } else if (part.endsWith("m")) {
            secondsB += parseInt(part) * 60; // Convert minutes to seconds
          } else if (part.endsWith("s")) {
            secondsB += parseInt(part); // Seconds
          }
        });
      }

      return secondsA - secondsB;
    });

    return driversUpdated;
  }

  // Helper method to calculate time since the last ride
  private getTimeSince(date: Date): string {
    const now = moment().utc();
    const diffMs = now.valueOf() - date.getTime(); // getTime() returns milliseconds
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffSeconds < 60) {
      return `${diffSeconds}s`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    } else if (diffMinutes >= 60 && diffHours < 24) {
      const remainingMinutes = diffMinutes % 60;
      return `${diffHours}h ${remainingMinutes}m ${diffSeconds % 60}s`;
    } else {
      return `${diffDays}d ${diffHours % 24}h`;
    }
  }

  isPolygon(geometry: Geometry): geometry is GeoJSONPolygon {
    return geometry.type === "Polygon";
  }

  async viewDriverZones(user: DriverUserDTO, query: FindAllQueryDto) {
    try {
      this.logger.info("Service=>viewDriverZones=>Input: %o, %o", user, query);
      let skip = query?.limit ? (query.page - 1) * query.limit : 0;
      let take = query.limit || 10;

      const driver = await this.findDriverByEmail(user.email);

      const { rows: zones, count } = await this.zoneService.findNearestZones({
        lat: driver?.latitude,
        lng: driver?.longitude,
        limit: take,
        offset: skip,
      });
      if (zones?.length < 1) {
        return { rows: [], count };
      }
      const zoneIds = zones.map((el) => el?.zone_id);
      const vehicle = await this.vehicleRepository.findOne({
        where: { id: driver.currentVehicleId },
        relations: { capabilities: true },
      });

      let capabilities = [];
      let allowedCapabilities = [];

      driver?.capabilities?.forEach((capability) => {
        if (capability.visibleToDrivers) {
          allowedCapabilities.push(capability.id);
        } else {
          capabilities.push(capability.id);
        }
      });
      vehicle?.capabilities?.forEach((capability) => {
        if (capability.visibleToDrivers) {
          allowedCapabilities.push(capability.id);
        } else {
          capabilities.push(capability.id);
        }
      });

      const resultZones = [];

      let qbActiveRidesThirty = this.rideRepository
        .createQueryBuilder("ride")
        .where("ride.pickupZoneId IN (:...zoneIds)", { zoneIds: zoneIds })
        .andWhere("ride.paymentStatus = :paymentStatus", {
          paymentStatus: RIDE_PAYMENT_STATUS.PAID,
        })
        .andWhere(`ride."dispatchDueTime" > NOW()`) // `dispatchedDueTime` should be after the current time
        .andWhere(`ride."dispatchDueTime" <= NOW() + INTERVAL '30 minutes'`) // `dispatchedDueTime` should be within the next 30 minutes
        .andWhere("ride.status IN (:...statuses)", {
          // statuses: ["ACCEPTED", "ARRIVED", "DROPOFF", "PICKEDUP"],
          statuses: ["PENDING", "HELD"],
        });

      let qbActiveRidesSixty = this.rideRepository
        .createQueryBuilder("ride")
        .where("ride.pickupZoneId IN (:...zoneIds)", { zoneIds: zoneIds })
        .andWhere("ride.paymentStatus = :paymentStatus", {
          paymentStatus: RIDE_PAYMENT_STATUS.PAID,
        })
        .andWhere(`ride."dispatchDueTime" > NOW()`) // `dispatchedDueTime` should be after the current time
        .andWhere(`ride."dispatchDueTime" > NOW() + INTERVAL \'30 minutes\'`) // `dispatchedDueTime` should be more than 30 minutes from now
        .andWhere(`ride."dispatchDueTime" <= NOW() + INTERVAL \'60 minutes\'`)
        .andWhere("ride.status IN (:...statuses)", {
          // statuses: ["ACCEPTED", "ARRIVED", "DROPOFF", "PICKEDUP"],
          statuses: ["PENDING", "HELD"],
        });

      if (allowedCapabilities.length > 0) {
        qbActiveRidesSixty.andWhere(
          "(ride.capabilityId IN (:...allowedCapabilities) OR ride.capabilityId IS NULL)",
          {
            allowedCapabilities,
          }
        );
        qbActiveRidesThirty.andWhere(
          "(ride.capabilityId IN (:...allowedCapabilities) OR ride.capabilityId IS NULL)",
          {
            allowedCapabilities,
          }
        );
      } else if (capabilities.length > 0) {
        qbActiveRidesSixty.andWhere(
          "(ride.capabilityId IN (:...capabilities) OR ride.capabilityId IS NULL)",
          {
            capabilities,
          }
        );
        qbActiveRidesThirty.andWhere(
          "(ride.capabilityId IN (:...capabilities) OR ride.capabilityId IS NULL)",
          {
            capabilities,
          }
        );
      }

      const allActiveVehicles = await this.DriverRepository.createQueryBuilder(
        "driver"
      )
        .where("driver.zone IN (:...zoneIds)", { zoneIds: zoneIds })
        .andWhere("driver.online = :online", { online: true })
        .getMany();

      const activeRidesThirty = await qbActiveRidesThirty.getMany();
      const activeRidesSixty = await qbActiveRidesSixty.getMany();

      for (const zone of zones) {
        const activeVehicle = allActiveVehicles.filter(
          (el) => el?.zone == zone.zone_id
        );

        const rideInthisZoneDueThirty = activeRidesThirty.filter(
          (el) => el.pickupZoneId == zone.zone_id
        );
        const rideInthisZoneDueSixty = activeRidesSixty.filter(
          (el) => el.pickupZoneId == zone.zone_id
        );

        if (driver.zone !== zone.zone_id) {
          const data = {
            zoneId: zone.zone_id,
            name: zone.zone_name,
            distance: zone.distance,
            dispatchDueThirtyMins: rideInthisZoneDueThirty.length,
            dispatchDueSixtyMins: rideInthisZoneDueSixty.length,
            numberOfActiveVehicles: activeVehicle.length,
            numberOfJobs: 0,
          };
          resultZones.push(data);
        } else {
          const data = {
            zoneId: zone.zone_id,
            name: zone.zone_name,
            distance: 0,
            dispatchDueThirtyMins: rideInthisZoneDueThirty.length,
            dispatchDueSixtyMins: rideInthisZoneDueSixty.length,
            numberOfActiveVehicles: activeVehicle.length,
            numberOfJobs: 0,
          };
          resultZones.push(data);
        }
      }
      return { rows: resultZones, count };
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  // async getDriverWorkingHours(
  //   driverId: string,
  //   startDate: string,
  //   endDate: string | null
  // ) {
  //   try {
  //     const workingHours =
  //       await this.DriverWorkingHourRepository.createQueryBuilder(
  //         "workingHours"
  //       )
  //         .where("workingHours.driverId = :driverId", { driverId })
  //         .andWhere("workingHours.createdAt >= :startDate", { startDate })
  //         .andWhere("workingHours.createdAt <= :endDate", {
  //           endDate: endDate || new Date().toISOString(),
  //         })
  //         .orderBy("workingHours.createdAt", "ASC")
  //         .getMany();

  //     let totalOnlineTime = 0;
  //     let previousTimestamp: number | null = null;
  //     let previousStatus: string | null = null;

  //     workingHours.forEach((entry) => {
  //       const currentTimestamp = new Date(entry.createdAt).getTime();
  //       if (
  //         previousStatus === "ONLINE" &&
  //         entry.status === "OFFLINE" &&
  //         previousTimestamp !== null
  //       ) {
  //         const timeDiff = currentTimestamp - previousTimestamp;
  //         totalOnlineTime += timeDiff;
  //       }

  //       previousTimestamp = currentTimestamp;
  //       previousStatus = entry.status;
  //     });

  //     // If the last status was ONLINE and the driver hasn't gone OFFLINE, calculate time until the endDate or end of the current day
  //     if (previousStatus === "ONLINE" && previousTimestamp !== null) {
  //       const endTimestamp = endDate
  //         ? new Date(endDate).getTime()
  //         : new Date(new Date(startDate).toUTCString() + " 23:59:59").getTime(); // End of the day for the given startDate

  //       const timeDiff = endTimestamp - previousTimestamp;
  //       totalOnlineTime += timeDiff;
  //     }
  //     const totalOnlineTimeInHours = totalOnlineTime / 3600000;

  //     return {
  //       driverId,
  //       onlineTime: totalOnlineTimeInHours || "0",
  //     };
  //   } catch (error) {
  //     console.error(`Error fetching driver working hours: ${error.message}`);
  //     throw new Error(`Error fetching driver working hours: ${error.message}`);
  //   }
  // }

  async getDriverWorkingHours(
    driverId: string, // Driver ID to fetch working hours for
    startDate: string, // Start date for the working hours query
    endDate: string | null // End date (optional); if not provided, it will default to the current date
  ) {
    try {
      // Fetching the driver's working hours records from the database using TypeORM query builder
      const workingHours =
        await this.DriverWorkingHourRepository.createQueryBuilder(
          "workingHours"
        )
          .where("workingHours.driverId = :driverId", { driverId }) // Filter by driverId
          .andWhere("workingHours.createdAt >= :startDate", { startDate }) // Filter for records after or on the start date
          .andWhere("workingHours.createdAt <= :endDate", {
            endDate: endDate || new Date().toISOString(),
          }) // Filter for records before or on the end date (or current date if end date is null)
          .orderBy("workingHours.createdAt", "ASC") // Sort the records in ascending order of createdAt
          .getMany(); // Retrieve all matching records

      let totalOnlineTime = 0; // Variable to store total time spent online
      let previousTimestamp: number | null = null; // Variable to store the timestamp of the previous entry
      let previousStatus: string | null = null; // Variable to store the status of the previous entry

      if (workingHours[workingHours.length - 1].status == "ONLINE") {
        const nextDayStart = new Date(
          new Date(startDate).getTime() + 24 * 60 * 60 * 1000
        ); // Start of next day
        nextDayStart.setUTCHours(0, 0, 0, 0);
        const nextDayEnd = new Date(
          nextDayStart.getTime() + 24 * 60 * 60 * 1000
        ); // End of next day
        nextDayEnd.setUTCHours(23, 59, 59, 999);

        const workingHoursNextDay =
          await this.DriverWorkingHourRepository.createQueryBuilder(
            "workingHours"
          )
            .where("workingHours.driverId = :driverId", { driverId }) // Filter by driverId
            .andWhere("workingHours.createdAt >= :nextDayStart", {
              nextDayStart,
            }) // Filter for records after or on the start date
            .andWhere("workingHours.createdAt <= :nextDayEnd", {
              nextDayEnd: nextDayEnd || new Date().toISOString(),
            }) // Filter for records before or on the end date (or current date if end date is null)
            .orderBy("workingHours.createdAt", "ASC") // Sort the records in ascending order of createdAt
            .getOne(); // Retrieve all matching records

        if (workingHoursNextDay) {
          workingHours.push(workingHoursNextDay);
        }
      }
      // Loop through each entry in the working hours data
      workingHours.forEach((entry) => {
        const currentTimestamp = new Date(entry.createdAt).getTime(); // Convert createdAt to a timestamp (in milliseconds)

        // Check if the previous status was "ONLINE" and the current one is "OFFLINE" to calculate online duration
        if (
          previousStatus === "ONLINE" && // Previous status must be ONLINE
          entry.status === "OFFLINE" && // Current status must be OFFLINE
          previousTimestamp !== null // Ensure the previous timestamp exists
        ) {
          const timeDiff = currentTimestamp - previousTimestamp; // Calculate time difference between ONLINE and OFFLINE status
          totalOnlineTime += timeDiff; // Add the time difference to total online time
        }

        // Update the previous timestamp and status for the next iteration
        previousTimestamp = currentTimestamp;
        previousStatus = entry.status;
      });

      // If the last known status is "ONLINE" and the driver hasn't gone "OFFLINE" yet, calculate time until the end date or end of the current day
      if (previousStatus === "ONLINE" && previousTimestamp !== null) {
        const endTimestamp = endDate // If endDate is provided, use it
          ? new Date(endDate).getTime()
          : new Date(new Date(startDate).toUTCString() + " 23:59:59").getTime(); // Otherwise, use the end of the day for the startDate

        const timeDiff = endTimestamp - previousTimestamp; // Calculate the remaining online time from the last ONLINE status to the end timestamp
        totalOnlineTime += timeDiff; // Add the remaining online time to the total
      }

      // Convert total online time from milliseconds to hours
      const totalOnlineTimeInHours = totalOnlineTime / 3600000;

      // Return the driver ID and the calculated online time in hours (or 0 if none found)
      return {
        driverId,
        onlineTime: totalOnlineTimeInHours || "0", // If no time was calculated, return "0"
      };
    } catch (error) {
      // Log any errors that occur during execution
      this.logger.error(
        `Error fetching driver working hours: ${error.message}`
      );
      throw new Error(`Error fetching driver working hours: ${error.message}`);
    }
  }

  async driverOnlineUpdate(authorizationHeader, isDriverOnline) {
    try {
      const token = authorizationHeader.split(" ")[1]; // Assuming "Bearer <token>"
      // Verify and decode the JWT token
      const decoded: any = jwt.decode(token);
      const driver = await this.findDriverByEmail(decoded?.email);
      const result = await this.changeOnlineStatus(driver, isDriverOnline);
      return result;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async driverOnlineUpdateByCallSign(
    callSign: string,
    isDriverOnline: boolean
  ) {
    try {
      this.logger.error("Service=>driverOnlineUpdateByCallSign=>Input: %o", {
        callSign,
        isDriverOnline,
      });
      const vehicle = await this.vehicleRepository.findOne({
        where: { callSign: callSign },
      });
      if (vehicle?.id) {
        const driver = await this.DriverRepository.findOne({
          where: { currentVehicleId: vehicle?.id },
        });
        const result = await this.changeOnlineStatus(driver, isDriverOnline);
        this.logger.error(
          "Service=>driverOnlineUpdateByCallSign=>Output: %o",
          result
        );
        return result;
      } else {
        throw new BadRequestException(ERROR_MESSAGE.NO_VEHICLE_WITH_CALLSIGN);
      }
    } catch (err) {
      this.logger.error(
        "Service=>driverOnlineUpdateByCallSign=>Error: %o",
        err
      );
      throw err;
    }
  }

  async changeOnlineStatus(driver: Drivers, isDriverOnline) {
    try {
      if (driver?.id) {
        const updated = await this.DriverRepository.update(
          { id: driver.id },
          {
            online: isDriverOnline,
            // Don change if online but change to null if offline
            currentVehicleId:
              isDriverOnline ||
              driver?.driverType == DriverTypeEnum.SELF_EMPLOYED
                ? undefined
                : null,
          }
        );

        const status = isDriverOnline
          ? DriverStatus.ONLINE
          : DriverStatus.OFFLINE;

        // Save new working hour entry with the driverId and status
        await this.DriverWorkingHourRepository.save({
          driver: { id: driver?.id }, // Pass only the driver ID
          status: status, // Set status as ONLINE or OFFLINE
        });

        if (updated.affected > 0) {
          return "success";
        } else {
          throw new BadRequestException(ERROR_MESSAGE.DRIVER_NOT_FOUND);
        }
      }
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async findDriverByEmail(email) {
    try {
      const driver = await this.DriverRepository.findOneOrFail({
        where: { email },
        relations: { capabilities: true },
      });
      if (!driver) {
        throw new NotFoundException(ERROR_MESSAGE.DRIVER_NOT_FOUND);
      }
      return driver;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async findDriverByVehicleId(vehicleId: string) {
    try {
      const driver = await this.DriverRepository.findOne({
        where: { currentVehicleId: vehicleId },
      });
      if (!driver) {
        throw new NotFoundException(ERROR_MESSAGE.DRIVER_NOT_FOUND);
      }
      return driver;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async setCurrentVehicle(authorizationHeader, registration) {
    try {
      const token = authorizationHeader.split(" ")[1]; // Assuming "Bearer <token>"
      // Verify and decode the JWT token
      const decoded: any = jwt.decode(token);
      const user = await this.usersService.findUserByEmail(decoded.email);
      if (user) {
        const driver = await this.DriverRepository.findOne({
          where: { email: user.email },
        });
        const vehicle = await this.vehicleRepository.findOne({
          where: { registration: ILike(registration) },
        });
        if (vehicle) {
          const vehicleAssociation = await this.DriverRepository.findOne({
            where: { currentVehicleId: vehicle.id },
          });
          if (vehicle?.insuranceExpires) {
            const date = new Date(vehicle?.insuranceExpires);
            const insuranceExpired = this.utilsService.checkExpireyDate(date);
            if (insuranceExpired) {
              throw new UnauthorizedException(ERROR_MESSAGE.INSURANCE_EXPIRED);
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
              throw new UnauthorizedException(ERROR_MESSAGE.PLATE_EXPIRED);
            }
          }
          if (vehicle?.roadtaxExpires) {
            const date = new Date(vehicle?.roadtaxExpires);
            const roadtaxExpired = this.utilsService.checkExpireyDate(date);
            if (roadtaxExpired) {
              throw new UnauthorizedException(ERROR_MESSAGE.ROAD_TAX_EXPIRED);
            }
          }
          if (
            (vehicleAssociation && vehicleAssociation.id !== driver.id) ||
            (vehicle.driverId && vehicle.driverId !== driver.id)
          ) {
            throw new ConflictException(
              ERROR_MESSAGE.VEHICLE_ASSOCIATED_DRIVER
            );
          }
          if (driver) {
            const updated = await this.DriverRepository.update(
              { id: driver.id },
              { currentVehicleId: vehicle.id }
            );
            if (updated.affected == 0) {
              throw new BadRequestException();
            }
            return "success";
          } else {
            throw new NotFoundException(ERROR_MESSAGE.DRIVER_NOT_FOUND);
          }
        } else {
          throw new NotFoundException(ERROR_MESSAGE.VEHICLE_NOT_FOUND);
        }
      } else {
        throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
      }
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async setLocation(id: string, data: LocationDTO) {
    try {
      let rideId = data.rideId ? data.rideId : null;
      delete data.rideId;
      const userExist = await this.usersRepository.findOne({
        where: { id, role: Role.DRIVER },
      });
      if (userExist) {
        const driverExist = await this.usersRepository.findOne({
          where: { email: userExist.email },
        });
        if (driverExist) {
          const zone = await this.zoneService.findZoneContainingPoint({
            type: "Point",
            coordinates: [data.longitude, data.latitude],
          });
          if (zone) {
            data.zone = zone?.id;
          } else {
            data.zone = null;
          }
          const driver = await this.DriverRepository.update(
            { email: userExist?.email },
            data
          );
          if (driver.affected > 0) {
            if (rideId) {
              const ride = await this.rideRepository.findOne({
                where: { id: rideId },
              });
              if (ride) {
                const rideLocationHistoryObject = new RideLocationHistory();
                rideLocationHistoryObject.longitude = data.longitude;
                rideLocationHistoryObject.latitude = data.latitude;
                rideLocationHistoryObject.ride = ride;
                rideLocationHistoryObject.rideStatus = ride.status;
                const rideLocationHistory =
                  await this.rideLocationHistoryRepository.save(
                    rideLocationHistoryObject
                  );
              }
            }
            const updatedDriver = await this.DriverRepository.findOne({
              where: { email: userExist.email },
            });
            return updatedDriver;
          } else {
            throw new BadRequestException();
          }
        } else {
          this.logger.error(ERROR_MESSAGE.SET_LOCATION_FAILED);
          throw new BadRequestException(ERROR_MESSAGE.SET_LOCATION_FAILED);
        }
      } else {
        this.logger.error(ERROR_MESSAGE.DRIVER_NOT_FOUND);
        throw new NotFoundException(ERROR_MESSAGE.DRIVER_NOT_FOUND);
      }
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async initialAPI(user: DriverUserDTO) {
    if (user?.email) {
      const driver = await this.DriverRepository.findOne({
        where: { email: user.email },
      });
      if (driver?.id) {
        try {
          const rides = await this.rideRepository
            .createQueryBuilder("ride")
            .where("ride.driverId = :id", { id: driver.id })
            .andWhere(
              "(ride.status=:dispatched OR ride.status=:accepted OR ride.status=:arrived OR ride.status=:pickedUp OR ride.status=:dropOff)",
              {
                dispatched: RIDE_STATUS.DISPATCHED,
                accepted: RIDE_STATUS.ACCEPTED,
                arrived: RIDE_STATUS.ARRIVED,
                pickedUp: RIDE_STATUS.PICKEDUP,
                dropOff: RIDE_STATUS.DROPOFF,
              }
            )
            .getOne();
          const fobRide = await this.rideRepository
            .createQueryBuilder("ride")
            .where("ride.driverId = :id", { id: driver.id })
            .andWhere("(ride.status=:dispatched)", {
              dispatched: RIDE_STATUS.FOB_DISPATCHED,
            })
            .getOne();
          return {
            rideId: rides?.id,
            fobRideId: fobRide?.id,
            status: driver?.online,
            type: driver?.driverType,
          };
        } catch (err) {
          this.logger.error(err);
          throw err;
        }
      }
    }
  }

  async getActiveDriversWithVehicleAndRideStatus(): Promise<any> {
    const activeDrivers = await this.DriverRepository.createQueryBuilder(
      "driver"
    )
      .leftJoinAndSelect(
        "driver.rides",
        "ride",
        "ride.status NOT IN (:...fobStatuses)",
        {
          fobStatuses: [
            RIDE_STATUS.FOB_REQUESTED,
            RIDE_STATUS.FOB_DISPATCHED,
            RIDE_STATUS.FOB_ACCEPTED,
            RIDE_STATUS.FOB_REJECTED,
            RIDE_STATUS.FOB_OVERRIDE_REQUESTED,
            RIDE_STATUS.FOB_OVERRIDE_DISPATCHED,
            RIDE_STATUS.FOB_OVERRIDE_REJECTED,
          ],
        }
      ) // Exclude all FOB statuses in the join condition
      .leftJoinAndSelect("driver.vehicle", "vehicle")
      .where("driver.status = :driverStatus", { driverStatus: STATUS.ACTIVE })
      .orderBy("ride.dispatchDueTime", "DESC")
      .getMany();

    // Filter and log online and active drivers
    const onlineActiveDrivers: any = activeDrivers.filter(
      (driver) => driver.online
    );

    const driversWithNoRides = [];
    const driversWithDispatchedRides = [];
    const driversWithAcceptedRides = [];
    const allDriversWithStatus = [];
    const driversWithArrivedRides = [];
    const driversWithBusyPassenger = [];
    const driversWithNoFareRides = [];
    const soonToBeClearedDrivers = [];
    const kmToMiles = (km) => km * 0.621371;

    for (const driver of onlineActiveDrivers) {
      let mapStatus = "clear";
      if (driver.rides.length === 0) {
        driversWithNoRides.push({ ...driver, mapStatus });
      } else {
        let statusSet = false;
        // Sort rides based on createdAt date in descending order
        const sortedRides = driver.rides.sort(
          (a, b) => b.dispatchDueTime.getTime() - a.dispatchDueTime.getTime()
        );

        // Optional: Log sorted rides for debugging

        const ridesToCheck = [sortedRides[0]];

        for (const ride of ridesToCheck) {
          if (
            ride.status === RIDE_STATUS.PICKEDUP &&
            driver.latitude !== null &&
            driver.longitude !== null
          ) {
            const destination = `${ride.toLatitude},${ride.toLongitude}`;
            const origin = `${driver.latitude},${driver.longitude}`;
            const { routeDistance } =
              await this.tarrifsService.getDistanceAndTime(origin, destination);

            // Convert routeDistance from meters to kilometers
            const routeDistanceKm = routeDistance.value / 1000;

            // Convert kilometers to miles
            const routeDistanceMiles = kmToMiles(routeDistanceKm);
            if (routeDistanceMiles <= 0.3) {
              // 0.3 miles in miles
              mapStatus = "Soon_To_Be_Cleared";
              soonToBeClearedDrivers.push({ ...driver, mapStatus });
              statusSet = true;
              break;
            } else {
              mapStatus = "BUSY_PASSENGER";
              driversWithBusyPassenger.push({ ...driver, mapStatus });
              statusSet = true;
              // break;
            }
          } else if (ride.status === RIDE_STATUS.DISPATCHED) {
            mapStatus = "Clear_Dispatching";
            driversWithDispatchedRides.push({ ...driver, mapStatus });
            statusSet = true;
            // break;
          } else if (ride.status === RIDE_STATUS.ACCEPTED) {
            mapStatus = "ACCEPTED";
            driversWithAcceptedRides.push({ ...driver, mapStatus });
            statusSet = true;
            // break;
          } else if (ride.status === RIDE_STATUS.ARRIVED) {
            mapStatus = "ARRIVED";
            driversWithArrivedRides.push({ ...driver, mapStatus });
            statusSet = true;
            // break;
          } else if (ride.status === RIDE_STATUS.NO_FARE) {
            mapStatus = "NO_FARE";
            driversWithNoFareRides.push({ ...driver, mapStatus });
            statusSet = true;
            // break;
          }

          driversWithNoRides.push({ ...driver, mapStatus });
        }
      }

      allDriversWithStatus.push({ ...driver, mapStatus });
    }

    // Combine results
    const result = {
      driversWithNoRides,
      driversWithDispatchedRides,
      driversWithAcceptedRides,
      driversWithArrivedRides,
      driversWithNoFareRides,
      soonToBeClearedDrivers,
      driversWithBusyPassenger,
    };

    return result;
  }

  async countRidesByStatus(): Promise<any> {
    // Step 1: Find online and active drivers
    const onlineDrivers = await this.DriverRepository.find({
      where: { online: true, status: STATUS.ACTIVE },
      relations: ["vehicle"],
    });
    const excludedStatuses = [
      RIDE_STATUS.DISPATCHED,
      RIDE_STATUS.ACCEPTED,
      RIDE_STATUS.ARRIVED,
      RIDE_STATUS.PICKEDUP,
      RIDE_STATUS.DROPOFF,
    ];

    // Initialize counts
    let active = 0;
    let clear = 0;
    let busy = 0;
    let pickedUp = 0;
    let soonToClear = 0;

    // Step 2: Track which drivers meet the criteria

    const driverIdsWithBusy = new Set<string>();
    const driverIdsWithPickedUp = new Set<string>();
    const driverIdsWithSoonToClear = new Set<string>();

    // Helper function to calculate distance
    const kmToMiles = (km) => km * 0.621371;
    const calculateDistanceMiles = async (
      origin: string,
      destination: string
    ) => {
      const { routeDistance } = await this.tarrifsService.getDistanceAndTime(
        origin,
        destination
      );
      const routeDistanceKm = routeDistance.value / 1000;
      return kmToMiles(routeDistanceKm);
    };
    const nowUTCFormatted = getCurrentUTCFormatted();
    // Count active rides with payment status PAID and ride status PENDING or HELD
    const activeCount = await this.rideRepository
      .createQueryBuilder("ride")
      .andWhere("ride.paymentStatus = :paymentStatus", {
        paymentStatus: RIDE_PAYMENT_STATUS.PAID,
      })
      .andWhere("ride.status IN (:...statuses)", {
        statuses: [
          RIDE_STATUS.PENDING,
          RIDE_STATUS.HELD,
          RIDE_STATUS.RECOVER,
          RIDE_STATUS.REJECTED,
          RIDE_STATUS.REQUESTED,
        ],
      })
      // .andWhere("ride.dispatchDueTime > NOW()");
      .andWhere("ride.dispatchDueTime <= :nowUTC", {
        nowUTC: nowUTCFormatted,
      })
      .getCount();

    active = activeCount;

    const clearCount = await this.DriverRepository.createQueryBuilder("driver")
      .where("driver.online = :online", { online: true })

      .innerJoinAndSelect("driver.vehicle", "vehicle")
      .leftJoinAndSelect("vehicle.capabilities", "vehicleCapabilities") // Join with Vehicle entity and use inner join
      .leftJoinAndSelect("driver.rides", "ride")
      .leftJoinAndSelect("driver.capabilities", "capability")
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("ride.driverId")
          .from(Rides, "ride")
          .where("ride.status IN (:...statuses)", {
            statuses: excludedStatuses,
          })
          .andWhere("ride.driverId IS NOT NULL")
          .getQuery();
        return "driver.id NOT IN " + subQuery;
      })
      .orWhere(
        new Brackets((qb) => {
          qb.where("ride.id IS NULL").andWhere("driver.online = :online", {
            online: true,
          });
        })
      ) // Include drivers with no rides
      .getCount();

    clear = clearCount;
    // Step 3: Check each driver's vehicle and count based on criteria
    for (const driver of onlineDrivers) {
      if (driver.vehicle) {
        // Count rides with status ACCEPTED
        const busyCount = await this.rideRepository.count({
          where: {
            vehicleId: driver.vehicle.id,
            // status: RIDE_STATUS.ACCEPTED,
            status: In([
              RIDE_STATUS.DISPATCHED,
              RIDE_STATUS.ACCEPTED,
              RIDE_STATUS.ARRIVED,
            ]),
          },
        });

        // Count rides with status PICKEDUP
        const pickedUpCount = await this.rideRepository.count({
          where: {
            vehicleId: driver.vehicle.id,
            status: RIDE_STATUS.PICKEDUP,
          },
        });

        if (busyCount > 0) {
          driverIdsWithBusy.add(driver.id);
        }
        if (pickedUpCount > 0) {
          driverIdsWithPickedUp.add(driver.id);
        }

        // Calculate soonToClear count
        const ridesWithPickedUp = await this.rideRepository.find({
          where: {
            vehicleId: driver.vehicle.id,
            status: RIDE_STATUS.PICKEDUP,
          },
        });

        for (const ride of ridesWithPickedUp) {
          if (driver.latitude !== null && driver.longitude !== null) {
            const destination = `${ride.toLatitude},${ride.toLongitude}`;
            const origin = `${driver.latitude},${driver.longitude}`;
            try {
              const distanceMiles = await calculateDistanceMiles(
                origin,
                destination
              );

              if (distanceMiles <= 0.3) {
                driverIdsWithSoonToClear.add(driver.id);
              }
            } catch (error) {
              this.logger.error("no location found", driver.id, ride.id);
            }
          }
        }
      }
    }

    // Calculate warnings, busy, pickedUp, and soonToClear counts

    busy = driverIdsWithBusy.size;
    pickedUp = driverIdsWithPickedUp.size - driverIdsWithSoonToClear.size;
    soonToClear = driverIdsWithSoonToClear.size;

    // Calculate total count including soonToClear
    const total = clear + busy + pickedUp + soonToClear;

    return {
      active,
      clear,
      busy,
      pickedUp,
      soonToClear,
      total,
    };
  }

  async findNearestDrivers(rideId: string): Promise<any[]> {
    // Fetch the ride to get the pickup location and zone
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ["pickupZone"], // Ensure pickupZone is correctly loaded
    });

    if (!ride) {
      throw new Error("Ride not found");
    }

    const { fromLatitude, fromLongitude, time, pickupZone } = ride;

    const drivers = await this.DriverRepository.createQueryBuilder("driver")
      .leftJoinAndSelect("driver.vehicle", "vehicle") // Join with the Vehicle entity

      .select([
        "driver.id AS driver_id",
        "driver.latitude",
        "driver.longitude",
        "driver.firstName AS driver_firstName",
        "driver.lastName AS driver_lastName",
        "driver.longitude AS driver_longitude",
        "driver.latitude AS driver_latitude",
        "driver.zone AS driver_zone",
        "driver.callSign AS driver_callSign",
        "driver.status AS driver_status",
        "vehicle.callSign AS vehicle_callSign",
        `ST_Distance(
          ST_SetSRID(ST_MakePoint(driver.longitude, driver.latitude), 4326),
          ST_SetSRID(ST_MakePoint(:fromLongitude, :fromLatitude), 4326)
        ) AS distance`,
      ])
      .where("driver.online = :online", { online: true })
      .orderBy("distance", "ASC")
      .limit(5)
      .setParameters({ fromLongitude, fromLatitude })
      .getRawMany();

    let driversToFrontend = [];

    for (const driver of drivers) {
      const allRides = await this.rideRepository.find({
        where: { driverId: driver.driver_id },
      });

      let zoneName = DEFAULT_ZONE_NAME; // Default zone name if not found

      // Check if the driver has a zone ID and fetch the zone name if it exists
      if (driver?.driver_zone) {
        const zone = await this.zoneRepository.findOne({
          where: { id: driver.driver_zone },
        });
        if (zone) {
          zoneName = zone.name; // Set the zone name if the zone is found
        }
      }

      let driverStatus = "clear";

      for (const ride of allRides) {
        if (ride.status == RIDE_STATUS.PICKEDUP) {
          const destination = `${ride.toLatitude},${ride.toLongitude}`;
          const origin = `${driver.driver_latitude},${driver.driver_longitude}`;

          let routeDistanceMiles;
          try {
            const { routeDistance } =
              await this.tarrifsService.getDistanceAndTime(origin, destination);
            // Convert routeDistance from meters to kilometers
            const routeDistanceKm = routeDistance.value / 1000;

            // Convert kilometers to miles
            const kmToMiles = (km) => km * 0.621371;

            routeDistanceMiles = kmToMiles(routeDistanceKm);
          } catch (error) {
            this.logger.error("error in routeDistance");
          }

          if (routeDistanceMiles != undefined && routeDistanceMiles <= 0.3) {
            driverStatus = "Soon_To_Be_Cleared";
            break;
          } else {
            driverStatus = "busy";
          }
        } else if (
          ride.status == RIDE_STATUS.DISPATCHED ||
          ride.status == RIDE_STATUS.ACCEPTED ||
          ride.status == RIDE_STATUS.ARRIVED ||
          ride.status == RIDE_STATUS.PICKEDUP
        ) {
          driverStatus = "busy";
        }
      }

      let averageEta = "0S";
      const rideDestination = `${fromLatitude},${fromLongitude}`;
      const driverLocation = `${driver.driver_latitude},${driver.driver_longitude}`;

      try {
        const { routeDuration } = await this.tarrifsService.getDistanceAndTime(
          driverLocation,
          rideDestination
        );

        averageEta = routeDuration.text;
      } catch (error) {
        this.logger.error("error in routeDistance");
      }

      driversToFrontend.push({
        id: driver.driver_id,
        firstName: driver.driver_firstName,
        lastName: driver.driver_lastName,
        longitude: driver.driver_longitude,
        latitude: driver.driver_latitude,
        zone: zoneName,

        status: driver.driver_status,
        averageEta: averageEta,
        vehicleCallSign: driver.vehicle_callsign,
        distance: driver.distance,
        pickupZone: pickupZone.name, // Include the name of the pickup zone
        driverStatus: driverStatus,
      });
    }

    // Map the result to include the status color and other required details
    return driversToFrontend;
  }

  async getNearestDriverByLocation({
    latitude,
    longitude,
  }: {
    latitude: number;
    longitude: number;
  }) {
    this.logger.info("Service=>getNearestDriverByLocation=>Input: %o", {
      latitude,
      longitude,
    });
    try {
      const point = `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;

      const result = await this.DriverRepository.createQueryBuilder("driver")
        .where("driver.online = :online", { online: true })
        .orderBy(
          `ST_DistanceSphere(
            ST_SetSRID(ST_MakePoint(driver.longitude, driver.latitude), 4326),
            ${point}
          )`,
          "ASC"
        )
        .getOne();

      this.logger.info(
        "Service=>getNearestDriverByLocation=>Output: %o",
        result
      );
      if (result) {
        return { latitude: result.latitude, longitude: result.longitude };
      } else {
        return null;
      }
    } catch (err) {
      this.logger.error("Service=>getNearestDriverByLocation=>Error: %o", err);
      throw err;
    }
  }
}
