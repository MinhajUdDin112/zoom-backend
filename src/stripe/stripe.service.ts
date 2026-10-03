// stripe.service.ts

import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentMethodDTO } from "./dto/stripe.dto";
import { PinoLogger } from "nestjs-pino";
import { RidesService } from "src/rides/rides.service";
import { RIDE_PAYMENT_STATUS, RIDE_STATUS } from "src/rides/enums/rides.enum";
import { Rides } from "src/rides/rides.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { PusherService } from "src/pusher/pusher.service";
import { TransactionService } from "src/transaction/transaction.service";
import { ETransactionType } from "src/transaction/enums/transaction.enum";
import { EPusherChannel, EPusherEvent } from "src/pusher/pusher.enum";
import moment from "moment";

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private publishableKey: string;
  private endpointSecret: string;

  constructor(
    private configService: ConfigService,
    private readonly dataSource: DataSource,
    private pusherService: PusherService,
    private transactionService: TransactionService,

    // @Inject(forwardRef(() => RidesService))
    // private rideService: RidesService,
    @InjectRepository(Rides)
    private readonly RideRepository: Repository<Rides>,
    private readonly logger: PinoLogger
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>("STRIPE_SECRET_KEY"),
      {
        apiVersion: "2024-04-10",
      }
    );
    this.publishableKey = this.configService.get<string>(
      "STRIPE_PUBLISHABLE_KEY"
    );
    this.endpointSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET"
    );
  }

  async createCustomer(userData: {
    email: string;
    name: string;
    phone: string;
  }) {
    return await this.stripe.customers.create({
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
    });
  }

  async createEphemeralKey(customerId: string) {
    return this.stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-04-10" }
    );
  }

  async createPaymentIntent(
    customerId: string,
    amount: number,
    metadata?: Stripe.MetadataParam,
    currency: string = "GBP"
  ) {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: metadata,
    });
  }
  async createPaymentSheet(
    amount: number,
    customerId: string,
    metadata?: Stripe.MetadataParam
  ) {
    this.logger.info(
      "Service=>createPaymentSheet=>Input: %o %o %o",
      amount,
      customerId,
      metadata
    );

    const GBPInPence = Math.trunc(amount * 100);

    // const customer = await this.createCustomer();
    const ephemeralKey = await this.createEphemeralKey(customerId);
    const paymentIntent = await this.createPaymentIntent(
      customerId,
      GBPInPence,
      metadata
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
      publishableKey: this.publishableKey,
    };
  }

  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return this.stripe.setupIntents.create({ customer: customerId });
  }

  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethodDTO[]> {
    const stripePaymentMethods = await this.stripe.paymentMethods.list({
      type: "card",
      customer: customerId,
    });
    const paymentMethods = stripePaymentMethods.data.map((pm) => ({
      stripePaymentMethodId: pm.id,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      brand: pm.card.brand,
    }));
    return paymentMethods;
  }

  async webhook(request): Promise<any> {
    const sig = request.headers["stripe-signature"];

    let event;

    this.logger.info("Service=>stripe=>webhook: ");
    try {
      event = this.stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        this.endpointSecret
      );
    } catch (err) {
      // response.status(400).send(`Webhook Error: ${err.message}`);
      this.logger.error("Service=>stripe=>webhook=>error: %o ", err);

      return `Webhook Error: ${err.message}`;
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          this.logger.info(
            "Service=>stripe=>webhook=>payment_intent.succeeded: %o ",
            event.data.object
          );
          const paymentIntentSucceeded = event.data.object;

          if (paymentIntentSucceeded?.metadata?.rideId) {
            await this.updateRidePaymentStatus(
              RIDE_PAYMENT_STATUS.PAID,
              paymentIntentSucceeded?.metadata?.rideId
            );

            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            const transactionData = {
              rideId: paymentIntent.metadata.rideId,
              paymentMethod: paymentIntent.payment_method.toString(),
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              status: paymentIntent.status,
              type: ETransactionType.CHARGE,
              paymentIntentId: paymentIntent.id,
            };

            await this.transactionService.createTransaction(transactionData);
          }
          break;
        case "charge.refunded":
          this.logger.info(
            "Service=>stripe=>webhook=>charge.refunded: %o ",
            event.data.object
          );
          const chargeRefundedSucceeded = event.data.object;

          if (chargeRefundedSucceeded?.metadata?.rideId) {
            const refundCharge = event.data.object as Stripe.Charge;

            const transactionData = {
              rideId: refundCharge.metadata.rideId,
              paymentMethod: refundCharge.payment_method.toString(),
              amount: refundCharge.amount_refunded,
              currency: refundCharge.currency,
              status: refundCharge.status,
              type: ETransactionType.REFUND,
              paymentIntentId: refundCharge.payment_intent?.toString(),
            };

            await this.transactionService.createTransaction(transactionData);
          }
          break;
        default:
          this.logger.info(`Unhandled stripe webhook event type ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      return "success";
    } catch (err) {
      this.logger.error("Service=>stripe=>webhook=>error: %o ", err);

      return `Webhook Error Event Processing: ${err.message}`;
    }
    // Handle the event
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
      if (status == RIDE_PAYMENT_STATUS.PAID && !updatedRide?.isScheduled) {
        await this.pusherService.trigger(
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.NEW_RIDE,
          {
            message: "A ride has been created",
            data: { rideId },
          }
        );
        this.logger.info(
          "Service=>pusherEvent=>%o: %o",
          EPusherChannel.ZOOM_CARS_DEV_CHANNEL,
          EPusherEvent.NEW_RIDE
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

  async refundRide(paymentIntentId: string, amount?: number) {
    this.logger.info(
      "Service=>refundRide=>Input: %o %o",
      paymentIntentId,
      amount
    );
    try {
      const GBPInPence = amount ? Math.trunc(amount * 100) : undefined;

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: GBPInPence,
      });

      this.logger.info("Service=>refundRide=>Output: %o", refund);
      return refund;
    } catch (err) {
      this.logger.error("Service=>updateRidePaymentStatus=>Error: %o", err);
      throw new Error(err);
    }
  }
}
