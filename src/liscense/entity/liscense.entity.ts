import { Drivers } from "src/driver/driver.entity";
import { Users } from "src/users/user.entity";
import { Vehicle } from "src/vehicles/vehicle.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("liscense")
export class Liscense {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Drivers, (driver) => driver.license)
  @JoinColumn()
  driver: Drivers;

  @ManyToOne(() => Vehicle, vehicle => vehicle.licenses)
  @JoinColumn()
  vehicle: Vehicle;

  @OneToOne(() => Users)
  @JoinColumn()
  user: Users;
}
