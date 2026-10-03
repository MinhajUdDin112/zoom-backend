import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Rides } from "./rides.entity";
import { Drivers } from "src/driver/driver.entity";

@Entity("ride-messages")
export class RideMessages {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  message: string;
  @Column({ default: false })
  isRead: boolean; // Default value set to false and nullable
  //creating one to one relationship with ride
  @Column({ nullable: true })
  rideId: string;

  @OneToOne(() => Rides, (rides) => rides.ride)
  @JoinColumn({ name: "rideId" })
  ride: Rides;

  //   creating one to many relationship with driver

  //   @ManyToOne(() => Drivers, (driver) => driver.rating)
  //   @JoinColumn({ name: "driverId" })
  //   driver: Drivers;

  @ManyToOne(() => Drivers, (driver) => driver.rideMessages)
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
}
