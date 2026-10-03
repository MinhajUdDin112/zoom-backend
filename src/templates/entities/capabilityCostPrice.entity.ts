import { Capability } from "src/capability/entity/capability.entity";
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { DistanceCost } from "./distanceCost.entity";
import { TimeCost } from "./timeCost.entity";
import { VariableFareTemplate } from "./variableFareTemplate.entity";

@Entity("capabilityCostPrice")
export class CapabilityCostPrice {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "boolean", default: false })
  sameCostPrice: boolean;
  @Column({ type: "float", nullable: true })
  minCost?: number;
  @Column({ type: "float", nullable: true })
  maxCost?: number;
  @Column({ type: "float", nullable: true })
  minPrice?: number;
  @Column({ type: "float", nullable: true })
  maxPrice?: number;
  @Column({ type: "float", nullable: true })
  pickupPrice?: number;
  @Column({ type: "float", nullable: true })
  pickupCost?: number;
  // @ManyToMany(
  //   () => Capability,
  //   (capability) => capability.capabilityCostPrice,
  //   { onDelete: "CASCADE" }
  // )
  // @JoinTable()
  // capability: Capability[];
  @Column({ nullable: true })
  capabilityId: string;

  @ManyToOne(() => Capability, (charges) => charges.capabilityCostPrice)
  @JoinColumn({ name: "capabilityId" })
  capability: Capability;

  @OneToMany(() => DistanceCost, (dc) => dc.capabilityCostPrice, {
    cascade: true,
    onDelete: "CASCADE",
  })
  distanceCost: DistanceCost[];

  @OneToMany(() => TimeCost, (tc) => tc.capabilityCostPrice, {
    cascade: true,
    onDelete: "CASCADE",
  })
  timeCost: TimeCost[];

  @ManyToOne(
    () => VariableFareTemplate,
    (variableTemplate) => variableTemplate.capabilityCostPrice,
    { onDelete: "CASCADE" }
  )
  @JoinColumn()
  variableFareTemplate: VariableFareTemplate;

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
}
