import { STATUS } from "src/users/enums/users.enum";
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CapabilityTemplate } from "./capabilityTemplate.entity";
import { Capability } from "src/capability/entity/capability.entity";

@Entity("capability_charges")
export class CapabilityCharges {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ type: "float", nullable: true })
  price: number;

  @Column({ type: "float", nullable: true })
  cost: number;

  @Column()
  isCommissionable: boolean;

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

  @Column({
    nullable: true,
  })
  deleted_at: Date;

  @ManyToOne(
    () => CapabilityTemplate,
    (capabilityTemplate) => capabilityTemplate.capabilityCharges
  )
  @JoinColumn({ name: "capabilityTemplateId" })
  capabilityTemplate: CapabilityTemplate;

  @ManyToMany(() => Capability)
  @JoinTable()
  capabilities: Capability[];
}
