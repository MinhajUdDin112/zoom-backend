import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import {
  CreateRideDTO,
  UpdateRideDTO,
  UpdateRideMessageDto,
  UpdateRideStatusDTO,
} from "./dto/rides.dto";
import { PinoLogger } from "nestjs-pino";
import { InjectRepository } from "@nestjs/typeorm";
import { Rides } from "./rides.entity";
import { Brackets, DataSource, ILike, In, Not, Repository } from "typeorm";
import { DocumentService } from "src/documents/document.service";
import {
  RIDE_HISTORY_ACTION_TYPE,
  RIDE_PAYMENT_STATUS,
  RIDE_STATUS,
  STATUS,
} from "./enums/rides.enum";
import { CapabilityService } from "src/capability/capability.service";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { PusherService } from "src/pusher/pusher.service";
import { VehicleService } from "src/vehicles/vehicle.service";
import { FindAllQueryDto } from "src/utils/dto/filterBy.dto";
import { StripeService } from "src/stripe/stripe.service";
import { UsersService } from "src/users/users.service";
import { RideFareDetails } from "./ride-fare-details.entity";
import { RideCapabilityCharges } from "./ride-capability-charges.entity";
import { EPusherChannel, EPusherEvent } from "src/pusher/pusher.enum";
import getCurrentUTCFormatted, {
  GetRelativeTime,
  HaversineDistance,
} from "./utils";
import { ChatService } from "src/twilio/chat.service";
import { RideHistory } from "./rides-history.entity";
import { DriversService } from "src/driver/driver.service";
import { NotificationService } from "src/notification/notification.service";
import * as moment from "moment";
import { TarrifsService } from "src/tarrifs/tarrifs.service";
import { Vehicle } from "src/vehicles/vehicle.entity";
import { Drivers } from "src/driver/driver.entity";
import { RideLocationHistory } from "./ride-location-history.entity";
import { UtilsService } from "src/utils/utils.service";
import { Zone } from "src/zone/zone.entity";
import { error } from "console";
import { Role } from "src/users/enums/users.enum";
import { NotificationMessages } from "src/constants";
import { RideMessages } from "./ride-messages.entity";
import { TransactionService } from "src/transaction/transaction.service";
import { ETransactionType } from "src/transaction/enums/transaction.enum";

@Injectable()
export class RidesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
    private readonly vechileService: VehicleService,
    private readonly driverService: DriversService,
    private readonly userService: UsersService,
    private readonly stripeService: StripeService,
    private readonly chatService: ChatService,
    private readonly tarrifsService: TarrifsService,
    private readonly transactionService: TransactionService,
    private readonly utilsService: UtilsService,
    private readonly capabilityService: CapabilityService,
    @InjectRepository(Rides)
    private readonly RideRepository: Repository<Rides>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    @InjectRepository(Drivers)
    private readonly DriverRepository: Repository<Drivers>,
    @InjectRepository(RideFareDetails)
    private readonly RideFareDetailsRepository: Repository<RideFareDetails>,
    @InjectRepository(RideCapabilityCharges)
    private readonly RideCapabilityChargesRepository: Repository<RideCapabilityCharges>,
    @InjectRepository(RideHistory)
    private readonly RideHistoryRepository: Repository<RideHistory>,
    @InjectRepository(RideMessages)
    private readonly RideMessageRepository: Repository<RideMessages>,
    @InjectRepository(Vehicle)
    private readonly VehicleRepository: Repository<Vehicle>,
    @InjectRepository(RideLocationHistory)
    private readonly rideLocationHistory: Repository<RideLocationHistory>,
    private readonly pusherService: PusherService,
    private readonly notificationService: NotificationService
  ) {}

  async createRide(ride: CreateRideDTO, userId: string) {
    this.logger.info("Service=>createRide=>Input: %o", ride);
    const queryRunner =
      this.RideRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const highestBookingId = await queryRunner.manager
        .createQueryBuilder()
        .select("MAX(ride.bookingId)", "max")
        .from(this.RideRepository.target, "ride")
        .getRawOne();

      if (ride?.capabilityId) {
        const rideCapability = await this.capabilityService.findById(
          ride?.capabilityId
        );

        if (!rideCapability?.enabled) {
          throw new BadRequestException(ERROR_MESSAGE.CAPABILITY_DISABLED);
        }
      }

      const newBookingId = (highestBookingId.max || 0) + 1;

      let dispatchDueTime = undefined;
      let scheduleDateTimeUtc = undefined;
      if (ride.isScheduled && ride.scheduleDateTime) {
        const airportZone = await this.zoneRepository.findOne({
          where: { name: ILike(`%${"airport"}%`) },
        });

        const scheduleDateTime = moment(ride.scheduleDateTime);
        scheduleDateTimeUtc = moment.utc(scheduleDateTime);

        if (ride?.fare?.pickupZoneId == airportZone?.id) {
          const dueTimeMoment = scheduleDateTime.subtract(30, "minute");
          dispatchDueTime = moment.utc(dueTimeMoment);
        } else {
          const dueTimeMoment = scheduleDateTime.subtract(20, "minute");
          dispatchDueTime = moment.utc(dueTimeMoment);
        }
      }

      const rideData = {
        ...ride,
        price: ride.fare.totalPrice,
        cost: ride.fare.totalCost,
        pickupZoneId: ride.fare.pickupZoneId,
        destinationZoneId: ride.fare.destinationZoneId,
        dispatchDueTime: dispatchDueTime,
        scheduleDateTime: scheduleDateTimeUtc,
        fare: undefined,
        bookingId: newBookingId,
        isSkipRating: false,
      };

      // Directly save the ride data
      const savedRide = await queryRunner.manager.save(
        this.RideRepository.target,
        rideData
      );

      const customer = await this.userService.findUserById(
        savedRide.customerId
      );

      // Directly save the fare data
      const fareData = {
        ...ride.fare,
        rideId: savedRide.id,
      };
      const savedFare = await queryRunner.manager.save(
        this.RideFareDetailsRepository.target,
        fareData
      );

      // Directly save the active capability charges
      for (const activeCapabilityCharges of ride.fare.activeCapabilityCharges) {
        const chargeData = {
          ...activeCapabilityCharges,
          fareId: savedFare.id,
        };
        await queryRunner.manager.save(
          this.RideCapabilityChargesRepository.target,
          chargeData
        );
      }

      const conversation = await this.chatService.createConversation(
        savedRide.id,
        [savedRide.customerId]
      );

      // Creating paymentSheetIntent
      const paymentSheetData = await this.stripeService.createPaymentSheet(
        savedRide.price,
        customer.stripeCustomerId,
        { rideId: savedRide.id }
      );

      await queryRunner.manager.update(
        this.RideRepository.target,
        { id: savedRide.id },
        {
          paymentIntentId: paymentSheetData.paymentIntentId,
          clientSecret: paymentSheetData.clientSecret,
          conversationSid: conversation?.sid,
        }
      );

      const rideFound = await queryRunner.manager.findOne(
        this.RideRepository.target,
        {
          where: { id: savedRide.id },
          relations: {
            pickupZone: true,
            destinationZone: true,
            fare: {
              activeCapabilityCharges: true,
            },
          },
        }
      );

      await queryRunner.commitTransaction();

      await this.addRideChangeHistory({
        rideId: rideFound.id,
        actionType: RIDE_HISTORY_ACTION_TYPE.CREATED,
        rideStatus: rideFound.status as RIDE_STATUS,
        updatedById: userId,
        updateNote: "Ride created",
        driverId: undefined,
      });

      this.logger.info("Service=>createRide=>Output: %o", {
        ride: rideFound,
        paymentData: paymentSheetData,
      });

      return { ride: rideFound, paymentData: paymentSheetData };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        "Service=>createRide=>Error: %o",
        err?.response?.message || err?.message || err
      );
      throw new Error(err?.response?.message || err?.message || err);
    } finally {
      await queryRunner.release();
    }
  }

  async getArchiveBooking(rideId) {
    try {
      let response;
      // let timeAndDistance;
      // let timeAndDistanceInMiles;
      let gpsMeterComparisonPrice;
      const archiveBooking = await this.RideRepository.findOne({
        where: { id: rideId },
        relations: {
          driver: true,
          history: true,
          pickupZone: true,
          vehicle: true,
          destinationZone: true,
          customer: true,
          capability: true,
        },
      });
      if (archiveBooking) {
        const rideFareDetails = await this.RideFareDetailsRepository.findOne({
          where: { rideId },
        });
        const rideHistoryList = await this.rideLocationHistory.find({
          where: {
            ride: { id: rideId },
            rideStatus: In([
              RIDE_STATUS.ARRIVED,
              RIDE_STATUS.PICKEDUP,
              RIDE_STATUS.DROPOFF,
            ]),
          },
        });

        const routeData = rideHistoryList.map((rideHistory) => [
          rideHistory.latitude,
          rideHistory.longitude,
        ]);

        // Sum up the distances from all batches
        let totalDistance = 0;
        const query = `
        SELECT ST_Length(
          ST_Transform(
            ST_MakeLine(
              ARRAY(
                SELECT ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                FROM "ride-locaion-history"
                WHERE "rideId" = $1
                AND "rideStatus" IN ('ARRIVED', 'PICKEDUP', 'DROPOFF')
                ORDER BY "createdAt" ASC
              )
            ),
            3857
          )
        ) AS total_distance_in_meters;
      `;

        // Execute the query using TypeORM
        const result = await this.rideLocationHistory.query(query, [rideId]);

        // Get total distance from the query result
        const totalDistanceInMeters =
          result?.[0]?.total_distance_in_meters || 0;

        const timeAndDistanceInMiles = totalDistanceInMeters / 1609;

        if (rideFareDetails?.tarrifId) {
          const tariff = await this.tarrifsService.findOne(
            rideFareDetails?.tarrifId
          );

          const variableFareTemplate =
            await this.tarrifsService.calculateVariableFareTemplate(tariff, {
              distance: totalDistanceInMeters, // Use the total summed distance
              capabilityId: archiveBooking?.capabilityId,
            });

          gpsMeterComparisonPrice = variableFareTemplate.price;
        }
        response = {
          paymentStatus: archiveBooking?.paymentStatus,
          paymentReference: archiveBooking?.paymentIntentId,
          routeData: routeData,
          gpsMeterComparisonPrice: gpsMeterComparisonPrice
            ? gpsMeterComparisonPrice
            : 0,
          gpsMeterDistance: timeAndDistanceInMiles ? timeAndDistanceInMiles : 0,
          systemEstimatedPrice: archiveBooking?.price,
          systemEstimatedDistance: archiveBooking?.distance,
          systemEstimatedCost: archiveBooking?.cost,
          bookingId: archiveBooking?.bookingId,
          dispatchTime: archiveBooking?.dispatchDueTime,
          bookingType: archiveBooking?.isScheduled ? "Pre booking" : "ASAP",
          paymentType: archiveBooking?.paymentMethod,
          bookedTime: archiveBooking?.createdAt,
          driverCallSign: archiveBooking?.driver?.callSign,
          driverUserName:
            archiveBooking?.driver?.firstName +
            " " +
            archiveBooking?.driver?.lastName,
          driverBadgeNumber: archiveBooking?.driver?.badgeNumber,
          vehicleCallSign: archiveBooking?.vehicle?.callSign,
          vehiclePlateNumber: archiveBooking?.vehicle?.plateNumber,
          vehicleRegistrationNumber: archiveBooking?.vehicle?.registration,
          destinationZone: archiveBooking?.destinationZone?.name,
          pickedUpZone: archiveBooking?.pickupZone?.name,
          customerName: archiveBooking?.customer?.userName,
          customerNumber: archiveBooking?.customer.phoneNumber,
          customerEmail: archiveBooking?.customer?.email,
          company: archiveBooking?.customer?.company,
          capabilityShortCode: archiveBooking?.capability?.shortCode,
          capabilityName: archiveBooking?.capability?.name,
          priority: archiveBooking?.priority, //priority of ride, not of capability
          accountCode: archiveBooking?.account,
          bookingSource: "PAPP",
          driverNotes: archiveBooking?.driverComments,
          rejectedVehicleMake: archiveBooking?.driver?.vehicle?.make,
          rejectedVehicleCallSign: archiveBooking?.driver?.vehicle?.callSign,
          fromLatitude: archiveBooking?.fromLatitude,
          toLatitude: archiveBooking?.toLatitude,
          fromLongitude: archiveBooking?.fromLongitude,
          toLongitude: archiveBooking?.toLongitude,
        };
        if (
          Object.values(RIDE_STATUS).includes(
            archiveBooking.status as RIDE_STATUS
          )
        ) {
          if (
            archiveBooking.status === RIDE_STATUS.COMPLETED ||
            archiveBooking.status === RIDE_STATUS.NO_FARE ||
            archiveBooking.status === RIDE_STATUS.CANCELLED
          ) {
            response.archiveTime = archiveBooking.endTime;
          }
          const rideHistory = await this.RideHistoryRepository.find({
            where: { rideId },
            relations: { updatedBy: true },
          });
          for (const history of rideHistory) {
            if (history?.rideStatus === RIDE_STATUS.PENDING) {
              response.bookedBy = "Zoom Cars Limited";
            }
            if (history?.rideStatus === RIDE_STATUS.DISPATCHED) {
              response.dispatchedBy = history.updatedBy?.userName;
            }
            if (history?.rideStatus === RIDE_STATUS.COMPLETED) {
              response.completedBy =
                history.updatedBy?.role === Role.OPERATOR
                  ? history.updatedBy?.userName
                  : "Zoom Cars Limited";
            }
            if (history?.rideStatus) {
              response.arrivedTime = history.createdAt;
            }
            if (history.rideStatus === RIDE_STATUS.DISPATCHED) {
              response.dispatchTime = history.createdAt;
            }
            if (history.rideStatus === RIDE_STATUS.COMPLETED) {
              response.timeCompleted = history.createdAt;
            }
            if (history.rideStatus === RIDE_STATUS.ARRIVED) {
              response.vehicleArrived = history.createdAt;
            }
            if (history.rideStatus === RIDE_STATUS.PICKEDUP) {
              response.pickedUp = history.createdAt;
            }
          }
        }
        if (response.dispatchTime && response.pickedUp) {
          response.dispatchedToPickup = this.utilsService.timeDifference(
            response.dispatchTime,
            response.pickedUp
          );
        }
        if (response.dispatchTime && response.archiveTime) {
          response.dispatchedToArchive = this.utilsService.timeDifference(
            response.dispatchTime,
            response.archiveTime
          );
        }
        if (response.pickedUp && response.timeCompleted) {
          response.pickUpToComplete = this.utilsService.timeDifference(
            response.pickedUp,
            response.timeCompleted
          );
        }
        if (response.bookedTime && response.archiveTime) {
          response.bookToArchive = this.utilsService.timeDifference(
            response.bookedTime,
            response.archiveTime
          );
        }
        if (response.bookedTime && response.dispatchTime) {
          response.bookToDispatch = this.utilsService.timeDifference(
            response.bookedTime,
            response.dispatchTime
          );
        }
        if (response?.bookedTime && response?.vehicleArrived) {
          response.bookToArrived = this.utilsService.timeDifference(
            response.bookedTime,
            response.vehicleArrived
          );
        }
        if (rideFareDetails) {
          const tariff = await this.tarrifsService.findOne(
            rideFareDetails?.tarrifId
          );
          response.tariffShortName = tariff.shortName;
          response.tariffType = tariff.type;
        }
        return response;
      } else {
        throw new NotFoundException(ERROR_MESSAGE.BOOKING_NOT_FOUND);
      }
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }
  async updateRide(ride: UpdateRideDTO, rideId: string) {
    this.logger.info("Service=>updateRide=>Input: %o", ride);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      // Begin a transaction
      await queryRunner.startTransaction();
      try {
        const response = await queryRunner.manager.update(
          Rides,
          { id: rideId },
          { ...ride, fare: undefined }
        );
        if (response.affected === 0) {
          throw new NotFoundException(ERROR_MESSAGE.RIDE_NOT_FOUND);
        }
        const updatedRide = await this.RideRepository.findOne({
          where: { id: rideId },
        });
        await queryRunner.commitTransaction();
        this.logger.info("Service=>updateRide=>Output: %o", updatedRide);
        return updatedRide;
      } catch (err) {
        this.logger.error("Service=>updateRide=>Error: %o", err);
        throw new InternalServerErrorException(err);
      }
    } catch (err) {
      // Rollback the transaction in case of any error
      await queryRunner.rollbackTransaction();

      this.logger.error("Service=>updateRide=>Error: %o", err);
      throw new Error(err);
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async updateRideStatus(
    ride: UpdateRideStatusDTO,
    rideId: string,
    userId: string
  ) {
    this.logger.info("Service=>updateRideStatus=>Input: %o", ride);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldRide = await this.RideRepository.findOne({
        where: { id: rideId },
      });
      if (oldRide?.status === RIDE_STATUS?.CANCELLED) {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_CANCELLED,
          {
            message: "The Ride has been cancelled.",
            data: {
              rideId: oldRide?.id,
            },
          }
        );
        throw new ConflictException("This ride is cancelled by the customer");
      }
      let override = false;
      if (
        ride.status == RIDE_STATUS.ACCEPTED ||
        ride.status == RIDE_STATUS.FOB_ACCEPTED ||
        ride.status == RIDE_STATUS.REJECTED ||
        ride.status == RIDE_STATUS.FOB_REJECTED
      ) {
        const oldRide = await this.RideRepository.findOne({
          where: { id: rideId },
        });

        if (!oldRide?.driverId || !oldRide?.vehicleId) {
          throw new Error(ERROR_MESSAGE.DRIVER_NOT_ASSIGNED);
        }

        if (
          oldRide.status == RIDE_STATUS.CANCELLED ||
          oldRide.status == RIDE_STATUS.NO_FARE
        ) {
          throw new Error(ERROR_MESSAGE.RIDE_HAS_BEEN_CANCELLED);
        }

        if (
          (ride.status == RIDE_STATUS.REJECTED &&
            oldRide.status != RIDE_STATUS.DISPATCHED &&
            oldRide.status != RIDE_STATUS.OVERRIDE_DISPATCHED) ||
          (ride.status == RIDE_STATUS.FOB_REJECTED &&
            oldRide.status != RIDE_STATUS.FOB_DISPATCHED &&
            oldRide.status != RIDE_STATUS.FOB_OVERRIDE_DISPATCHED)
        ) {
          throw new Error(ERROR_MESSAGE.RIDE_NOT_DISPATCHED);
        }

        if (
          [
            RIDE_STATUS.OVERRIDE_DISPATCHED,
            RIDE_STATUS.FOB_OVERRIDE_DISPATCHED,
          ].includes(oldRide?.status as RIDE_STATUS)
        ) {
          override = true;
        }
      }

      let statusToUpdate = ride.status;

      if (override) {
        if (statusToUpdate == RIDE_STATUS.REJECTED) {
          statusToUpdate = RIDE_STATUS.OVERRIDE_REJECTED;
        } else if (statusToUpdate == RIDE_STATUS.FOB_REJECTED) {
          statusToUpdate = RIDE_STATUS.FOB_OVERRIDE_REJECTED;
        }
      }

      const response = await queryRunner.manager.update(
        Rides,
        { id: rideId },
        {
          ...ride,
          status: statusToUpdate,
          endTime:
            ride.status == RIDE_STATUS.COMPLETED ||
            ride.status == RIDE_STATUS.CANCELLED ||
            ride.status == RIDE_STATUS.NO_FARE
              ? new Date()
              : undefined,
        }
      );
      if (response.affected === 0) {
        throw new Error("Ride not found");
      }
      const updatedRide = await queryRunner.manager.findOne(Rides, {
        where: { id: rideId },
        relations: ["customer", "capability", "driver", "fare"],
      });

      if (ride.status == RIDE_STATUS.HELD) {
        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.HELD,
          updatedById: userId,
          updateNote: "Ride held",
          driverId: updatedRide?.driverId,
        });

        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_HELD,
          {
            message: "A ride has been held",
            data: {
              rideId: updatedRide?.id,
              driverId: updatedRide?.driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );
      } else if (ride.status == RIDE_STATUS.RELEASED) {
        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.RELEASED,
          updatedById: userId,
          updateNote: "Ride released",
          driverId: updatedRide.driverId,
        });
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_RELEASED,
          {
            message: "A ride has been released",
            data: {
              rideId: updatedRide?.id,
              driverId: updatedRide?.driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );
      } else if (ride.status == RIDE_STATUS.ACCEPTED) {
        const driverEmail = updatedRide?.driver?.email;

        const driverUser = await this.userService.findUserByEmail(driverEmail);

        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.ACCEPTED,
          updatedById: userId,
          updateNote: "Ride Accepted",
          driverId: updatedRide.driverId,
        });
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_ACCEPTED,
          {
            message: "A ride has been Accepted",
            data: {
              rideId: updatedRide?.id,
              driverId: updatedRide?.driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );

        await this.chatService.createConversationParticipant(
          { sid: updatedRide.conversationSid },
          [driverUser?.id]
        );

        await this.notificationService.sendNotification(
          {
            title: "Ride Dispatched",
            type: EPusherEvent.RIDE_ACCEPTED,
            message: NotificationMessages.ACCEPTED,
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: updatedRide?.id,
            },
          },
          updatedRide?.customerId
        );
      } else if (ride.status == RIDE_STATUS.FOB_ACCEPTED) {
        const driverEmail = updatedRide?.driver?.email;

        const driverUser = await this.userService.findUserByEmail(driverEmail);

        const driverLastRide = await this.RideRepository.createQueryBuilder(
          "ride"
        )
          .where("ride.driverId = :id", { id: updatedRide.driverId })
          .andWhere(
            "(ride.status=:accepted OR ride.status=:arrived OR ride.status=:pickedUp OR ride.status=:dropOff)",
            {
              accepted: RIDE_STATUS.ACCEPTED,
              arrived: RIDE_STATUS.ARRIVED,
              pickedUp: RIDE_STATUS.PICKEDUP,
              dropOff: RIDE_STATUS.DROPOFF,
            }
          )
          .getOne();
        if (!driverLastRide) {
          throw new Error("Driver's previous active ride not found.");
        }

        const driverCoordinates = `${updatedRide?.driver?.latitude}, ${updatedRide?.driver?.longitude}`;
        const previousRideDropOff = `${driverLastRide?.toLatitude}, ${driverLastRide?.toLongitude}`;
        const pickedUpCoordinates = `${updatedRide?.fromLatitude}, ${updatedRide?.fromLongitude}`;

        let arrivalTime = "few minutes";

        try {
          const { routeDuration } =
            await this.tarrifsService.getDistanceAndTimeBetweenPoints([
              driverCoordinates,
              previousRideDropOff,
              pickedUpCoordinates,
            ]);
          if (routeDuration?.text) {
            arrivalTime = routeDuration?.text;
          }
        } catch (error) {
          this.logger.error(error);
        }

        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.FOB_ACCEPTED,
          updatedById: userId,
          updateNote: "Ride FOB Accepted",
          driverId: updatedRide.driverId,
        });

        await this.chatService.createConversationParticipant(
          { sid: updatedRide.conversationSid },
          [driverUser?.id]
        );

        await this.notificationService.sendNotification(
          {
            title: "Ride Dispatched",
            type: EPusherEvent.RIDE_ACCEPTED_FOB,
            message: `Your driver has been assigned, dropping off nearby and will reach shortly in ${arrivalTime}.`,
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: updatedRide?.id,
            },
          },
          updatedRide?.customerId
        );
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_ACCEPTED_FOB,
          {
            message: "A ride FOB has been Accepted",
            data: {
              rideId: updatedRide?.id,
              driverId: updatedRide?.driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );
      } else if (ride.status == RIDE_STATUS.ARRIVED) {
        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.ARRIVED,
          updatedById: userId,
          updateNote: "Driver has Arrived",
          driverId: updatedRide.driverId,
        });
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_ARRIVED,
          {
            message: "Driver has Arrived",
            data: {
              rideId: updatedRide?.id,
              driverId: updatedRide?.driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );
        await this.notificationService.sendNotification(
          {
            title: "Driver has Arrived",
            type: EPusherEvent.RIDE_ARRIVED,
            message: NotificationMessages.ARRIVED,
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: updatedRide?.id,
            },
          },
          updatedRide?.customerId
        );
      } else if (ride.status == RIDE_STATUS.PICKEDUP) {
        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.PICKEDUP,
          updatedById: userId,
          updateNote: "The Driver has pickup the customer",
          driverId: updatedRide.driverId,
        });

        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_STARTED,
          {
            message: "A ride has been Started",
            data: {
              rideId: updatedRide?.id,
              driverId: updatedRide?.driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );

        await this.notificationService.sendNotification(
          {
            title: "Ride Started",
            type: EPusherEvent.RIDE_PICKEDUP,
            message: NotificationMessages.STARTED,
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: updatedRide?.id,
            },
          },
          updatedRide?.customerId
        );
      } else if (ride.status == RIDE_STATUS.COMPLETED) {
        const driverEmail = updatedRide?.driver?.email;
        const driverUser = await this.userService.findUserByEmail(driverEmail);
        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.COMPLETED,
          updatedById: userId,
          updateNote: "Driver has completed the ride",
          driverId: updatedRide.driverId,
        });

        if (userId == driverUser?.id) {
          await this.pusherService.trigger(
            EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
            EPusherEvent.RIDE_COMPLETED,
            {
              message: "A ride has been completed",
              data: {
                rideId: updatedRide?.id,
                driverId: updatedRide?.driverId,
                customerId: updatedRide?.customerId,
              },
            }
          );

          await this.notificationService.sendNotification(
            {
              title: "Ride Completed",
              type: EPusherEvent.RIDE_COMPLETED,
              message: NotificationMessages.COMPLETED,
              data: {
                stackName: "HomeStack",
                screenName: "RideDetails",
                rideId: updatedRide?.id,
              },
            },
            updatedRide?.customerId
          );
        } else {
          await this.pusherService.trigger(
            EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
            EPusherEvent.RIDE_COMPLETED_OPERATOR,
            {
              message: "A ride has been completed",
              data: {
                rideId: updatedRide?.id,
                driverId: updatedRide?.driverId,
                customerId: updatedRide?.customerId,
              },
            }
          );

          await this.notificationService.sendNotification(
            {
              title: "Ride Completed",
              type: EPusherEvent.RIDE_COMPLETED_OPERATOR,
              message: NotificationMessages.COMPLETED,
              data: {
                stackName: "HomeStack",
                screenName: "RideDetails",
                rideId: updatedRide?.id,
              },
            },
            updatedRide?.customerId
          );
        }

        // Finding FOB Ride for the driver
        const driverFOBRide = await this.RideRepository.createQueryBuilder(
          "ride"
        )
          .where("ride.driverId = :id", { id: updatedRide.driverId })
          .andWhere("(ride.status=:fobAccepted)", {
            fobAccepted: RIDE_STATUS.FOB_ACCEPTED,
          })
          .getOne();

        if (driverFOBRide) {
          driverFOBRide.status = RIDE_STATUS.ACCEPTED;
          await this.RideRepository.save(driverFOBRide);

          await this.addRideChangeHistory({
            rideId: driverFOBRide.id,
            actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
            rideStatus: RIDE_STATUS.ACCEPTED,
            updatedById: userId,
            updateNote: "Ride Accepted",
            driverId: driverFOBRide.driverId,
          });
          await this.pusherService.trigger(
            EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
            EPusherEvent.RIDE_ACCEPTED,
            {
              message: "A ride has been Accepted",
              data: {
                rideId: driverFOBRide?.id,
                driverId: driverFOBRide?.driverId,
                customerId: driverFOBRide?.customerId,
              },
            }
          );

          await this.notificationService.sendNotification(
            {
              title: "Ride Dispatched",
              type: EPusherEvent.RIDE_ACCEPTED,
              message: NotificationMessages.ACCEPTED,
              data: {
                stackName: "HomeStack",
                screenName: "RideDetails",
                rideId: driverFOBRide?.id,
              },
            },
            driverFOBRide?.customerId
          );
        }

        // Notify the driver as well
        // const driverEmail = updatedRide?.driver?.email;
        // const driverUser = await this.userService.findUserByEmail(driverEmail);

        // if (driverUser?.id) {
        //   await this.notificationService.sendNotification(
        //     {
        //       title: "Ride Completed",
        //       type: EPusherEvent.RIDE_COMPLETED,
        //       message: "Your ride has been completed successfully",
        //       data: {
        //         stackName: "HomeStack",
        //         screenName: "RideDetails",
        //       },
        //     },
        //     driverUser?.id
        //   );
        // }
      } else if (ride.status == RIDE_STATUS.REJECTED) {
        const driverId = updatedRide.driverId;

        const response = await queryRunner.manager.update(
          Rides,
          { id: rideId },
          {
            driver: null,
            driverId: null,
            vehicle: null,
            vehicleId: null,
          }
        );

        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.REJECTED,
          updatedById: userId,
          updateNote: "Driver has rejected the ride offer",
          driverId: driverId,
        });

        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_REJECTED,
          {
            message: "A ride has been rejected",
            data: {
              rideId: updatedRide?.id,
              driverId: driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );
      } else if (ride.status == RIDE_STATUS.FOB_REJECTED) {
        const driverId = updatedRide.driverId;

        const response = await queryRunner.manager.update(
          Rides,
          { id: rideId },
          {
            driver: null,
            driverId: null,
            vehicle: null,
            vehicleId: null,
          }
        );

        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.FOB_REJECTED,
          updatedById: userId,
          updateNote: "Driver has rejected the FOB ride offer",
          driverId: driverId,
        });

        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_REJECTED_FOB,
          {
            message: "A FOB ride has been rejected",
            data: {
              rideId: updatedRide?.id,
              driverId: driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );
      } else if (ride.status == RIDE_STATUS.RECOVER) {
        const driverId = updatedRide?.driverId;
        const driver = updatedRide?.driver;

        const response = await queryRunner.manager.update(
          Rides,
          { id: rideId },
          {
            driver: null,
            driverId: null,
            vehicle: null,
            vehicleId: null,
          }
        );

        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.RECOVER,
          updatedById: userId,
          updateNote: "Driver has recovered the ride offer",
          driverId: driverId,
        });

        //added else if condition by sheharyar for recover only
        //i only need count of rejected and recover so i am not triggering any event just added else if for my count

        const driverEmail = driver?.email;
        const driverUser = await this.userService.findUserByEmail(driverEmail);

        if (driverUser?.id) {
          await this.notificationService.sendNotification(
            {
              title: "Ride Recovered",
              type: EPusherEvent.RIDE_RECOVERED,
              message: NotificationMessages.DRIVER_RECOVERED,
              data: {
                stackName: "HomeStack",
                screenName: "RideDetails",
                rideId: updatedRide?.id,
              },
            },
            driverUser?.id,
            true
          );
        }

        await this.notificationService.sendNotification(
          {
            title: "Ride Recovered",
            type: EPusherEvent.RIDE_RECOVERED,
            message: NotificationMessages.RECOVERED,
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: updatedRide?.id,
            },
          },
          updatedRide?.customerId
        );
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_RECOVERED,
          {
            message: "A ride has been recovered",
            data: {
              rideId: updatedRide?.id,
              driverId: driverId,
              customerId: updatedRide?.customerId,
            },
          }
        );
      }

      if (
        ride.status == RIDE_STATUS.ACCEPTED ||
        ride.status == RIDE_STATUS.REJECTED ||
        ride.status == RIDE_STATUS.FOB_ACCEPTED ||
        ride.status == RIDE_STATUS.FOB_REJECTED
      ) {
        const currentRideInDB = await this.RideRepository.findOne({
          where: { id: rideId },
        });
        if (
          currentRideInDB?.status == RIDE_STATUS.CANCELLED ||
          currentRideInDB?.status == RIDE_STATUS.NO_FARE
        ) {
          throw new Error(ERROR_MESSAGE.RIDE_HAS_BEEN_CANCELLED);
        }
      }
      await queryRunner.commitTransaction();
      this.logger.info("Service=>updateRideStatus=>Output: %o", updatedRide);
      let result = { ...updatedRide };
      try {
        if (updatedRide) {
          const tarrif = await this.tarrifsService.findOne(
            updatedRide?.fare?.tarrifId
          );
          const tariffShortName = tarrif?.shortName;
          const resultFare = { ...result.fare, tariffShortName };
          result = { ...result, fare: resultFare };
        }
      } catch (error) {
        this.logger.error(
          "Service=>updateRideStatus=>FindTarrif=>Error: %o",
          error
        );
      }
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>updateRideStatus=>Error: %o", err);
      throw new HttpException(
        err?.response?.message || err?.message || err,
        err?.statusCode || HttpStatus.BAD_REQUEST
      );
    } finally {
      await queryRunner.release();
    }
  }

  async handleCancelNoFare(
    vehicleCallSign: string,
    status: any,
    userId: string
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if the status is NO_FARE or CANCELLED
      if (status !== "NO_FARE" && status !== "CANCELLED") {
        throw new Error("Invalid status. Status must be NO_FARE or CANCELLED.");
      }

      // Find the vehicle by call sign
      const vehicle = await queryRunner.manager.findOne(Vehicle, {
        where: { callSign: vehicleCallSign },
      });

      let ride;
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }
      if (status === RIDE_STATUS.CANCELLED) {
        // Find the ride associated with the vehicle and matching the specified statuses
        ride = await queryRunner.manager.findOne(Rides, {
          where: {
            vehicleId: vehicle.id,
            status: In([
              RIDE_STATUS.ACCEPTED,
              RIDE_STATUS.ARRIVED,
              RIDE_STATUS.PICKEDUP,
              RIDE_STATUS.DROPOFF,
            ]),
          },
        });
      } else if (status === RIDE_STATUS.NO_FARE) {
        // Find the ride associated with the vehicle and matching the specified statuses
        ride = await queryRunner.manager.findOne(Rides, {
          where: {
            vehicleId: vehicle.id,
            status: In([RIDE_STATUS.ARRIVED]),
          },
        });
      }

      if (!ride) {
        throw new Error(
          "The action could not be processed due to no matching ride status."
        );
      }

      // Call method to cancel the ride with the specified status
      const result = await this.cancelNoFare(ride.id, status, userId);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      this.logger.error(err);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async recoverJob(vehicleCallSign: string, userId: string): Promise<Rides> {
    // Find the vehicle by call sign
    const vehicle = await this.VehicleRepository.findOne({
      where: { callSign: vehicleCallSign },
    });

    if (!vehicle) {
      throw new NotFoundException(
        "Vehicle not found for the provided call sign."
      );
    }

    const ride = await this.RideRepository.findOne({
      where: {
        vehicleId: vehicle.id,
        status: Not(
          In([
            RIDE_STATUS.PICKEDUP,
            RIDE_STATUS.COMPLETED,
            RIDE_STATUS.CANCELLED,
            RIDE_STATUS.NO_FARE,
          ])
        ),
      },
    });

    if (!ride) {
      throw new NotFoundException("Job cannot be recovered.");
    }

    // Prepare the status update
    const updateStatusDTO: UpdateRideStatusDTO = {
      status: RIDE_STATUS.RECOVER,
    };

    // Update the ride status to RECOVER
    const updatedRide = await this.updateRideStatus(
      updateStatusDTO,
      ride.id,
      userId
    );

    return updatedRide;
  }

  async completeJob(vehicleCallSign: string, userId: string): Promise<Rides> {
    // Find the vehicle by call sign
    const vehicle = await this.VehicleRepository.findOne({
      where: { callSign: vehicleCallSign },
    });

    if (!vehicle) {
      throw new NotFoundException(
        "Vehicle not found for the provided call sign."
      );
    }

    const ride = await this.RideRepository.findOne({
      where: {
        vehicleId: vehicle.id,
        status: Not(
          In([
            RIDE_STATUS.COMPLETED,
            RIDE_STATUS.CANCELLED,
            RIDE_STATUS.NO_FARE,
          ])
        ),
      },
    });

    if (!ride) {
      throw new NotFoundException(
        "There is no ride found which is associated with this vehicle callSign"
      );
    }

    // Prepare the status update
    const updateStatusDTO: UpdateRideStatusDTO = {
      status: RIDE_STATUS.COMPLETED,
    };

    // Update the ride status to RECOVER
    const updatedRide = await this.updateRideStatus(
      updateStatusDTO,
      ride.id,
      userId
    );

    return updatedRide;
  }
  async addRideMessage(
    rideId: string,
    driverId: string,
    message: string
  ): Promise<any> {
    try {
      const newMessage = this.RideMessageRepository.create({
        ride: { id: rideId }, // Use the relationship property `ride`
        driver: { id: driverId }, // Use the relationship property `driver`
        message,
      });
      return await this.RideMessageRepository.save(newMessage);
    } catch (error) {
      this.logger.error(error);
      return error;
    }
  }

  async updateIsRead(updateDto: UpdateRideMessageDto): Promise<RideMessages> {
    try {
      const { id, isRead } = updateDto;

      const rideMessage = await this.RideMessageRepository.findOne({
        where: { id },
      });

      if (!rideMessage) {
        throw new NotFoundException(`RideMessage with ID ${id} not found`);
      }

      rideMessage.isRead = isRead;

      return await this.RideMessageRepository.save(rideMessage);
    } catch (error) {
      this.logger.error(error);
      throw new Error("Failed to update isRead status");
    }
  }

  async findAllRideMessages(): Promise<{
    rows: RideMessages[];
    count: number;
  }> {
    try {
      const [rows, count] = await this.RideMessageRepository.findAndCount({
        where: { isRead: false }, // Only fetch messages where isRead is false
        relations: ["driver"], // Include related entities if needed
        order: { createdAt: "ASC" },
      });
      return { rows, count };
    } catch (error) {
      this.logger.error(error);
      throw new Error("Error fetching ride messages");
    }
  }

  //patch api for ride messages

  //api
  async cancelNoFare(
    rideId: string,
    status: RIDE_STATUS.CANCELLED | RIDE_STATUS.NO_FARE,
    userId: string
  ) {
    this.logger.info("Service=>cancelNoFare=>Input: %o %o", rideId, status);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const ride = await queryRunner.manager.findOne(Rides, {
        where: { id: rideId },
        relations: {
          fare: true,
        },
      });
      if (!ride) {
        throw new Error("Ride not found");
      }

      if (
        ride.status == RIDE_STATUS.COMPLETED ||
        ride.status == RIDE_STATUS.CANCELLED ||
        ride.status == RIDE_STATUS.NO_FARE
      ) {
        throw new Error("Ride not in progress");
      }

      // if (
      //   ride.status == RIDE_STATUS.DISPATCHED ||
      //   ride.status == RIDE_STATUS.FOB_DISPATCHED ||
      //   ride.status == RIDE_STATUS.FOB_OVERRIDE_DISPATCHED
      // ) {
      //   throw new Error("Ride is currently being offered.");
      // }

      let isRideFOB = false;
      if (ride.status == RIDE_STATUS.FOB_ACCEPTED) {
        isRideFOB = true;
      }

      const updateRideResponse = await queryRunner.manager.update(
        Rides,
        { id: rideId },
        {
          status: status,
          endTime: new Date(),
        }
      );
      if (updateRideResponse.affected > 0) {
        // Full Refund
        const driverNotDispatchedStatus = [
          RIDE_STATUS.PENDING,
          RIDE_STATUS.HELD,
          RIDE_STATUS.REQUESTED,
          RIDE_STATUS.FOB_REQUESTED,
          RIDE_STATUS.OVERRIDE_REQUESTED,
          RIDE_STATUS.DISPATCHED,
          RIDE_STATUS.FOB_DISPATCHED,
          RIDE_STATUS.FOB_OVERRIDE_DISPATCHED,
          RIDE_STATUS.REJECTED,
          RIDE_STATUS.RECOVER,
          RIDE_STATUS.RELEASED,
        ];
        const currentTimeInUtc = moment.utc(new Date());
        const rideTime = moment.utc(ride.createdAt);

        const previousTransactions =
          await this.transactionService.getTransactions(rideId);

        const refundedTransaction = previousTransactions.find(
          (trn) => trn.type == ETransactionType.REFUND
        );

        if (!refundedTransaction) {
          if (
            (!ride?.driverId ||
              (ride?.driverId &&
                driverNotDispatchedStatus.includes(
                  ride.status as RIDE_STATUS
                )) ||
              currentTimeInUtc.isSameOrBefore(rideTime.add(5, "minute"))) &&
            status != RIDE_STATUS.NO_FARE
          ) {
            if (ride?.paymentStatus !== RIDE_PAYMENT_STATUS.PAID) {
              throw new Error("Ride has not been paid.");
            }
            const refund = await this.stripeService.refundRide(
              ride.paymentIntentId
            );
          } else {
            const fare = ride.fare;

            const minPrice = fare?.minPrice;

            const refundAmount = fare?.totalPrice - minPrice;

            if (refundAmount <= 0) {
              this.logger.info("Refund not applicable on", refundAmount);
            } else {
              const refund = await this.stripeService.refundRide(
                ride.paymentIntentId,
                refundAmount
              );

              this.logger.info("partial refunded", refund);
            }
          }
        } else {
          this.logger.info("Charge for this ride already refunded");
        }
      }

      await queryRunner.commitTransaction();
      await queryRunner.startTransaction();

      const updatedRide = await this.RideRepository.findOne({
        where: { id: rideId },
        relations: ["customer", "capability", "driver", "vehicle"],
      });

      const driverFOBRide = await this.RideRepository.createQueryBuilder("ride")
        .where("ride.driverId = :id", { id: updatedRide.driverId })
        .andWhere("(ride.status=:fobAccepted)", {
          fobAccepted: RIDE_STATUS.FOB_ACCEPTED,
        })
        .getOne();

      if (driverFOBRide) {
        driverFOBRide.status = RIDE_STATUS.ACCEPTED;
        await this.RideRepository.save(driverFOBRide);

        await this.addRideChangeHistory({
          rideId: driverFOBRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.ACCEPTED,
          updatedById: userId,
          updateNote: "Ride Accepted",
          driverId: driverFOBRide.driverId,
        });
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_ACCEPTED,
          {
            message: "A ride has been Accepted",
            data: {
              rideId: driverFOBRide?.id,
              driverId: driverFOBRide?.driverId,
              customerId: driverFOBRide?.customerId,
            },
          }
        );

        await this.notificationService.sendNotification(
          {
            title: "Ride Dispatched",
            type: EPusherEvent.RIDE_ACCEPTED,
            message: NotificationMessages.ACCEPTED,
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: driverFOBRide?.id,
            },
          },
          driverFOBRide?.customerId
        );
      }

      if (status == RIDE_STATUS.CANCELLED) {
        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.CANCELLED,
          updatedById: userId,
          updateNote: "Ride has been cancelled.",
          driverId: updatedRide.driverId,
        });

        const driverEmail = updatedRide?.driver?.email;
        let driverUser;
        if (driverEmail) {
          driverUser = await this.userService.findUserByEmail(driverEmail);
        }

        const rideDispatchedStatus = [
          RIDE_STATUS.FOB_ACCEPTED,
          RIDE_STATUS.ACCEPTED,
          RIDE_STATUS.ARRIVED,
          RIDE_STATUS.PICKEDUP,
          RIDE_STATUS.DROPOFF,
        ];

        if (
          userId == updatedRide?.customerId &&
          driverUser?.id &&
          rideDispatchedStatus.includes(ride.status as RIDE_STATUS)
        ) {
          await this.notificationService.sendNotification(
            {
              title: "Ride Cancelled",
              type: EPusherEvent.RIDE_CANCELLED,
              message: NotificationMessages.CANCELLED,
              data: {
                rideCancelled: "true",
                rideId: updatedRide?.id,
              },
            },
            driverUser?.id,
            true
          );
        } else if (userId == driverUser?.id) {
          await this.notificationService.sendNotification(
            {
              title: "Ride Cancelled",
              type: EPusherEvent.RIDE_CANCELLED,
              message: NotificationMessages.CANCELLED,
              data: {
                rideCancelled: "true",
                rideId: updatedRide?.id,
              },
            },
            updatedRide?.customerId
          );
        } else {
          if (
            driverUser?.id &&
            rideDispatchedStatus.includes(ride.status as RIDE_STATUS)
          ) {
            await this.notificationService.sendNotification(
              {
                title: "Ride Cancelled",
                type: EPusherEvent.RIDE_CANCELLED,
                message: NotificationMessages.CANCELLED,
                data: {
                  rideCancelled: "true",
                  rideId: updatedRide?.id,
                },
              },
              driverUser?.id,
              true
            );
          }

          await this.notificationService.sendNotification(
            {
              title: "Ride Cancelled",
              type: EPusherEvent.RIDE_CANCELLED,
              message: NotificationMessages.CANCELLED,
              data: {
                rideCancelled: "true",
                rideId: updatedRide?.id,
              },
            },
            updatedRide?.customerId
          );
        }

        if (isRideFOB) {
          await this.pusherService.trigger(
            EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
            EPusherEvent.RIDE_CANCELLED_FOB,
            {
              message: "The FOB Ride has been cancelled.",
              data: {
                rideId: updatedRide?.id,
                driverId: rideDispatchedStatus.includes(
                  ride.status as RIDE_STATUS
                )
                  ? updatedRide?.driverId
                  : undefined,
                customerId: updatedRide?.customerId,
              },
            }
          );
        } else {
          await this.pusherService.trigger(
            EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
            EPusherEvent.RIDE_CANCELLED,
            {
              message: "The Ride has been cancelled.",
              data: {
                rideId: updatedRide?.id,
                driverId: rideDispatchedStatus.includes(
                  ride.status as RIDE_STATUS
                )
                  ? updatedRide?.driverId
                  : undefined,
                customerId: updatedRide?.customerId,
              },
            }
          );
        }
      } else if (status == RIDE_STATUS.NO_FARE) {
        //need to add message
        const vehicleCallSign = updatedRide?.vehicle?.callSign; // Retrieve the vehicle call sign

        await this.addRideMessage(
          updatedRide.id,
          updatedRide.driverId,
          `${vehicleCallSign} has marked the ride as No Fare.`
        );

        await this.addRideChangeHistory({
          rideId: updatedRide.id,
          actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
          rideStatus: RIDE_STATUS.NO_FARE,
          updatedById: userId,
          updateNote: "No Fare on ride",
          driverId: updatedRide.driverId,
        });

        const driverEmail = updatedRide?.driver?.email;
        let driverUser;
        if (driverEmail) {
          driverUser = await this.userService.findUserByEmail(driverEmail);
        }

        if (userId == driverUser?.id) {
          await this.pusherService.trigger(
            EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
            EPusherEvent.RIDE_NO_FARE,
            {
              message: "No Fare on ride.",
              data: {
                rideId: updatedRide?.id,
                driverId: updatedRide?.driverId,
                customerId: updatedRide?.customerId,
              },
            }
          );
        } else {
          await this.pusherService.trigger(
            EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
            EPusherEvent.RIDE_NO_FARE_OPERATOR,
            {
              message: "No Fare on ride by operator.",
              data: {
                rideId: updatedRide?.id,
                driverId: updatedRide?.driverId,
                customerId: updatedRide?.customerId,
              },
            }
          );
        }
        if (userId == updatedRide?.customerId && driverUser?.id) {
          await this.notificationService.sendNotification(
            {
              title: "Ride Cancelled",
              type: EPusherEvent.RIDE_NO_FARE,
              message: NotificationMessages.NO_FARE,
              data: {
                rideCancelled: "true",
                rideId: updatedRide?.id,
              },
            },
            driverUser?.id,
            true
          );
        } else if (userId == driverUser?.id) {
          await this.notificationService.sendNotification(
            {
              title: "Ride Cancelled",
              type: EPusherEvent.RIDE_NO_FARE,
              message: NotificationMessages.NO_FARE,
              data: {
                rideCancelled: "true",
                rideId: updatedRide?.id,
              },
            },
            updatedRide?.customerId
          );
        } else {
          if (driverUser?.id) {
            await this.notificationService.sendNotification(
              {
                title: "Ride Cancelled",
                type: EPusherEvent.RIDE_NO_FARE,
                message: NotificationMessages.NO_FARE,
                data: {
                  rideCancelled: "true",
                  rideId: updatedRide?.id,
                },
              },
              driverUser?.id,
              true
            );
          }

          await this.notificationService.sendNotification(
            {
              title: "Ride Cancelled",
              type: EPusherEvent.RIDE_NO_FARE,
              message: NotificationMessages.NO_FARE,
              data: {
                rideCancelled: "true",
                rideId: updatedRide?.id,
              },
            },
            updatedRide?.customerId
          );
        }
      }

      this.logger.info("Service=>cancelNoFare=>Output: %o", updatedRide);
      return updatedRide;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>cancelNoFare=>Error: %o", err);
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async updateRidePaymentStatus(status: RIDE_PAYMENT_STATUS, rideId: string) {
    this.logger.info(
      "Service=>updateRidePaymentStatus=>Input: %o %o",
      rideId,
      status
    );
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const response = await queryRunner.manager.update(
        Rides,
        { id: rideId },
        { paymentStatus: status }
      );
      if (response.affected === 0) {
        throw new Error("Ride not found");
      }
      const updatedRide = await this.RideRepository.findOne({
        where: { id: rideId },
        relations: ["customer", "capability"],
      });
      if (status == RIDE_PAYMENT_STATUS.PAID) {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.NEW_RIDE,
          {
            message: "A ride has been created",
            data: { rideId },
          }
        );
      }
      this.logger.info(
        "Service=>updateRidePaymentStatus=>Output: %o",
        updatedRide
      );
      return updatedRide;
    } catch (err) {
      this.logger.error("Service=>updateRidePaymentStatus=>Error: %o", err);
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteRide(rideId: string) {
    this.logger.info("Service=>deleteRide=>Input: %o", rideId);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const ride = await this.RideRepository.findOne({
        where: {
          id: rideId,
        },
      });
      if (ride === null) {
        throw new NotFoundException("Ride not found");
      }

      const rideDeleted = await this.RideRepository.delete(rideId);
      this.logger.info("Service=>deleteRide=>Ouput: %o", rideDeleted);
      return "success";
    } catch (err) {
      this.logger.error("Service=>deleteRide=>Error: %o", err);
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  // async findRides(options) {
  //   let { page = 1, limit, sort, filter } = options;

  //   let queryBuilder = this.RideRepository.createQueryBuilder("ride")
  //     .leftJoinAndSelect("ride.customer", "customer")
  //     .leftJoinAndSelect("ride.capability", "capability")
  //     .leftJoinAndSelect("ride.driver", "driver")
  //     .leftJoinAndSelect("ride.pickupZone", "pickupZone");

  //   if (filter) {
  //     const filters = filter.split("&");

  //     // Date and Status filters
  //     const dateFilter = filters.find((f) => f.startsWith("date="));
  //     const statusFilter = filters.find((f) => f.startsWith("status="));
  //     const activeFilter = filters.find((f) => f.startsWith("active="));
  //     const otherFilters = filters.filter(
  //       (f) =>
  //         !f.startsWith("date=") &&
  //         !f.startsWith("status=") &&
  //         !f.startsWith("active=")
  //     );

  //     if (dateFilter) {
  //       const dateValue = dateFilter.split("=")[1];
  //       queryBuilder.andWhere("ride.scheduleDateTime >= :date", {
  //         date: dateValue,
  //       });
  //     }

  //     if (statusFilter) {
  //       const statusValue = statusFilter.split("=")[1];
  //       queryBuilder.andWhere("ride.status = :status", { status: statusValue });
  //     }

  //     if (activeFilter) {
  //       const isActive = activeFilter.split("=")[1].toLowerCase() === "true";
  //       if (isActive) {
  //         queryBuilder
  //           .andWhere("ride.paymentStatus = :paymentStatus", {
  //             paymentStatus: RIDE_PAYMENT_STATUS.PAID,
  //           })
  //           .andWhere("ride.status IN (:...statuses)", {
  //             statuses: [
  //               RIDE_STATUS.PENDING,
  //               RIDE_STATUS.HELD,
  //               RIDE_STATUS.RECOVER,
  //             ],
  //           });
  //       }
  //     }

  //     for (const filterItem of otherFilters) {
  //       const [key, value] = filterItem.split(":");
  //       const normalizedValue =
  //         key === "fromAddress" || key === "toAddress"
  //           ? value.replace(/[\s,]/g, "")
  //           : value;
  //       if (
  //         [
  //           "fromAddress",
  //           "toAddress",
  //           "driverComments",
  //           "driverId",
  //           "vehicleId",
  //           "capabilityId",
  //           "status",
  //           "customer.email",
  //           "customer.userName",
  //           "customer.phoneNumber",
  //         ].includes(key)
  //       ) {
  //         if (key.startsWith("customer.")) {
  //           const customerField = key.split(".")[1];
  //           queryBuilder.andWhere(
  //             `customer.${customerField} ILIKE :${customerField}`,
  //             {
  //               [customerField]: `%${value}%`,
  //             }
  //           );
  //         } else if (key === "vehicleId") {
  //           const vehicleIds = value.split(",");
  //           if (vehicleIds.length > 1) {
  //             queryBuilder.andWhere(`ride.vehicleId IN (:...vehicleIds)`, {
  //               vehicleIds,
  //             });
  //           } else {
  //             queryBuilder.andWhere(`ride.vehicleId = :vehicleId`, {
  //               vehicleId: value,
  //             });
  //           }
  //         } else if (key === "driverId") {
  //           const driverIds = value.split(",");
  //           if (driverIds.length > 1) {
  //             queryBuilder.andWhere(`ride.driverId IN (:...driverIds)`, {
  //               driverIds,
  //             });
  //           } else {
  //             queryBuilder.andWhere(`ride.driverId = :driverId`, {
  //               driverId: value,
  //             });
  //           }
  //         } else if (
  //           key === "status" ||
  //           key === "capabilityId" ||
  //           key === "id"
  //         ) {
  //           queryBuilder.andWhere(`ride.${key} = :${key}`, { [key]: value });
  //         } else if (key === "from" || key === "to") {
  //           // Handle date filters
  //           const fromDate = otherFilters
  //             .find((item) => item.startsWith("from:"))
  //             ?.split(":")[1];
  //           const toDate = otherFilters
  //             .find((item) => item.startsWith("to:"))
  //             ?.split(":")[1];

  //           if (fromDate && toDate) {
  //             queryBuilder.andWhere(`ride.createdAt BETWEEN :from AND :to`, {
  //               from: fromDate,
  //               to: toDate,
  //             });
  //           } else if (fromDate) {
  //             queryBuilder.andWhere(`ride.createdAt <= :from`, {
  //               from: fromDate,
  //             });
  //           } else if (toDate) {
  //             queryBuilder.andWhere(`ride.createdAt >= :to`, {
  //               to: toDate,
  //             });
  //           }
  //         } else if (key === "fromAddress" || key === "toAddress") {

  //           queryBuilder.andWhere(`ride.${key} ILIKE :${key}`, {
  //             [key]: `%${normalizedValue}%`,
  //           });
  //         } else {
  //           queryBuilder.andWhere(`ride.${key} ILIKE :${key}`, {
  //             [key]: `%${value}%`,
  //           });
  //         }
  //       }
  //     }
  //   } else {
  //     queryBuilder.where("1 = 1"); // Placeholder condition to satisfy TypeScript
  //   }

  //   if (sort) {
  //     const allSorting = sort.split(",");
  //     for (const sortItem of allSorting) {
  //       const [key, orderDirection] = sortItem.split(":");
  //       queryBuilder.addOrderBy(`ride.${key}`, orderDirection.toUpperCase());
  //     }
  //   }

  //   if (limit) {
  //     queryBuilder.skip((page - 1) * limit).take(limit);
  //   }

  //   try {
  //     this.logger.info(
  //       "service=>list=>Input: %o, %o, %o, %o",
  //       (page - 1) * limit,
  //       limit,
  //       null,
  //       filter
  //     );
  //     const [rows, count] = await queryBuilder.getManyAndCount();
  //     this.logger.info("service=>list=>Output: %o", { rows, count });

  //     return { rows, count };
  //   } catch (err) {
  //     this.logger.error("service=>list=>Error: %o", "internal server error");
  //     throw new Error(err.message);
  //   }
  // }

  async findRides(options) {
    let { page = 1, limit, sort, filter } = options;

    let queryBuilder = this.RideRepository.createQueryBuilder("ride")
      .leftJoinAndSelect("ride.customer", "customer")
      .leftJoinAndSelect("ride.capability", "capability")
      .leftJoinAndSelect("ride.driver", "driver")
      .leftJoinAndSelect("ride.vehicle", "vehicle")
      .leftJoinAndSelect("ride.pickupZone", "pickupZone")
      .leftJoinAndSelect("ride.history", "history")
      .leftJoinAndSelect("history.driver", "historyDriver")

      .andWhere("ride.paymentStatus = :paymentStatus", {
        paymentStatus: RIDE_PAYMENT_STATUS.PAID,
      });

    if (filter) {
      const filters = filter.split("&");

      // Date and Status filters
      const dateFilter = filters.find((f) => f.startsWith("date="));
      const customerFilter = filters.find((f) => f.startsWith("customerId="));
      const driverFilter = filters.find((f) => f.startsWith("driverId="));
      const statusFilter = filters.find((f) => f.startsWith("status="));
      const preBookingFilter = filters.find((f) => f.startsWith("preBooking="));

      const activeFilter = filters.find((f) => f.startsWith("active="));
      const otherFilters = filters.filter(
        (f) =>
          !f.startsWith("date=") &&
          !f.startsWith("status=") &&
          !f.startsWith("active=")
      );

      if (customerFilter) {
        const [customerpart, statuspart] = customerFilter.split("&");
        if (customerpart) {
          const customerId = customerpart.split("=")[1];
          queryBuilder.andWhere("ride.customerId = :customerId", {
            customerId,
          });
        }
        if (statuspart) {
          const statuses = statuspart
            .split("=")[1]
            .split(",")
            .map((status) => status.trim());

          queryBuilder.andWhere("ride.status IN (:...statuses)", { statuses });
        }
      }

      if (driverFilter) {
        const [driverrpart, statuspart] = driverFilter.split("&");
        if (driverrpart) {
          const driverId = driverrpart.split("=")[1];
          queryBuilder.andWhere("ride.driverId = :driverId", {
            driverId,
          });
        }
        if (statuspart) {
          const statuses = statuspart
            .split("=")[1]
            .split(",")
            .map((status) => status.trim());

          queryBuilder.andWhere("ride.status IN (:...statuses)", { statuses });
        }
      }
      if (preBookingFilter && preBookingFilter.split("=")[1] === "true") {
        const isPreBooking =
          preBookingFilter.split("=")[1].toLowerCase() === "true";
        if (isPreBooking) {
          const nowUTCFormatted = getCurrentUTCFormatted();
          queryBuilder
            .andWhere("ride.status IN (:...statuses)", {
              statuses: [RIDE_STATUS.PENDING, RIDE_STATUS.HELD],
            })
            .andWhere("ride.isScheduled = true") // Added condition for isScheduled
            .andWhere("ride.dispatchDueTime > :nowUTC", {
              nowUTC: nowUTCFormatted,
            });
        }
      }

      if (dateFilter) {
        const dateValue = dateFilter.split("=")[1];
        const startDate = new Date(dateValue);
        startDate.setUTCHours(0, 0, 0, 0); // Set start date to the beginning of the day

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1); // Set end date to the next day

        // Format the dates to UTC strings
        const startUTCDate = startDate.toISOString().slice(0, 10);
        const endUTCDate = endDate.toISOString().slice(0, 10);

        queryBuilder.andWhere(
          "ride.dispatchDueTime >= :startDate AND ride.dispatchDueTime < :endDate",
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        );
      }

      if (statusFilter) {
        const statuses = statusFilter
          .split("=")[1]
          .split(",")
          .map((status) => status.trim());
        queryBuilder.andWhere("ride.status IN (:...statuses)", { statuses });
      }

      if (activeFilter) {
        const isActive = activeFilter.split("=")[1].toLowerCase() === "true";
        if (isActive) {
          const nowUTCFormatted = getCurrentUTCFormatted();
          queryBuilder
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
                RIDE_STATUS.FOB_REQUESTED,
                RIDE_STATUS.FOB_DISPATCHED,
                RIDE_STATUS.FOB_ACCEPTED,
                RIDE_STATUS.FOB_REJECTED,
                RIDE_STATUS.OVERRIDE_REQUESTED,
                // RIDE_STATUS.OVERRIDE_DISPATCHED,
                RIDE_STATUS.OVERRIDE_REJECTED,
                RIDE_STATUS.FOB_OVERRIDE_REQUESTED,
                RIDE_STATUS.FOB_OVERRIDE_DISPATCHED,
                RIDE_STATUS.FOB_OVERRIDE_REJECTED,
              ],
            })
            // .andWhere("ride.dispatchDueTime > NOW()");
            .andWhere("ride.dispatchDueTime <= :nowUTC", {
              nowUTC: nowUTCFormatted,
            });
        }
      }

      // Process additional filters
      let fromDate = null;
      let toDate = null;

      for (const filterItem of otherFilters) {
        // Extract key and value from filterItem
        const [key, value] = filterItem.split("=");

        if (!value) {
          console.error(`Value for filter key ${key} is missing.`);
          continue;
        }

        if (key === "from") {
          fromDate = value;
        } else if (key === "to") {
          toDate = value;
        } else {
          // Normalize value for fromAddress and toAddress
          const normalizedValue =
            key === "fromAddress" || key === "toAddress"
              ? value.replace(/[\s,]/g, "")
              : value;

          if (
            [
              "fromAddress",
              "toAddress",
              "driverComments",
              "driverId",
              "vehicleId",
              "capabilityId",
              "status",
              "customer.email",
              "customer.userName",
              "customer.phoneNumber",
              "bookingId",
              "isSchedule",
              "paymentStatus",
            ].includes(key)
          ) {
            if (key.startsWith("customer.")) {
              const customerField = key.split(".")[1];
              const decodedValue = decodeURIComponent(value); // Decode URL encoding
              const sanitizedValue = decodedValue.replace(/\s+/g, ""); // Remove spaces from the value
              queryBuilder.andWhere(
                `REPLACE(customer.${customerField}, ' ', '') ILIKE :${customerField}`,
                {
                  [customerField]: `%${sanitizedValue}%`,
                }
              );
            } else if (key === "vehicleId") {
              const vehicleIds = normalizedValue.split(",");
              if (vehicleIds.length > 1) {
                queryBuilder.andWhere(`ride.vehicleId IN (:...vehicleIds)`, {
                  vehicleIds,
                });
              } else {
                queryBuilder.andWhere(`ride.vehicleId = :vehicleId`, {
                  vehicleId: normalizedValue,
                });
              }
            } else if (key === "driverId") {
              const driverIds = normalizedValue.split(",");
              if (driverIds.length > 1) {
                queryBuilder.andWhere(`ride.driverId IN (:...driverIds)`, {
                  driverIds,
                });
              } else {
                queryBuilder.andWhere(`ride.driverId = :driverId`, {
                  driverId: normalizedValue,
                });
              }
            } else if (key === "fromAddress" || key === "toAddress") {
              // Remove spaces and commas from the database values for matching
              queryBuilder.andWhere(
                `REPLACE(REPLACE(ride.${key}, ' ', ''), ',', '') ILIKE :${key}`,
                {
                  [key]: `%${normalizedValue}%`,
                }
              );
            } else if (key === "capabilityId" || key === "bookingId") {
              queryBuilder.andWhere(`ride.${key} = :${key}`, {
                [key]: normalizedValue,
              });
            } else if (key === "status") {
              const statuses = normalizedValue.split(",");

              if (statuses.length > 1) {
                queryBuilder.andWhere(`ride.status IN (:...statuses)`, {
                  statuses: statuses,
                });
              } else {
                queryBuilder.andWhere(`ride.status = :status`, {
                  status: normalizedValue,
                });
              }
            } else if (key === "isSchedule") {
              const schedules = normalizedValue.split(",");
              if (
                schedules.includes("ACTIVE") &&
                !schedules.includes("PRE_BOOKING")
              ) {
                queryBuilder.andWhere(`ride.isScheduled = false`);
              } else if (
                !schedules.includes("ACTIVE") &&
                schedules.includes("PRE_BOOKING")
              ) {
                queryBuilder.andWhere(`ride.isScheduled = true`);
              }
            } else {
              queryBuilder.andWhere(`ride.${key} = :${key}`, {
                [key]: `${value}`,
              });
            }
          } else {
            this.logger.info(`Filter key ${key} is not handled.`);
          }
        }
      }
      // Apply date filters if `fromDate` and `toDate` are set
      if (fromDate || toDate) {
        if (fromDate && toDate) {
          queryBuilder.andWhere(`ride.dispatchDueTime BETWEEN :from AND :to`, {
            from: fromDate,
            to: toDate,
          });
        } else if (fromDate) {
          queryBuilder.andWhere(`ride.dispatchDueTime >= :from`, {
            from: fromDate,
          });
        } else if (toDate) {
          queryBuilder.andWhere(`ride.dispatchDueTime <= :to`, {
            to: toDate,
          });
        }
      }
    } else {
      queryBuilder.where("1 = 1");
    }

    if (sort) {
      const allSorting = sort.split(",");
      for (const sortItem of allSorting) {
        const [key, orderDirection] = sortItem.split(":");
        queryBuilder.addOrderBy(`ride.${key}`, orderDirection.toUpperCase());
      }
    }

    if (limit) {
      queryBuilder.skip((page - 1) * limit).take(limit);
    }

    try {
      this.logger.info(
        "service=>list=>Input: %o, %o, %o, %o",
        (page - 1) * limit,
        limit,
        null,
        filter
      );
      const [rows, count] = await queryBuilder.getManyAndCount();
      let processRow = [];
      this.logger.info("service=>list=>Output: %o", { rows, count });
      // Query for the latest rejected driverId
      const rejectedStatuses = [
        RIDE_STATUS.REJECTED,
        RIDE_STATUS.FOB_REJECTED,
        RIDE_STATUS.OVERRIDE_REJECTED,
        RIDE_STATUS.FOB_OVERRIDE_REJECTED,
      ];

      const requestedStatuses = [
        RIDE_STATUS.DISPATCHED,
        RIDE_STATUS.FOB_DISPATCHED,
        RIDE_STATUS.FOB_OVERRIDE_DISPATCHED,
        RIDE_STATUS.OVERRIDE_DISPATCHED,
      ];

      for (const ride of rows) {
        const rejectedDriverQuery =
          await this.RideHistoryRepository.createQueryBuilder("history")
            .select("history.driverId")
            .where(
              "history.rideStatus IN (:...status) AND history.rideId= :rideId",
              {
                status: rejectedStatuses,
                rideId: ride.id,
              }
            )
            .leftJoinAndSelect("history.driver", "driver")
            .leftJoinAndSelect("driver.vehicle", "vehicle")
            .orderBy("history.createdAt", "DESC")
            .limit(1)
            .getOne();
        const requestedDriverQuery =
          await this.RideHistoryRepository.createQueryBuilder("history")
            .select("history.driverId")
            .where(
              "history.rideStatus IN (:...status) AND history.rideId= :rideId",
              {
                status: requestedStatuses,
                rideId: ride.id,
              }
            )
            .leftJoinAndSelect("history.driver", "driver")
            .leftJoinAndSelect("driver.vehicle", "vehicle")
            .orderBy("history.createdAt", "DESC")
            .limit(1)
            .getOne();

        let relaeventTime;
        const timeWhenAccepted =
          await this.RideHistoryRepository.createQueryBuilder("history")
            .select("history.createdAt")
            .where("history.rideStatus = :status AND history.rideId= :rideId", {
              status: RIDE_STATUS.ACCEPTED,
              rideId: ride.id,
            })

            .orderBy("history.createdAt", "DESC")
            .limit(1)
            .getOne();

        if (timeWhenAccepted) {
          relaeventTime = GetRelativeTime(timeWhenAccepted?.createdAt);
        }
        if (ride.customer && ride.customer.password) {
          delete ride.customer.password;
        }
        processRow.push({
          ...ride,
          rejectedDriver: rejectedDriverQuery,
          requestedDriver: requestedDriverQuery,
          timeSinceAccepted: relaeventTime,
        });
      }

      return { rows: processRow, count };
    } catch (err) {
      this.logger.error("service=>list=>Error: %o", "internal server error");
      throw new Error(err.message);
    }
  }

  async findLocationHistoryOfRide(id: string, filter?) {
    try {
      const ride = await this.RideRepository.findOne({ where: { id } });
      if (ride) {
        const qb = this.rideLocationHistory
          .createQueryBuilder("rideLocationHistory")
          .where("rideLocationHistory.rideId = :rideId", { rideId: ride.id });
        if (filter?.status) {
          qb.andWhere("rideLocationHistory.rideStatus ILIKE :status", {
            status: `%${filter.status}%`,
          });
        }
        const locationHistory = await qb.getMany();
        return locationHistory;
      }
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async findRideById(id: string) {
    this.logger.info("Service=>findRideById=>Input: %o", id);
    try {
      const ride: any = await this.RideRepository.findOne({
        where: { id: id },
        relations: ["customer", "capability", "driver", "fare", "vehicle"],
      });

      this.logger.info("Service=>findRideById=>Output: %o", ride);
      if (ride) {
        const transactions = await this.transactionService.getTransactions(
          ride?.id
        );
        ride.transactions = transactions;

        const tarrif = await this.tarrifsService.findOne(ride?.fare?.tarrifId);
        ride.fare.tariffShortName = tarrif?.shortName;

        if (ride?.driver?.email) {
          const driverUser = await this.userService.findUserByEmail(
            ride?.driver?.email
          );

          ride.driver.userId = driverUser?.id;

          if (ride.status == RIDE_STATUS.FOB_ACCEPTED) {
            const lastRide = await this.RideRepository.findOne({
              where: {
                driverId: ride.driverId,
                status: In([
                  RIDE_STATUS.ACCEPTED,
                  RIDE_STATUS.ARRIVED,
                  RIDE_STATUS.PICKEDUP,
                  RIDE_STATUS.DROPOFF,
                ]),
              },
            });

            ride.driver.lastRide = lastRide;
          }
        }

        return ride;
      } else {
        this.logger.error(
          "Service=>findRideById=>Error: %o",
          "ride does not exist"
        );
        throw new Error("ride does not exist");
      }
    } catch (err) {
      this.logger.error("Service=>findRideById=>Error: %o", err);
      throw new Error(err.message);
    }
  }

  async dispatchRideByVehicle(rideId: string, userId: string) {
    this.logger.info(
      "Service=>dispatchRideByVehicle=>Input: callSign: %s, rideId: %s",
      // vehicleId,
      rideId
    );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldRide = await this.RideRepository.findOne({
        where: { id: rideId },
      });
      if (oldRide?.status === RIDE_STATUS?.CANCELLED) {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_CANCELLED,
          {
            message: "The Ride has been cancelled.",
            data: {
              rideId: oldRide?.id,
            },
          }
        );
        throw new ConflictException("This ride is cancelled by the customer");
      }
      // Update the ride with the vehicle and driver information
      const response = await queryRunner.manager.update(
        Rides,
        { id: rideId },
        {
          status:
            oldRide?.status == RIDE_STATUS.OVERRIDE_REQUESTED
              ? RIDE_STATUS.OVERRIDE_DISPATCHED
              : RIDE_STATUS.DISPATCHED,
        }
      );

      if (response.affected === 0) {
        throw new Error("Ride not found");
      }

      const updatedRide = await this.RideRepository.findOne({
        where: { id: rideId },
        relations: ["customer", "capability", "driver", "vehicle"],
      });

      if (!updatedRide?.driverId) {
        throw new Error("Please first request the driver.");
      }
      const driverEmail = updatedRide?.driver?.email;
      const driverUser = await this.userService.findUserByEmail(driverEmail);
      await this.addRideChangeHistory({
        rideId: updatedRide.id,
        actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
        rideStatus: RIDE_STATUS.DISPATCHED,
        updatedById: userId,
        updateNote: `Ride Dispatched to Vehicle ${updatedRide?.vehicle?.callSign}`,
        driverId: updatedRide?.driverId,
      });

      await this.notificationService.sendNotification(
        {
          title: "Ride Dispatched",
          type: EPusherEvent.RIDE_DISPATCHED,
          message: NotificationMessages.DISPATCHED,
          data: {
            isNewRideDispatched: "true",
            rideId: updatedRide?.id,
          },
        },
        driverUser?.id,
        true
      );
      await queryRunner.commitTransaction();
      try {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_DISPATCHED,
          {
            message: "Ride has been dipatched",
            data: {
              rideId: updatedRide.id,
              customerId: updatedRide?.customerId,
              driverId: updatedRide?.driverId,
            },
          }
        );
      } catch (e) {
        this.logger.error(e);
      }
      this.logger.info(
        "Service=>dispatchRideByVehicle=>Output: %o",
        updatedRide
      );
      return updatedRide;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>dispatchRideByVehicle=>Error: %o", err);
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async addRideChangeHistory(data: {
    rideId: string;
    actionType: RIDE_HISTORY_ACTION_TYPE;
    rideStatus: RIDE_STATUS;
    updatedById: string;
    updateNote: string;
    driverId?: string;
  }) {
    this.logger.info("Service=>addRideChangeHistory=>Input: %o", data);
    try {
      const history = await this.RideHistoryRepository.create(data);

      const historySaved = await this.RideHistoryRepository.save(history);
      this.logger.info(
        "Service=>addRideChangeHistory=>Ouput: %o",
        historySaved
      );
      return historySaved;
    } catch (err) {
      this.logger.error("Service=>addRideChangeHistory=>Error: %o", err);
      throw new Error(err);
    }
  }

  async findRideHistory(data: { rideId: string }) {
    this.logger.info("Service=>findRideHistory=>Input: %o", data);
    try {
      const history = await this.RideHistoryRepository.find({
        where: { rideId: data.rideId },
        select: {
          driver: {
            id: true,
            firstName: true,
            lastName: true,
            callSign: true,
          },
          updatedBy: {
            id: true,
            userName: true,
            email: true,
          },
        },
        relations: {
          driver: true,
          updatedBy: true,
        },
      });

      this.logger.info("Service=>findRideHistory=>Ouput: %o", history);
      return history;
    } catch (err) {
      this.logger.error("Service=>findRideHistory=>Error: %o", err);
      throw new Error(err);
    }
  }

  async findRideHistoryByRideId(rideId: string): Promise<any[]> {
    try {
      // Load ride history including related ride, updatedBy user, and driver details
      const rideHistory = await this.RideHistoryRepository.find({
        where: { rideId },
        relations: ["ride", "ride.customer", "ride.driver", "ride.vehicle"],
        order: { createdAt: "ASC" },
      });

      if (!rideHistory || rideHistory.length === 0) {
        throw new Error("No ride history found for the specified ride ID.");
      }

      // Ensure user names are included
      const enrichedRideHistory = await Promise.all(
        rideHistory.map(async (history) => {
          const updatedByUser = await this.userService.findUserById(
            history.updatedById
          );

          return {
            ...history,
            updatedBy: updatedByUser?.userName || "Unknown", // Add the user name or 'Unknown' if not found
          };
        })
      );

      return enrichedRideHistory;
    } catch (error) {
      this.logger.error(
        `Failed to find ride history for ride ID ${rideId}: ${error.message}`
      );
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateRideVehicleStatus(
    callSign: string,
    status: string
  ): Promise<string> {
    // Find the vehicle using the callSign
    const vehicle = await this.VehicleRepository.findOne({
      where: { callSign },
    });

    // If the vehicle does not exist, throw an exception
    if (!vehicle) {
      throw new NotFoundException(
        `Vehicle with callSign ${callSign} not found`
      );
    }

    // Find the ride associated with the vehicle
    const ride = await this.RideRepository.findOne({
      where: { vehicleId: vehicle.id },
    });

    // If no ride is found, throw an exception
    if (!ride) {
      throw new NotFoundException(
        `No ride found for vehicle with callSign ${callSign}`
      );
    }

    // Update the status of the ride
    ride.status = status;

    // Save the updated ride
    await this.RideRepository.save(ride);

    // Return success message
    return "success";
  }

  async getRideByCallSign(callSign: string): Promise<{ rideId: string }> {
    try {
      // Find the vehicle by callSign
      const vehicle = await this.VehicleRepository.findOne({
        where: { callSign },
      });
      // If no vehicle is found, throw a NotFoundException
      if (!vehicle) {
        throw new NotFoundException(
          `Vehicle with callSign ${callSign} not found`
        );
      }
      const driver = await this.DriverRepository.findOne({
        where: { currentVehicleId: vehicle?.id },
      });

      // Check if the driver is active and online

      if (!driver) {
        return { rideId: "No fare ride" };
      }

      if (driver.status !== STATUS.ACTIVE || !driver.online) {
        throw new BadRequestException(
          `Driver for vehicle with callSign ${callSign} is not active or online`
        );
      }

      // Find the ride associated with the vehicle and specific statuses
      const ride = await this.RideRepository.findOne({
        where: {
          vehicleId: vehicle.id,
          status: In([
            RIDE_STATUS.PICKEDUP,
            RIDE_STATUS.ACCEPTED,
            RIDE_STATUS.ARRIVED,
            RIDE_STATUS.DROPOFF,
          ]),
        },
      });

      if (!ride) {
        return { rideId: "We have vehicle and driver but no ride" };
      }

      // Return the ride ID if everything is successful
      return { rideId: ride.id };
    } catch (error) {
      this.logger.error(error);
      // Handle and throw the error to be handled by the controller or middleware
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error; // Rethrow the specific exceptions
      }
      throw new InternalServerErrorException("An unexpected error occurred");
    }
  }

  async dispatchRequestedRideByVehicle(
    callSign: string,
    rideId: string
  ): Promise<any> {
    try {
      this.logger.info(
        "Service=>dispatchRequestedRideByVehicle=>Input: %o",
        callSign
      );

      // Step 1: Find the vehicle using the callSign
      const vehicle = await this.VehicleRepository.findOne({
        where: { callSign },
        relations: { capabilities: true }, // Include related capabilities
      });
      if (!vehicle) {
        throw new NotFoundException("Vehicle not found");
      }
      // Step 2: Find the driver associated with the vehicle
      const driver = await this.DriverRepository.findOne({
        where: {
          currentVehicleId: vehicle.id,
          status: STATUS.ACTIVE,
          online: true,
        },
        relations: { capabilities: true },
      });
      if (!driver) {
        throw new NotFoundException("Driver not found or is not available");
      }

      // Step 3: Find the ride using the rideId
      const ride = await this.RideRepository.findOne({
        where: { id: rideId },
        relations: { driver: true },
      });
      if (!ride) {
        throw new NotFoundException("Ride not found");
      }
      if (ride?.status === RIDE_STATUS?.CANCELLED) {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_CANCELLED,
          {
            message: "The Ride has been cancelled.",
            data: {
              rideId: ride?.id,
            },
          }
        );
        throw new ConflictException("This ride is cancelled by the customer");
      }
      const oldDriver = ride?.driver;

      // Step 4: Check if the vehicle is busy with any of the busy statuses
      const busyRide = await this.RideRepository.findOne({
        where: {
          vehicleId: vehicle.id,
          status: In([
            RIDE_STATUS.ACCEPTED,
            RIDE_STATUS.ARRIVED,
            RIDE_STATUS.PICKEDUP,
            RIDE_STATUS.DROPOFF,
          ]),
        },
      });

      if (busyRide) {
        // Case 1: Vehicle is busy
        // Check if the busy ride doesn't have FOB_REQUESTED status
        if (busyRide.status !== RIDE_STATUS.FOB_REQUESTED) {
          return "FOB requested";
        }

        // Since the vehicle is busy and the busy ride has FOB_REQUESTED status,
        // Set the current ride status to OVERRIDE_REQUESTED
        // ride.status = RIDE_STATUS.OVERRIDE_REQUESTED;
      } else {
        // Case 2: Vehicle is not busy
        if (ride?.driverId && ride?.status == RIDE_STATUS.FOB_ACCEPTED) {
          ride.status = RIDE_STATUS.OVERRIDE_REQUESTED;
        } else {
          ride.status = RIDE_STATUS.REQUESTED;
        }
      }

      // Step 5: Validate that the vehicle and driver have the required capabilities for the ride

      const rideCapabilityId = ride.capabilityId;
      if (rideCapabilityId) {
        const vehicleCapabilityIds = vehicle.capabilities?.map(
          (capability) => capability.id
        );

        const driverCapabilityIds = driver.capabilities?.map(
          (capability) => capability.id
        );

        if (
          !vehicleCapabilityIds?.includes(rideCapabilityId) &&
          !driverCapabilityIds?.includes(rideCapabilityId)
        ) {
          // If neither the vehicle nor the driver has the required capabilities, throw an error
          throw new BadRequestException(
            "This vehicle/driver does not possess the necessary capabilities for the booking."
          );
        }
      }
      // Step 6: Assign the vehicleId and driverId to the ride
      ride.vehicleId = vehicle.id;
      ride.driverId = driver.id;
      // ride.driverId = "37074b9c-945e-4601-b8f9-665451f05d3e";
      // Step 7: Save the updated ride in the database
      //await this.RideRepository.save(ride);
      await this.RideRepository.update(
        {
          id: ride.id,
        },
        {
          vehicleId: vehicle.id,
          driverId: driver.id,
          status: ride.status,
        }
      );

      if (ride.status == RIDE_STATUS.FOB_REQUESTED) {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_REQUESTED_FOB,
          {
            message: `Ride has been fob requested`,
            data: {
              rideId: ride.id,
              vehicleId: vehicle.id,
              driverId: driver.id,
              customerId: ride?.customerId,
            },
          }
        );
      }

      if (ride.status === RIDE_STATUS.OVERRIDE_REQUESTED) {
        await this.notificationService.sendNotification(
          {
            title: `Driver Changed`,
            type: EPusherEvent.RIDE_OVERRIDE_REQUESTED,
            message:
              "Please wait, we're arranging a new driver. They will be arriving soon.",
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: ride.id,
            },
          },
          ride?.customerId
        );

        if (oldDriver) {
          const driverEmail = oldDriver?.email;
          const driverUser = await this.userService.findUserByEmail(
            driverEmail
          );
          // Notify the previous driver about the override
          await this.notificationService.sendNotification(
            {
              title: `Ride Override`,
              type: EPusherEvent.RIDE_OVERRIDE_REQUESTED,
              message: "Ride has been overridden by the operator.",
              data: {
                stackName: "HomeStack",
                screenName: "RideDetails",
                rideId: ride.id,
              },
            },
            driverUser?.id,
            true
          );
        }

        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_OVERRIDE_REQUESTED,
          {
            message: `Ride has been fob requested`,
            data: {
              rideId: ride.id,
              vehicleId: vehicle.id,
              driverId: driver.id,
              customerId: ride?.customerId,
            },
          }
        );
      }

      return ride;
    } catch (error) {
      this.logger.error(
        "Service=>dispatchRequestedRideByVehicle=>Error: %o",
        error
      );
      throw error;
    }
  }

  //FOB REQUEST AND RELEASE API BELOW

  async fobRequestedRideByVehicle(
    callSign: string,
    rideId: string,
    userId: string
  ): Promise<Rides | string> {
    try {
      this.logger.info(
        "Service=>fobRequestedRideByVehicle=>Input: %o",
        callSign
      );

      // Step 1: Find the ride

      const ride = await this.RideRepository.findOne({
        where: { id: rideId },
        relations: ["driver"],
      });
      if (!ride) {
        throw new NotFoundException("Ride not found");
      }
      const oldDriver = ride?.driver;

      // Step 2: Find the vehicle using the callSign
      const vehicle = await this.VehicleRepository.findOne({
        where: { callSign },
        relations: { capabilities: true },
      });
      if (!vehicle) {
        throw new NotFoundException("Vehicle not found");
      }

      // Step 3: Check if any driver is assigned to this vehicle and has rides
      const assignedDriver = await this.DriverRepository.findOne({
        where: { currentVehicleId: vehicle.id },
        relations: ["rides", "capabilities"],
      });

      let status: any;

      if (assignedDriver) {
        const hasFOBRequestedRide = assignedDriver.rides.some(
          (r) =>
            r.status === RIDE_STATUS.FOB_REQUESTED ||
            r.status === RIDE_STATUS.FOB_OVERRIDE_REQUESTED ||
            r.status === RIDE_STATUS.FOB_DISPATCHED ||
            r.status === RIDE_STATUS.FOB_ACCEPTED ||
            r.status === RIDE_STATUS.FOB_OVERRIDE_DISPATCHED
        );

        if (hasFOBRequestedRide) {
          throw new NotFoundException("Already have FOB Ride");
        }

        // Determine status based on ride.driverId
        status = ride?.driverId
          ? RIDE_STATUS.FOB_OVERRIDE_REQUESTED
          : RIDE_STATUS.FOB_REQUESTED;
      } else {
        // Set status to FOB_REQUESTED if there's no assigned driver
        status = RIDE_STATUS.FOB_REQUESTED;
      }

      // Step 4: Check capabilities
      const rideCapabilityId = ride.capabilityId;
      if (rideCapabilityId) {
        const vehicleCapabilityIds = vehicle.capabilities?.map(
          (capability) => capability.id
        );

        const driverCapabilityIds = assignedDriver?.capabilities?.map(
          (capability) => capability.id
        );

        if (
          !vehicleCapabilityIds?.includes(rideCapabilityId) &&
          !driverCapabilityIds?.includes(rideCapabilityId)
        ) {
          throw new BadRequestException(
            "This vehicle/driver does not possess the necessary capabilities for the booking."
          );
        }
      }
      const customerId = ride?.customerId;
      // Step 5: Assign vehicle and driver to the ride
      ride.vehicleId = vehicle?.id;
      ride.driverId = assignedDriver?.id ?? null;
      ride.status = status;

      // Step 6: Save the updated ride
      await this.RideRepository.update(
        {
          id: ride.id,
        },
        {
          vehicleId: vehicle.id,
          driverId: assignedDriver.id,
          status: status,
        }
      );
      // await this.RideRepository.save(ride);

      // Step 7: Log ride history
      await this.addRideChangeHistory({
        rideId: ride.id,
        actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
        rideStatus: status,
        updatedById: userId,
        updateNote: `Ride ${status} to Vehicle ${vehicle.callSign}`,
        driverId: ride.driverId,
      });

      // Step 8: Send notifications

      if (status === RIDE_STATUS.FOB_OVERRIDE_REQUESTED) {
        // Notify the customer about the override
        await this.notificationService.sendNotification(
          {
            title: `Driver Changed`,
            type: EPusherEvent.RIDE_OVERRIDE_FOB_REQUESTED,
            message:
              "Please wait, we're arranging a new driver. They will be arriving soon.",
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: ride.id,
            },
          },
          customerId
        );
        const driverEmail = oldDriver?.email;
        const driverUser = await this.userService.findUserByEmail(driverEmail);
        // Notify the previous driver about the override
        await this.notificationService.sendNotification(
          {
            title: `FOB Ride Requested`,
            type: EPusherEvent.RIDE_OVERRIDE_FOB_REQUESTED,
            message: "Ride has been overridden by the operator.",
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: ride.id,
            },
          },
          driverUser?.id,
          true
        );

        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_OVERRIDE_FOB_REQUESTED,
          {
            message: `Ride has been overridden by the operator.`,
            data: {
              rideId: ride.id,
              vehicleId: vehicle.id,
              driverId: ride.driverId,
              customerId: ride?.customerId,
            },
          }
        );
      }

      if (status === RIDE_STATUS.OVERRIDE_REQUESTED) {
        // Notify the customer about the override
        await this.notificationService.sendNotification(
          {
            title: `Driver Changed`,
            type: EPusherEvent.RIDE_OVERRIDE_REQUESTED,
            message:
              "Please wait, we're arranging a new driver. They will be arriving soon.",
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: ride.id,
            },
          },
          customerId
        );
        const driverEmail = oldDriver?.email;
        const driverUser = await this.userService.findUserByEmail(driverEmail);
        // Notify the previous driver about the override
        await this.notificationService.sendNotification(
          {
            title: `FOB Ride Requested`,
            type: EPusherEvent.RIDE_OVERRIDE_REQUESTED,
            message: "Ride has been overridden by the operator.",
            data: {
              stackName: "HomeStack",
              screenName: "RideDetails",
              rideId: ride.id,
            },
          },
          driverUser?.id,
          true
        );

        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_OVERRIDE_FOB_REQUESTED,
          {
            message: `Ride has been overridden by the operator.`,
            data: {
              rideId: ride.id,
              vehicleId: vehicle.id,
              driverId: ride.driverId,
              customerId: ride?.customerId,
            },
          }
        );
      }
      if (status === RIDE_STATUS.FOB_REQUESTED) {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_REQUESTED_FOB,
          {
            message: `Ride has been requested by the operator.`,
            data: {
              rideId: ride.id,
              vehicleId: vehicle.id,
              driverId: ride.driverId,
              customerId: ride?.customerId,
            },
          }
        );
      }

      // Step 9: Trigger a Pusher event

      return ride;
    } catch (error) {
      this.logger.error("Service=>fobRequestedRideByVehicle=>Error: %o", error);
      throw error;
    }
  }

  async fobDisptachedRideByVehicle(
    rideId: string,
    userId: string
  ): Promise<Rides> {
    this.logger.info(
      "Service=>fobDisptachedRideByVehicle=>Input: rideId: %s",
      rideId
    );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Find the ride and check if it has a driver assigned
      const updatedRide = await this.RideRepository.findOne({
        where: { id: rideId },
        relations: ["customer", "capability", "driver", "vehicle"],
      });

      if (!updatedRide) {
        throw new Error("Ride not found");
      }

      if (!updatedRide.driverId) {
        throw new Error("Please first request the driver.");
      }

      if (
        updatedRide.status !== RIDE_STATUS.FOB_REQUESTED &&
        updatedRide.status !== RIDE_STATUS.FOB_OVERRIDE_REQUESTED
      ) {
        throw new Error("Please first request the driver.");
      }

      // Step 3: Set the ride status based on the driver's availability
      let rideStatus;
      if (updatedRide.status === RIDE_STATUS.FOB_OVERRIDE_REQUESTED) {
        // If the driver is busy with another ride, set to FOB_OVERRIDE_DISPATCHED
        rideStatus = RIDE_STATUS.FOB_OVERRIDE_DISPATCHED;
      } else {
        // If the driver is not busy, set to FOB_DISPATCHED
        rideStatus = RIDE_STATUS.FOB_DISPATCHED;
      }

      // Update the ride with the appropriate status
      const response = await queryRunner.manager.update(
        Rides,
        { id: rideId },
        {
          status: rideStatus,
        }
      );

      if (response.affected === 0) {
        throw new Error("Ride not found");
      }

      // Step 4: Log the ride change history
      const driverEmail = updatedRide?.driver?.email;
      const driverUser = await this.userService.findUserByEmail(driverEmail);
      await this.addRideChangeHistory({
        rideId: updatedRide.id,
        actionType: RIDE_HISTORY_ACTION_TYPE.MODIFIED,
        rideStatus: rideStatus,
        updatedById: userId,
        updateNote: `Ride ${rideStatus} to Vehicle ${updatedRide?.vehicle?.callSign}`,
        driverId: updatedRide?.driverId,
      });

      // Step 5: Send notification to the driver
      await this.notificationService.sendNotification(
        {
          title: `FOB Ride Dispatched`,
          type: EPusherEvent.RIDE_DISPATCHED_FOB,
          message: "You have a follow-on booking offer",
          data: {
            isFOBRideDispatched: "true",
            rideId: updatedRide?.id,
          },
        },
        driverUser?.id,
        true
      );

      await queryRunner.commitTransaction();

      // Step 6: Trigger a pusher event
      try {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.RIDE_DISPATCHED_FOB,
          {
            message: "You have a follow-on booking offer",
            data: {
              rideId: updatedRide.id,
              customerId: updatedRide?.customerId,
              driverId: updatedRide?.driverId,
            },
          }
        );
      } catch (e) {
        this.logger.error(e);
      }

      this.logger.info(
        "Service=>fobDisptachedRideByVehicle=>Output: %o",
        updatedRide
      );
      return updatedRide;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>fobDisptachedRideByVehicle=>Error: %o", err);
      throw new Error(err);
    } finally {
      await queryRunner.release();
    }
  }

  async findVehicleQueryDetails(id: string) {
    this.logger.info("Service=>findVehicleQueryDetails=>Input: %o", id);
    try {
      const ride: any = await this.RideRepository.findOne({
        where: { id: id },
        relations: [
          "driver",
          "driver.capabilities",
          "vehicle",
          "vehicle.capabilities",
          "fare",
          "destinationZone",
          "customer",
        ],
      });

      this.logger.info("Service=>findVehicleQueryDetails=>Output: %o", ride);
      if (ride) {
        const tarrif = await this.tarrifsService.findOne(ride?.fare?.tarrifId);
        ride.fare.tariffShortName = tarrif?.shortName;

        // Exclude the password field from the customer object
        if (ride.customer) {
          delete ride.customer.password;
        }

        let etaToDestination: string | null = null;

        // Calculate time remaining to reach destination using getDistanceAndTime
        if (ride.dispatchDueTime) {
          // Log the dispatchDueTime

          const destination = `${ride.toLatitude},${ride.toLongitude}`;
          const origin = `${ride?.driver?.latitude},${ride?.driver?.longitude}`;

          let distanceToDestination: number | null = null;
          let isSoonToBeClear: boolean;

          try {
            const { routeDistance, routeDuration } =
              await this.tarrifsService.getDistanceAndTime(origin, destination);

            // Convert distance from meters to miles
            const distanceInMiles = routeDistance.value * 0.000621371;
            distanceToDestination = distanceInMiles; // Assign the converted distance to distanceToDestination

            isSoonToBeClear = distanceToDestination <= 0.3;

            // Convert duration from seconds to a human-readable format
            const duration = moment.duration(routeDuration.value, "seconds");
            const etaHours = Math.floor(duration.asHours());
            const etaMinutes = duration.minutes();

            let etaStr = "";
            if (etaHours > 0) {
              etaStr += `${etaHours} hours `;
            }
            if (etaMinutes > 0) {
              etaStr += `${etaMinutes} minutes `;
            }

            etaToDestination = etaStr; // Assign the formatted ETA to etaToDestination
            ride.isSoonToBeClear = isSoonToBeClear;
          } catch (error) {
            this.logger.error(error);
          }

          ride.soontoClear = etaToDestination;

          if (ride.destinationZone) {
            // Get all rides in the same destination zone
            const status = In([
              RIDE_STATUS.ACCEPTED,
              RIDE_STATUS.ARRIVED,
              RIDE_STATUS.PICKEDUP,
              RIDE_STATUS.DROPOFF,
            ]);

            const ridesInZone: any = await this.RideRepository.find({
              where: {
                destinationZoneId: ride.destinationZone?.id,
                status,
              },
              relations: ["driver"], // Ensure the driver relation is included
            });
            // Calculate distance or ETA for each ride to sort them
            const ridesWithDistance = await Promise.all(
              ridesInZone.map(async (r) => {
                const destination = `${r.toLatitude},${r.toLongitude}`;
                const origin = `${r?.driver?.latitude},${r?.driver?.longitude}`;

                try {
                  const { routeDuration } =
                    await this.tarrifsService.getDistanceAndTime(
                      origin,
                      destination
                    );
                  const etaInSeconds = moment
                    .duration(routeDuration.value, "seconds")
                    .asSeconds();
                  return { ...r, etaInSeconds };
                } catch (error) {
                  this.logger.error(error);
                  return { ...r, etaInSeconds: Number.MAX_SAFE_INTEGER };
                }
              })
            );

            // Sort rides based on ETA
            const sortedRides = ridesWithDistance.sort(
              (a, b) => a.etaInSeconds - b.etaInSeconds
            );

            // Assign position based on sorted rides
            ride.position = sortedRides.findIndex((r) => r.id === ride.id) + 1;
          } else {
            ride.position = 1;
          }
        } else {
          ride.soontoClear = null;
          ride.position = 1;
        }

        const destination = `${ride.fromLatitude},${ride.fromLongitude}`;
        const origin = `${ride?.driver?.latitude},${ride?.driver?.longitude}`;

        let distanceToPickup: number | null = null;
        let etaToPickup: string | null = null;

        try {
          const { routeDistance, routeDuration } =
            await this.tarrifsService.getDistanceAndTime(origin, destination);

          // Convert distance from meters to miles
          const distanceInMiles = routeDistance.value * 0.000621371;
          distanceToPickup = distanceInMiles; // Assign the converted distance to distanceToPickup

          // Convert duration from seconds to a human-readable format
          const duration = moment.duration(routeDuration.value, "seconds");
          const etaHours = Math.floor(duration.asHours());
          const etaMinutes = duration.minutes();

          let etaStr = "";
          if (etaHours > 0) {
            etaStr += `${etaHours} hours `;
          }
          if (etaMinutes > 0) {
            etaStr += `${etaMinutes} minutes `;
          }

          etaToPickup = etaStr; // Assign the formatted ETA to etaToPickup
        } catch (error) {
          this.logger.error(error);
        }

        ride.distanceToPickup = distanceToPickup;
        ride.ETAToPickup = etaToPickup;

        const rejectedCount = await this.RideHistoryRepository.count({
          where: {
            rideId: id,
            rideStatus: RIDE_STATUS.REJECTED,
          },
        });

        const recoverCount = await this.RideHistoryRepository.count({
          where: {
            rideId: id,
            rideStatus: RIDE_STATUS.RECOVER,
          },
        });

        // Include counts in the response
        return {
          ...ride,
          recoverCount,
          rejectedCount,
        };
      } else {
        this.logger.error(
          "Service=>findVehicleQueryDetails=>Error: %o",
          "ride does not exist"
        );
        throw new Error("ride does not exist");
      }
    } catch (err) {
      this.logger.error("Service=>findVehicleQueryDetails=>Error: %o", err);
      throw new Error(err.message);
    }
  }

  async findOneVehicleQueryDetails(callSign: string): Promise<any> {
    this.logger.info(
      "Service=>findOneVehicleQueryDetails=>Input: %o",
      callSign
    );

    try {
      const vehicle = await this.VehicleRepository.findOne({
        where: { callSign },
        relations: ["capabilities"],
      });

      if (!vehicle) {
        this.logger.error(
          "Service=>findOneVehicleQueryDetails=>Error: %o",
          `Vehicle with callSign ${callSign} not found`
        );
        throw new NotFoundException(
          `Vehicle with callSign ${callSign} not found`
        );
      }

      const driver = await this.DriverRepository.findOne({
        where: {
          currentVehicleId: vehicle.id,
          status: STATUS.ACTIVE,
          online: true,
        },
      });

      if (!driver) {
        this.logger.error(
          "Service=>findOneVehicleQueryDetails=>Error: %o",
          `Driver not found or may be not available or active`
        );
        throw new NotFoundException(
          `Driver not found or may be not available or active`
        );
      }

      const previousRide: any = await this.RideRepository.findOne({
        where: {
          vehicleId: vehicle?.id, // First, ensure the ride is linked to the current vehicle's driver
          driverId: driver?.id, // Use the driver's ID to ensure it's their ride
        },
        relations: ["fare", "destinationZone", "customer", "driver", "vehicle"],
        order: { dispatchDueTime: "DESC" }, // Get the most recent ride
      });

      // Check if the previous ride was marked as NO_FARE

      const isNoFare = previousRide
        ? previousRide.status === RIDE_STATUS.NO_FARE
        : false;

      // If no ride or no NO_FARE status is found, return the vehicle and driver details as usual
      if (!previousRide || !isNoFare) {
        return { vehicle, driver, isNoFare: false }; // No previous ride or not NO_FARE
      }

      const ride: any = await this.RideRepository.findOne({
        where: {
          vehicleId: vehicle?.id,
          status: In([
            RIDE_STATUS.PICKEDUP,
            RIDE_STATUS.ACCEPTED,
            RIDE_STATUS.ARRIVED,
            RIDE_STATUS.DROPOFF,
          ]),
        },
        relations: ["fare", "destinationZone", "customer", "driver", "vehicle"],
      });

      if (ride) {
        const tarrif = await this.tarrifsService.findOne(ride?.fare?.tarrifId);
        ride.fare.tariffShortName = tarrif?.shortName;

        if (ride.customer) {
          delete ride.customer.password;
        }

        let etaToDestination: string | null = null;

        if (ride.dispatchDueTime) {
          const destination = `${ride.toLatitude},${ride.toLongitude}`;
          const origin = `${ride.driver?.latitude},${ride.driver?.longitude}`;

          let distanceToDestination: number | null = null;

          try {
            const { routeDistance, routeDuration } =
              await this.tarrifsService.getDistanceAndTime(origin, destination);

            const distanceInMiles = routeDistance?.value * 0.000621371;
            distanceToDestination = distanceInMiles;

            const duration = moment.duration(routeDuration?.value, "seconds");
            const etaHours = Math.floor(duration.asHours());
            const etaMinutes = duration.minutes();

            let etaStr = "";
            if (etaHours > 0) {
              etaStr += `${etaHours} hours `;
            }
            if (etaMinutes > 0) {
              etaStr += `${etaMinutes} minutes `;
            }

            etaToDestination = etaStr;
          } catch (error) {
            this.logger.error(error);
          }

          ride.soontoClear = etaToDestination;

          if (ride.destinationZone) {
            // const drivers = await this.DriverRepository.createQueryBuilder(
            //   "driver"
            // )
            //   .where(
            //     `
            //       ST_Contains(
            //         ST_GeomFromGeoJSON(:zoneGeometry),
            //         ST_SetSRID(ST_MakePoint(driver.longitude, driver.latitude), 4326)
            //       )
            //     `
            //   )
            //   .setParameter("zoneGeometry", ride.destinationZone?.geometry)
            //   .getMany();

            const status = In([
              RIDE_STATUS.ACCEPTED,
              RIDE_STATUS.ARRIVED,
              RIDE_STATUS.PICKEDUP,
              RIDE_STATUS.DROPOFF,
            ]);

            // Get all rides in the same destination zone
            const ridesInZone: any = await this.RideRepository.find({
              where: {
                destinationZoneId: ride.destinationZone?.id,
                status,
              },
              relations: ["driver"], // Ensure the driver relation is included
            });

            // Calculate distance or ETA for each ride to sort them
            const ridesWithDistance = await Promise.all(
              ridesInZone.map(async (r) => {
                const destination = `${r.toLatitude},${r.toLongitude}`;
                const origin = `${r.driver?.latitude},${r.driver?.longitude}`;

                try {
                  const { routeDuration } =
                    await this.tarrifsService.getDistanceAndTime(
                      origin,
                      destination
                    );
                  const etaInSeconds = moment
                    .duration(routeDuration.value, "seconds")
                    .asSeconds();
                  return { ...r, etaInSeconds };
                } catch (error) {
                  this.logger.error(error);
                  return { ...r, etaInSeconds: Number.MAX_SAFE_INTEGER };
                }
              })
            );

            // Sort rides based on ETA
            const sortedRides = ridesWithDistance.sort(
              (a, b) => a.etaInSeconds - b.etaInSeconds
            );

            // Assign position based on sorted rides
            ride.position = sortedRides.findIndex((r) => r.id === ride.id) + 1;
          } else {
            ride.position = 1;
          }
        } else {
          ride.soontoClear = null;
          ride.position = 1;
        }

        const destination = `${ride.fromLatitude},${ride.fromLongitude}`;
        const origin = `${ride.driver?.latitude},${ride.driver?.longitude}`;

        let distanceToPickup: number | null = null;
        let etaToPickup: string | null = null;

        try {
          const { routeDistance, routeDuration } =
            await this.tarrifsService.getDistanceAndTime(origin, destination);

          const distanceInMiles = routeDistance?.value * 0.000621371;
          distanceToPickup = distanceInMiles;

          const duration = moment.duration(routeDuration?.value, "seconds");
          const etaHours = Math.floor(duration.asHours());
          const etaMinutes = duration.minutes();

          let etaStr = "";
          if (etaHours > 0) {
            etaStr += `${etaHours} hours `;
          }
          if (etaMinutes > 0) {
            etaStr += `${etaMinutes} minutes `;
          }

          etaToPickup = etaStr;
        } catch (error) {
          this.logger.error(error);
        }

        ride.distanceToPickup = distanceToPickup;
        ride.ETAToPickup = etaToPickup;

        const rejectedCount = await this.RideHistoryRepository.count({
          where: {
            rideId: ride.id,
            rideStatus: RIDE_STATUS.REJECTED,
          },
        });

        const recoverCount = await this.RideHistoryRepository.count({
          where: {
            rideId: ride.id,
            rideStatus: RIDE_STATUS.RECOVER,
          },
        });

        return {
          ride,
          recoverCount,
          rejectedCount,
          soontoClear: ride.soontoClear,
          position: ride.position,
          distanceToPickup: ride.distanceToPickup,
          etaToPickup: ride.ETAToPickup,
        };
      } else {
        return { vehicle, driver, isNoFare };
      }
    } catch (err) {
      this.logger.error("Service=>findOneVehicleQueryDetails=>Error: %o", err);
      throw new Error(err.message);
    }
  }

  async findRidesByDriverId(driverId: string | undefined): Promise<any> {
    try {
      this.logger.error("Service=>findRidesByDriverId=>Input: %o", driverId);

      if (!driverId) {
        throw new NotFoundException(`Driver not found`);
      }
      const rides = await this.RideRepository.find({
        where: { driverId: driverId },
      });

      return rides;
    } catch (error) {
      this.logger.error("Service=>findRidesByDriverId=>Error: %o", error);
      throw new Error(error.message);
    }
  }
}
