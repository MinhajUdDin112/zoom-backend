import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { DriversService } from "src/driver/driver.service";
import { NotificationService } from "src/notification/notification.service";
import { EPusherChannel, EPusherEvent } from "src/pusher/pusher.enum";
import { PusherService } from "src/pusher/pusher.service";
import { Role } from "src/users/enums/users.enum";
import { UsersService } from "src/users/users.service";
import { Twilio, jwt as TwilioJwt } from "twilio";

const { AccessToken } = TwilioJwt;
const { ChatGrant } = AccessToken;

@Injectable()
export class ChatService {
  private client: Twilio;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: PinoLogger,
    private readonly userService: UsersService,
    private readonly driverService: DriversService,
    private readonly pusherService: PusherService
  ) {
    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async createConversationParticipant(conversation, participants: string[]) {
    for (const identity of participants) {
      try {
        await this.client.conversations.v1
          .conversations(conversation.sid)
          .participants.create({ identity });
      } catch (error) {
        this.logger.error(error);
        console.error(`Failed to add participant ${identity}:`, error);
      }
    }
  }

  async generateAccessToken(identity: string) {
    try {
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioApiKey = process.env.TWILIO_API_KEY;
      const twilioApiSecret = process.env.TWILIO_API_SECRET;
      const serviceSid = process.env.TWILIO_CHAT_SERVICE_SID;

      const chatGrant = new ChatGrant({
        serviceSid: serviceSid,
      });

      const token = new AccessToken(
        twilioAccountSid,
        twilioApiKey,
        twilioApiSecret,
        { identity: identity }
      );

      token.addGrant(chatGrant);

      this.logger.info("Chat Service=>chat=>Access Tokem: %o", token.toJwt());

      return token.toJwt();
    } catch (e) {
      this.logger.error(e);
      throw new Error(e.message);
    }
  }

  async createConversation(uniqueName: string, participants: string[]) {
    try {
      const conversation =
        await this.client.conversations.v1.conversations.create({ uniqueName });
      await this.createConversationParticipant(conversation, participants);
      return conversation;
    } catch (e) {
      this.logger.error(e);
      throw new Error(e.message);
    }
  }

  async sendMessage(
    conversationSid: string,
    body: string,
    from: string,
    to: string,
    rideId?: string
  ) {
    try {
      const participants = await this.client.conversations.v1
        .conversations(conversationSid)
        .participants.list();
      const isParticipant = participants.some(
        (participant) => participant.identity === from
      );

      if (!isParticipant) {
        throw new Error("User is not a participant in this conversation");
      }

      const message = await this.client.conversations.v1
        .conversations(conversationSid)
        .messages.create({ body, author: from });
      // implement notification code here

      const sender = await this.userService.findUserById(from);
      const receiver = await this.userService.findUserById(to);
      let driverId;
      let senderData = {
        id: sender?.id,
        name: sender?.userName,
        profilePicUrl: undefined,
        phoneNumber: sender?.phoneNumber,
      };
      let receiverData = {
        id: receiver?.id,
        name: receiver?.userName,
        profilePicUrl: undefined,
        phoneNumber: receiver?.phoneNumber,
      };
      if (sender && sender?.role == Role.DRIVER) {
        const driver = await this.driverService.findDriverByEmail(
          sender?.email
        );
        senderData.profilePicUrl = driver?.profileImageUrl;
        driverId = driver?.id;
      }
      if (receiver && receiver?.role == Role.DRIVER) {
        const driver = await this.driverService.findDriverByEmail(
          receiver?.email
        );
        receiverData.profilePicUrl = driver?.profileImageUrl;
        driverId = driver?.id;
      }

      await this.pusherService.trigger(
        EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
        EPusherEvent.CHAT_NEW_MESSAGE,
        {
          message: "A new chat message has been sent",
          data: {
            rideId: rideId || "",
            conversationSid: conversationSid,
            senderId: from,
            receiverId: to,
            driverId: driverId,
          },
        }
      );

      await this.notificationService.sendNotification(
        {
          title: "You have got a new message",
          type: EPusherEvent.CHAT_NEW_MESSAGE,
          message: body,
          data: {
            rideId: rideId || "",
            conversationSid,
            receiver: JSON.stringify(receiverData),
            sender: JSON.stringify(senderData),
          },
        },
        to,
        true // NOTE: Pass this along with the other body parameters if you want to play the sound only for the driver.
      );

      return message;
    } catch (e) {
      this.logger.error(e);
      throw new Error(e?.message);
    }
  }

  async getMessages(conversationSid: string) {
    try {
      return this.client.conversations.v1
        .conversations(conversationSid)
        .messages.list();
    } catch (e) {
      this.logger.error(e);
      throw new Error(e.message);
    }
  }

  async deleteMessage(conversationSid: string, messageSid: string) {
    try {
      return this.client.conversations.v1
        .conversations(conversationSid)
        .messages(messageSid)
        .remove();
    } catch (e) {
      this.logger.error(e);
      throw new Error(e.message);
    }
  }
}
