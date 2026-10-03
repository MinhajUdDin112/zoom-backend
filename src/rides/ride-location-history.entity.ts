import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Rides } from "./rides.entity";

@Entity("ride-locaion-history")
export class RideLocationHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Rides, (ride) => ride.rideLocationHistory)
  @JoinColumn({ name: "rideId" })
  ride: Rides;

  @Column()
  rideStatus: string;

  @Column({
    type: "double precision",
  })
  longitude: number;

  @Column({ type: "double precision" })
  latitude: number;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: true,
  })
  createdAt: Date;
}
