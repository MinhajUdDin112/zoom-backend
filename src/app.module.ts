import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import configuration from "./config";
import { LoggerModule, PinoLogger } from "nestjs-pino";
import { UtilsModule } from "./utils/utils.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { DriverModule } from "./driver/driver.module";
import { DocumentModule } from "./documents/document.module";
import { DriverGroupModule } from "./driverGroups/driverGroup.module";
import { VehicleModule } from "./vehicles/vehicle.module";
import { CapabilityChargesModule } from "./capabilityCharges/capabilityCharges.module";
import { CapabilityModule } from "./capability/capability.module";
import { TemplatesModule } from "./templates/templates.module";
import { RideModule } from "./rides/rides.module";
import { LiscenseModule } from "./liscense/liscense.module";
import { JwtModule } from "@nestjs/jwt";
import { AreaGroupModule } from "./AreaGroup/areaGroup.module";
import { TarrifsModule } from "./tarrifs/tarrifs.module";
import { GmailsModule } from "./gmail/gmail.module";
import { StripeModule } from "./stripe/stripe.module";
import { ZoneModule } from "./zone/zone.module";
import { TwilioModule } from "./twilio/twilio.module";
import { NotificationModule } from "./notification/notification.module";
import { TransactionModule } from "./transaction/transaction.module";
import { RatingModule } from "./rating/rating.module";
import { S3Module } from "./S3/s3.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get("database"),
      inject: [ConfigService],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        pinoHttp: {
          safe: true,
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              // ignore: 'hostname,pid, req.headers, res',
              ignore: "pid,req,res",
              messageFormat: true, // --messageFormat
              singleLine: true, // --singleLine
              timestamp: `,"time":"${new Date(Date.now())}"`,
            },
          },
          level: process.env.PINO_LOG_LEVEL || "info",
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    UtilsModule,
    GmailsModule,
    UsersModule,
    AuthModule,
    DriverModule,
    DocumentModule,
    DriverGroupModule,
    CapabilityModule,
    VehicleModule,
    CapabilityChargesModule,
    TemplatesModule,
    RideModule,
    LiscenseModule,
    JwtModule,
    AreaGroupModule,
    TarrifsModule,
    StripeModule,
    ZoneModule,
    TwilioModule,
    S3Module,
    NotificationModule,
    TransactionModule,
    RatingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
