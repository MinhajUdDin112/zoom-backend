import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { RideCapabilityCharges } from "./ride-capability-charges.entity";
import { Rides } from "./rides.entity";

@Entity("ride-fare-details")
export class RideFareDetails {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  type: string;

  @Column()
  tarrifId: string;

  @Column()
  templateId: string;

  @Column("float")
  price: number;

  @Column("float")
  cost: number;

  @Column({ type: "float", nullable: true })
  minPrice: number;

  @Column({ type: "float", nullable: true })
  minCost: number;

  @Column({ nullable: true })
  pickupZoneId: string;

  @Column({ nullable: true })
  destinationZoneId: string;

  @Column("float")
  capabilityChargesCost: number;

  @Column("float")
  capabilityChargesPrice: number;

  @OneToMany(() => RideCapabilityCharges, (charge) => charge.fare, {
    cascade: true,
  })
  activeCapabilityCharges: RideCapabilityCharges[];

  @Column("float")
  chargingZonesChargesPrice: number;

  @Column("float")
  totalCost: number;

  @Column("float")
  totalPrice: number;

  @OneToOne(() => Rides, (ride) => ride.fare)
  @JoinColumn({ name: "rideId" })
  ride: Rides;

  @Column()
  rideId: string;

  // new ride
  //   @ManyToOne(() => NewRide, (newRide) => newRide.history)
  //   @JoinColumn({ name: "newRideId" })
  //   newRide: NewRide;
}
