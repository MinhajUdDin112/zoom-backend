import { Controller, Post, Body, Get, Param, Delete } from "@nestjs/common";
import { ChatService } from "./chat.service";

@Controller("api/chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("create-channel")
  async createChannel(
    @Body("uniqueName") uniqueName: string,
    @Body("participants") participants: string[]
  ) {
    return this.chatService.createConversation(uniqueName, participants);
  }

  @Post("getToken")
  async getToken(@Body("identity") identity: string) {
    return this.chatService.generateAccessToken(identity);
  }

  @Post("send-message")
  async sendMessage(
    @Body("conversationSid") conversationSid: string,
    @Body("body") body: string,
    @Body("from") from: string,
    @Body("to") to: string,
    @Body("rideId") rideId?: string
  ) {
    return this.chatService.sendMessage(
      conversationSid,
      body,
      from,
      to,
      rideId
    );
  }

  @Get("messages/:conversationSid")
  async getMessages(@Param("conversationSid") conversationSid: string) {
    return this.chatService.getMessages(conversationSid);
  }

  @Delete("delete-message")
  async deleteMessage(
    @Body("conversationSid") conversationSid: string,
    @Body("messageSid") messageSid: string
  ) {
    return this.chatService.deleteMessage(conversationSid, messageSid);
  }
}
