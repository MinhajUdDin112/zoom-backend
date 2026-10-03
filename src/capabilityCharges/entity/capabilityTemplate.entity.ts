import { STATUS } from "src/users/enums/users.enum";
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CapabilityCharges } from "./capabilityCharges.entity";
import { Tariff } from "src/tarrifs/entities/tarrif.entity";

@Entity("capability_template")
export class CapabilityTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  description: string;

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

  @OneToMany(() => Tariff, (tariff) => tariff.capabilityTemplate)
  @JoinColumn()
  tariff: Tariff[];

  @Column({
    nullable: true,
  })
  deleted_at: Date;

  @OneToMany(
    () => CapabilityCharges,
    (capabilityCharges) => capabilityCharges.capabilityTemplate
  )
  capabilityCharges: CapabilityCharges[];
}
