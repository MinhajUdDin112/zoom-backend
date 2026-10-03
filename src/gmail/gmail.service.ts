// src/gmail/gmail.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private authClient: any;

  constructor(private configService: ConfigService) {
    const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

    const JWT = google.auth.JWT;

    const authClient = new JWT({
      keyFile: "zoomcars-service-account.json",
      scopes: SCOPES,
      subject: "info@zoomcars.org", // google admin email address to impersonate
    });

    this.authClient = authClient;
  }

  async sendEmail(to: string, subject: string, body: string) {
    try {
      await this.authClient.authorize();

      const gmail = google.gmail({ version: "v1", auth: this.authClient });
      const email = [
        `To: ${to}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${subject}`,
        "",
        body,
      ].join("\n");

      const encodedMessage = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
    }
  }
}
