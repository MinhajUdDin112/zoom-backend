import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { VariableFareTemplate } from "./variableFareTemplate.entity";
import { CapabilityCostPrice } from "./capabilityCostPrice.entity";

@Entity("distanceCost")
export class DistanceCost {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type: "float", nullable: true })
  from?: number;
  @Column({ type: "float", nullable: true })
  to: number;
  @Column({ type: "float", nullable: true })
  price?: number;
  @Column({ type: "float", nullable: true })
  cost: number;

  @ManyToOne(() => CapabilityCostPrice, (template) => template.distanceCost)
  capabilityCostPrice: CapabilityCostPrice;

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
