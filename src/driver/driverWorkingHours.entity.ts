import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Drivers } from "./driver.entity";

@Entity("driver_working_hours")
export class DriverWorkingHour {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Drivers, (driver) => driver.workingHours)
  @JoinColumn({ name: "driverId" })
  driver: Drivers;

  @Column()
  status: string;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: true,
  })
  createdAt: Date;
}
