import { Drivers } from "src/driver/driver.entity";
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Vehicle } from "src/vehicles/vehicle.entity";
import { Mode } from "./constants";

@Entity("driver_groups")
export class DriverGroup {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // @OneToMany(
  //   () => DriverGroupDriver,
  //   (driverGroupDriver) => driverGroupDriver.driverGroup
  // )
  // drivers: DriverGroupDriver[];

  // @ManyToMany(() => Drivers, (driver) => driver.driverGroups)
  // drivers: Drivers[];

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicle: Vehicle;

//   @ManyToMany(() => Drivers)
//   @JoinTable()
//   drivers: Drivers[];

    @OneToMany(() => Drivers, (driver) => driver.driverGroup)
    drivers: Drivers[];

  @Column({
    // type: "enum",
    // enum: Mode,
    default: Mode.ALLOWED_DRIVERS,
  })
  mode: string;

  @Column({unique:true})
  name: string;

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
  deletedAt: Date;
}
