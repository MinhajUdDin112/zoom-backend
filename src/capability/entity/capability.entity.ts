import { CapabilityCharges } from "src/capabilityCharges/entity/capabilityCharges.entity";
import { STATUS } from "src/users/enums/users.enum";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Drivers } from "src/driver/driver.entity";
import { VariableFareTemplate } from "src/templates/entities/variableFareTemplate.entity";

import { Vehicle } from "src/vehicles/vehicle.entity";
import { JoinTable, ManyToMany } from "typeorm";
import { CapabilityCostPrice } from "src/templates/entities/capabilityCostPrice.entity";
import { Rides } from "src/rides/rides.entity";

@Entity("capability")
export class Capability {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ unique: true })
  name: string;
  @Column({ unique: true })
  shortCode: string;
  @Column()
  priority: boolean;
  @Column({ nullable: true })
  priorityCode?: number;
  @Column({ nullable: true })
  type?: string;
  @Column()
  enabled: boolean;
  @Column()
  visibleToDrivers: boolean;
  @Column()
  exclusiveCapability: boolean;
  @Column()
  operatorOverride: boolean;
  @Column()
  colour: boolean;
  @Column({ nullable: true })
  colourCode: string;
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
  @ManyToOne(() => CapabilityCharges, (charges) => charges.capabilities)
  @JoinColumn({ name: "capabilityChargesId" })
  capabilityCharges: CapabilityCharges;
  @ManyToMany(() => Drivers, (drivers) => drivers.capabilities)
  @JoinTable()
  drivers: Drivers[];
  @ManyToMany(() => Vehicle, (vehicle) => vehicle.capabilities)
  @JoinTable()
  vehicle: Vehicle[];
  @ManyToMany(() => CapabilityCostPrice)
  @JoinTable()
  capabilityCostPrice: CapabilityCostPrice[];

  @OneToMany(() => Rides, (ride) => ride.capability)
  rides: Rides[];

  // new ride
  //   @OneToMany(() => NewRide, (newRide) => newRide.capability)
  //   newRide: NewRide[];
}
