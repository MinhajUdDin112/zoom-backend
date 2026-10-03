import { Vehicle } from "src/vehicles/vehicle.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { STATUS } from "./enums/driver.enum";
import { Document } from "src/documents/document.entity";
import { DriverGroup } from "src/driverGroups/driverGroup.entity";
import { Capability } from "src/capability/entity/capability.entity";
import { Liscense } from "src/liscense/entity/liscense.entity";
import { Rating } from "src/rating/rating.entity";
import { Rides } from "src/rides/rides.entity";
import { RideMessages } from "src/rides/ride-messages.entity";
import { DriverWorkingHour } from "./driverWorkingHours.entity";
@Entity("drivers")
export class Drivers {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => DriverGroup, (driverGroup) => driverGroup.drivers)
  @JoinColumn({ name: "driverGroupId" })
  driverGroup: DriverGroup;

  @OneToMany(() => Rating, (rating) => rating.driver)
  rating: Rating[];

  @OneToMany(() => DriverWorkingHour, (workingHour) => workingHour.driver)
  workingHours: DriverWorkingHour[];

  @OneToMany(() => RideMessages, (ride) => ride.driver)
  rideMessages: RideMessages[];

  @Column({ nullable: true, readonly: false })
  currentVehicleId: string;

  @OneToOne(() => Vehicle, (vehicle) => vehicle.driver)
  @JoinColumn({ name: "currentVehicleId" })
  vehicle: Vehicle;

  @Column()
  profileImageUrl: string;

  @Column({ nullable: false, default: false })
  online: boolean;

  @Column()
  firstName: string;

  @Column({ nullable: false })
  lastName: string;

  @Column()
  landLine: string;

  @Column()
  mobile: string;

  @Column({ nullable: true })
  dob: Date;

  @Column()
  addressLine1: string;
  @Column()
  addressLine2: string;

  @Column({ unique: true })
  email: string;

  @Column()
  country: string;

  @Column()
  town: string;

  @Column()
  postcode: string;

  @Column({ unique: true })
  callSign: string;

  @Column()
  driverComment1: string;

  @Column()
  driverComment2: string;

  @Column()
  company: string;

  // @Column()
  // capabilites: string;

  @Column()
  acceptedPayments: string;

  @Column()
  cashBookings: boolean;

  @Column()
  accountBookings: boolean;

  @Column()
  canCustomerCall: boolean;

  @Column()
  transactionGroup: string;

  @Column()
  driverType: string;

  @Column()
  nationalInsuranceNumber: string;

  @Column()
  bankName: string;

  @Column()
  bankShortCode: string;

  @Column()
  bankAccountNumber: string;

  @Column()
  badgeNumber: string;

  @Column({ type: "timestamp", nullable: true })
  badgeExpiry: Date;

  @Column()
  driverLicenseNumber: string;

  @Column({ type: "timestamp", nullable: true })
  driverLicenseExpiry: Date;

  @Column()
  bankTransfer: boolean;

  @Column()
  ebpJournalCode: string;

  @Column()
  ebpBankCode: string;

  @Column()
  ebpPaymentMethod: string;

  @Column()
  ebpPaypalEmail: string;

  @Column()
  ePayout: boolean;

  @Column()
  ebpWorkJournalCode: string;

  @Column()
  ebpWorkBankCode: string;

  @Column()
  ebpWorkPaymentMethod: string;

  @Column()
  ebpWorkPaypalEmail: string;

  @Column()
  currencyCode: string;

  @Column({ nullable: true, type: "double precision" })
  bearing: number;

  @Column({ nullable: true, type: "double precision" })
  longitude: number;

  @Column({ nullable: true })
  zone: string;

  @Column({ nullable: true, type: "double precision" })
  latitude: number;

  @Column({ default: STATUS.ACTIVE })
  status: string;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: true,
  })
  createdAt: Date;

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

  @OneToOne(() => Liscense, (liscense) => liscense.driver)
  license: Liscense;

  @OneToMany(() => Document, (document) => document.driver)
  documents: Document[];

  @ManyToMany(() => Capability, (capability) => capability.drivers)
  capabilities: Capability[];

  @OneToMany(() => Rides, (ride) => ride.driver)
  rides: Rides[];

  // new ride
  //   @OneToMany(() => NewRide, (newRide) => newRide.driver)
  //   newRide: NewRide[];
}
