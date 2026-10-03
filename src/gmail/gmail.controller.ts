import { Controller } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { GmailService } from "./gmail.service";

@Controller()
export class GmailController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly logger: PinoLogger
  ) {
    logger.setContext(GmailController.name);
  }
}
