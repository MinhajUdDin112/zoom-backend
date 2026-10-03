import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeviceToken } from "./entity/device-token.entity";
import { ILike, Repository } from "typeorm";
import { PinoLogger } from "nestjs-pino";
import { DeviceTokenDTO, NotificationDTO } from "./dto/deviceToken.dto";
import { GetUserDTO } from "src/users/dto/user.dto";
import { Users } from "src/users/user.entity";
import { UsersService } from "src/users/users.service";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { Notification } from "./entity/notification.entity";
import firebase from "firebase-admin";
import {
  GetAllDTO,
  QueryOptionsDTO,
} from "src/capability/dto/createCapabaility.dto";
import { Message } from "firebase-admin/lib/messaging/messaging-api";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly usersService: UsersService,
    private readonly logger: PinoLogger
  ) {}

  async createDeviceToken(user: GetUserDTO, data: DeviceTokenDTO) {
    try {
      this.logger.info("Controller=>createDeviceToken=>Input: %o", user, data);
      const userExist = await this.usersService.findUserById(user.id);
      if (!userExist) {
        this.logger.info(
          "Controller=>createDeviceToken=>Error: %o",
          ERROR_MESSAGE.USER_NOT_FOUND
        );
        throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
      }
      const deviceTokenExist = await this.deviceTokenRepository.findOne({
        where: {
          deviceToken: data.deviceToken,
          userId: user.id,
        },
      });
      if (deviceTokenExist) {
        return deviceTokenExist;
      }
      const deviceToken = new DeviceToken();
      deviceToken.deviceToken = data.deviceToken;
      deviceToken.os = data.os;
      deviceToken.userId = user.id;
      const deviceTokenAdded = this.deviceTokenRepository.save(deviceToken);
      this.logger.info(
        "Controller=>createDeviceToken=>Output: %o",
        deviceTokenAdded
      );
      return deviceTokenAdded;
    } catch (err) {
      this.logger.error("Controller=>createDeviceToken=>Error: %o", err);
      throw err;
    }
  }
  async sendNotification(
    data: NotificationDTO,
    userId: string,
    isSound: boolean = false
  ) {
    try {
      this.logger.info("Service=>sendNotification=>Input: %o %o", data, userId);
      const deviceTokens = await this.deviceTokenRepository.find({
        where: { userId },
      });
      let responses = 0;
      // // Promise.allSettled()

      // const sendPromises = messages.map((message) => {
      //   return firebase.messaging().send(message);
      // });
      // const responses = Promise.all(sendPromises);
      for (let index = 0; index < deviceTokens?.length; index++) {
        const element = deviceTokens[index];
        const message: Message = {
          token: element?.deviceToken,
          notification: {
            title: data.title,
            body: data.message,
          },
          data: {
            type: data?.type,
            ...data?.data,
          },
        };

        if (isSound) {
          // Android Only
          message["android"] = {
            priority: "high",
            data: {
              channelId: "important_notification",
            },
            notification: {
              channelId: "important_notification",
            },
          };
          // iOS Only
          message["apns"] = {
            payload: {
              aps: {
                contentAvailable: true,
                sound: {
                  name: "ride_request_sound.mp3",
                  // critical: true,
                  volume: 1,
                },
              },
            },
          };
        }
        try {
          const result = await firebase.messaging().send(message);
          if (result) {
            this.logger.info("Notification sent ", result);
            responses = responses + 1;
          }
        } catch (e) {
          this.logger.error("Error sending notification %o", e);
        }
      }
      const object = new Notification();
      object.message = data.message;
      object.type = data.type;
      object.title = data.title;
      object.userId = userId;
      const notificationSaved = await this.notificationRepository.save(object);
      this.logger.info(
        "Service=>sendNotification=>Output: %o  %o",
        notificationSaved
      );
      return notificationSaved;
    } catch (err) {
      this.logger.error("Service=>sendNotification=>Error: %o", err);
      throw err;
    }
  }

  async getAllNotifications(options: GetAllDTO) {
    let skip: number | undefined;
    let take: number | undefined;

    // Check if page and limit are provided
    if (options.page && options.limit) {
      skip = (options.page - 1) * options.limit;
      take = options.limit;
    }
    let sortBy = options.sort;
    let where = {};
    let orConditions = [];
    let { filter, search } = options;
    let typeSearch: string = search?.replace(/\s+/g, "_");
    if (search) {
      orConditions.push(
        { title: ILike(`%${search}%`) },
        { message: ILike(`%${search}%`) },
        { type: ILike(`%${typeSearch}%`) }
      );
    }
    if (orConditions.length > 0) {
      where = orConditions;
    }
    if (filter) {
      const filterArray = filter.split("&");
      for (const filterItem of filterArray) {
        const [key, val] = filterItem.split(":");
        where = { ...where, [key]: val };
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
    let queryOptions: QueryOptionsDTO = {
      skip,
      take,
    };
    if (Object.keys(where).length > 0) {
      queryOptions.where = where;
    }
    try {
      const notifications = await this.notificationRepository.findAndCount({
        ...queryOptions,
        order,
      });
      let response = {
        rows: notifications[0],
        count: notifications[1],
      };
      this.logger.info("service=>getAllNotifications=>Output: %o", response);
      return response;
    } catch (err) {
      this.logger.error("Service=>getAllNotifications=>Error: %o", err);
      throw new BadRequestException(err);
    }
  }
}
