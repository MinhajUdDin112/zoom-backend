import { Drivers } from "src/driver/driver.entity";
import { DriverGroup } from "src/driverGroups/driverGroup.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  Index,
} from "typeorm";
import { VehicleStatus } from "./enums/document.enum";
import { Document } from "src/documents/document.entity";
import { Capability } from "src/capability/entity/capability.entity";
import { Liscense } from "src/liscense/entity/liscense.entity";
import { Rides } from "src/rides/rides.entity";
@Entity()
export class Vehicle {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  callSign: string;

  @Column({ nullable: true })
  driverId: string;

  @OneToOne(() => Drivers, (driver) => driver.vehicle, { nullable: true })
  @JoinColumn({ name: "driverId" })
  driver: Drivers;

  @Column({ nullable: true })
  driverGroupId: string;

  @ManyToOne(() => DriverGroup, (driverGroup) => driverGroup.vehicle, {
    nullable: true,
  })
  @JoinColumn({ name: "driverGroupId" })
  driverGroup: DriverGroup;

  @OneToMany(() => Liscense, (license) => license.vehicle)
  licenses: Liscense[];

  @Column()
  make: string;

  @Column()
  model: string;

  @Column()
  mdtId: string;

  @Column()
  colour: string;

  @Column({ unique: true })
  registration: string;

  @Column()
  passengers: string;

  @Column()
  year: string;

  @Column()
  plateNumber: string;

  @Column()
  isSuspended: boolean;

  //   @Column({ nullable: true })
  //   capabilities: string;

  @Column()
  vehicleCommentOne: string;

  @Column()
  vehicleCommentTwo: string;

  @Column()
  vehicleCommentThree: string;

  @Column()
  vehicleCommentFour: string;

  @Column()
  vehicleCommentFive: string;

  @Column({ default: false })
  isCardEnable: boolean;

  @Column()
  cardNumber: string;

  @Column()
  machine: string;

  @Column()
  driverLoginMode: string;

  @Column()
  roadtaxExpires: string;

  @Column()
  platExpires: string;

  @Column()
  mdtExpires: string;

  @Column()
  insuranceExpires: string;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: true,
  })
  createdAt: Date;

  @Column({
    type: "enum",
    enum: VehicleStatus,
    default: VehicleStatus.ACTIVE, // Default value is ACTIVE
  })
  status: VehicleStatus;

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

  @OneToMany(() => Document, (document) => document.vehicle)
  documents: Document[];
  @ManyToMany(() => Capability, (capability) => capability.vehicle)
  capabilities: Capability[];

  @OneToMany(() => Rides, (ride) => ride.vehicle)
  rides: Rides[];

  // new ride
  //   @OneToMany(() => NewRide, (newRide) => newRide.vehicle)
  //   newRide: NewRide[];
}
