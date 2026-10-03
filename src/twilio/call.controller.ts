import { Controller, Post, Body } from "@nestjs/common";
import { CallService } from "../twilio/call.service";

@Controller("api/calls")
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('getToken')
  async getToken(@Body('identity') identity: string) {
    return this.callService.generateAccessToken(identity);
  }

}
