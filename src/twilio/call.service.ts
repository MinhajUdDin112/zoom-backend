import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { Twilio, jwt as TwilioJwt } from "twilio";

const { AccessToken } = TwilioJwt;
const { VoiceGrant } = AccessToken;

@Injectable()
export class CallService {
  private readonly client: Twilio;

  constructor(private readonly logger: PinoLogger) {
    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async generateAccessToken(identity: string) {
    try {
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioApiKey = process.env.TWILIO_API_KEY;
      const twilioApiSecret = process.env.TWILIO_API_SECRET;
      const outgoingApplicationSid =
        process.env.TWILIO_OUTGOING_APPLICATION_SID;

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: outgoingApplicationSid,
        incomingAllow: true, // Optional: add to allow incoming calls
      });

      const token = new AccessToken(
        twilioAccountSid,
        twilioApiKey,
        twilioApiSecret,
        { identity: identity }
      );

      token.addGrant(voiceGrant);

      this.logger.info("Call Service=>calls=>Access Tokem: %o", token.toJwt());

      return token.toJwt();
    } catch (e) {
      this.logger.error(e);
      throw new Error(e.message);
    }
  }
}
