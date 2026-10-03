import { Vehicle } from "src/vehicles/vehicle.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RIDE_HISTORY_ACTION_TYPE, RIDE_STATUS } from "./enums/rides.enum";
import { Users } from "src/users/user.entity";
import { Drivers } from "src/driver/driver.entity";
import { Rides } from "./rides.entity";

@Entity("ride-history")
export class RideHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  rideId: string;

  @ManyToOne(() => Rides, (ride) => ride.history)
  @JoinColumn({ name: "rideId" })
  ride: Rides;

  @Column()
  actionType: RIDE_HISTORY_ACTION_TYPE;

  @Column()
  rideStatus: RIDE_STATUS;

  @Column()
  updateNote: string;

  @Column()
  updatedById: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "updatedById" })
  updatedBy: Users;

  @Column({ nullable: true })
  driverId: string;

  @ManyToOne(() => Drivers)
  @JoinColumn({ name: "driverId" })
  driver: Drivers;

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

  // new ride
  //   @ManyToOne(() => NewRide, (newRide) => newRide.history)
  //   @JoinColumn({ name: "newRideId" })
  //   newRide: NewRide;
}
