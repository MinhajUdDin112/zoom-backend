import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Tariff } from "src/tarrifs/entities/tarrif.entity";
import { CapabilityCostPrice } from "./capabilityCostPrice.entity";

@Entity("variableFareTemplate")
export class VariableFareTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ unique: true })
  name: string;
  @Column()
  description: string;

  @OneToMany(() => CapabilityCostPrice, (ccp) => ccp.variableFareTemplate, {
    cascade: true,
    onDelete: "CASCADE",
  })
  capabilityCostPrice: CapabilityCostPrice[];

  @OneToMany(() => Tariff, (tariff) => tariff.variableFareTemplate)
  // @JoinColumn()
  tariff: Tariff[];

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
