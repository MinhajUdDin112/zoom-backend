import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { VariableFareTemplate } from "./variableFareTemplate.entity";
import { CapabilityCostPrice } from "./capabilityCostPrice.entity";

@Entity("timeCost")
export class TimeCost {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ nullable: true })
  fromMinutes?: number;
  @Column({ nullable: true })
  toMinutes: number;
  @Column({ nullable: true })
  toSeconds: number;
  @Column({ nullable: true })
  fromSeconds: number;
  @Column({ type: "float", nullable: true })
  price?: number;
  @Column({ type: "float", nullable: true })
  cost: number;

  @ManyToOne(() => CapabilityCostPrice, (template) => template.timeCost)
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
