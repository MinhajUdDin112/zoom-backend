import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { RideFareDetails } from "./ride-fare-details.entity";

@Entity("ride-capability-charges")
export class RideCapabilityCharges {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("float")
  price: number;

  @Column("float")
  cost: number;

  @Column("boolean")
  isCommissionable: boolean;

  @Column()
  status: string;

  @ManyToOne(() => RideFareDetails, (fare) => fare.activeCapabilityCharges)
  @JoinColumn({ name: "fareId" })
  fare: RideFareDetails;

  @Column()
  fareId: string;
}
