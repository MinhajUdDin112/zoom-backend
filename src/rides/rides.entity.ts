import { Vehicle } from "src/vehicles/vehicle.entity";
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import {
  ERIDE_PAYMENT_METHOD,
  RIDE_PAYMENT_STATUS,
  RIDE_STATUS,
} from "./enums/rides.enum";
import { Document } from "src/documents/document.entity";
import { DriverGroup } from "src/driverGroups/driverGroup.entity";
import { Capability } from "src/capability/entity/capability.entity";
import { Users } from "src/users/user.entity";
import { Drivers } from "src/driver/driver.entity";
import { RideFareDetails } from "./ride-fare-details.entity";
import { Zone } from "src/zone/zone.entity";
import { RideHistory } from "./rides-history.entity";
import { Rating } from "src/rating/rating.entity";
import { RideLocationHistory } from "./ride-location-history.entity";
import { RideMessages } from "./ride-messages.entity";

@Entity("rides")
export class Rides {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  conversationSid: string;

  @Column()
  customerId: string;

  @Column({ nullable: true })
  ratingId: string;

  @OneToOne(() => Rating, (rating) => rating.ride, { nullable: true })
  @JoinColumn({ name: "ratingId" })
  rating: Rating;

  @Column({ nullable: true })
  rideMessageId: string;

  @OneToOne(() => RideMessages, (rides) => rides.ride, { nullable: true })
  @JoinColumn({ name: "rideId" })
  ride: RideMessages;

  @OneToMany(
    () => RideLocationHistory,
    (rideLocationHistory) => rideLocationHistory.ride
  )
  @JoinColumn({ name: "ridlocationHistoryId" })
  rideLocationHistory: RideLocationHistory[];

  @ManyToOne(() => Users, (user) => user.rides)
  @JoinColumn({ name: "customerId" })
  customer: Users;

  @Column({ default: RIDE_PAYMENT_STATUS.UNPAID })
  paymentStatus: RIDE_PAYMENT_STATUS;

  @Column({ nullable: true })
  paymentIntentId: string;

  @Column({ nullable: true })
  clientSecret: string;

  @Column({
    type: "boolean",
    nullable: true,
    // default: false,
  })
  isSkipRating: boolean;

  @Column({ nullable: true })
  driverId: string;

  @ManyToOne(() => Drivers, (driver) => driver.rides)
  @JoinColumn({ name: "driverId" })
  driver: Drivers;

  @Column({ nullable: true })
  vehicleId: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.rides)
  @JoinColumn({ name: "vehicleId" })
  vehicle: Vehicle;

  @Column({ nullable: true })
  capabilityId: string;

  @ManyToOne(() => Capability, (capability) => capability.rides)
  @JoinColumn({ name: "capabilityId" })
  capability: Capability;

  @Column({ nullable: true })
  pickupZoneId: string;

  @ManyToOne(() => Zone)
  @JoinColumn({ name: "pickupZoneId" })
  pickupZone: Zone;

  @Column({ nullable: true })
  destinationZoneId: string;

  @ManyToOne(() => Zone)
  @JoinColumn({ name: "destinationZoneId" })
  destinationZone: Zone;

  @Column()
  fromAddress: string;

  @Column()
  toAddress: string;

  @Column({
    type: "float",
  })
  fromLatitude: number;

  @Column({
    type: "float",
  })
  fromLongitude: number;

  @Column({
    type: "float",
  })
  toLatitude: number;

  @Column({
    type: "float",
  })
  toLongitude: number;

  @Column({
    type: "boolean",
    default: false,
  })
  isScheduled: boolean;

  @Column({
    type: "timestamp",
    nullable: true,
  })
  scheduleDateTime: Date;

  @Column({
    type: "text",
    nullable: true,
  })
  promo: string;

  @Column({
    type: "text",
    nullable: true,
  })
  driverComments: string;

  @Column({
    type: "float",
  })
  distance: number;

  @Column({
    type: "float",
  })
  price: number;

  @Column({
    type: "float",
  })
  cost: number;

  @Column({
    type: "float",
  })
  time: number;

  @Column({ default: RIDE_STATUS.PENDING })
  status: string;

  @Column({ nullable: true })
  account: string;

  @Column({ default: 3 })
  priority: number;

  @Column({ nullable: true })
  passengers: number;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: true,
  })
  createdAt: Date;

  @Column({
    type: "timestamp",
    nullable: true,
  })
  endTime: Date;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: true,
  })
  dispatchDueTime: Date;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
    nullable: true,
  })
  lastModified: Date;

  @Column({
    nullable: true,
  })
  deleted_at: Date;

  //todo need to change it to CARD in next deployment
  @Column({ default: ERIDE_PAYMENT_METHOD.ONLINE })
  paymentMethod: ERIDE_PAYMENT_METHOD;

  @Column()
  bookingId: number;

  @OneToOne(() => RideFareDetails, (fare) => fare.ride, { cascade: true })
  fare: RideFareDetails;

  @OneToMany(() => RideHistory, (fare) => fare.ride, { cascade: true })
  history: RideHistory[];
}
