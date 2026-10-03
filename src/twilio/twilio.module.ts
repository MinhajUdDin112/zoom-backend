import { Module } from "@nestjs/common";
import { CallService } from "./call.service";
import { CallController } from "./call.controller";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { NotificationModule } from "src/notification/notification.module";
import { UsersModule } from "src/users/users.module";
import { DriverModule } from "src/driver/driver.module";
import { PusherModule } from "src/pusher/pusher.module";

@Module({
  imports: [NotificationModule, UsersModule, DriverModule, PusherModule],
  providers: [CallService, ChatService],
  controllers: [CallController, ChatController],
  exports: [ChatService],
})
export class TwilioModule {}
