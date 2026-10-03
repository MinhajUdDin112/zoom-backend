import { Drivers } from "src/driver/driver.entity";
import { Rides } from "src/rides/rides.entity";
import { Users } from "src/users/user.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("rating")
export class Rating {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  comment: string;

  @Column({ nullable: true })
  star: number;

  @ManyToOne(() => Users, (user) => user.rating)
  @JoinColumn({ name: "userId" })
  user: Users;

  @ManyToOne(() => Drivers, (driver) => driver.rating)
  @JoinColumn({ name: "driverId" })
  driver: Drivers;

  @Column({ nullable: true })
  rideId: string;

  @OneToOne(() => Rides, (ride) => ride.rating)
  @JoinColumn({ name: "rideId" })
  ride: Rides;

  //new-ride
  //   @OneToOne(() => NewRide, (newRide) => newRide.rating)
  //   @JoinColumn({ name: "newRideId" })
  //   newRide: NewRide;
}
