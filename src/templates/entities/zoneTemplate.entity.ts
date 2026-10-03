import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ZoneCost } from "./zoneCost.entity";
import { Tariff } from "src/tarrifs/entities/tarrif.entity";

@Entity("zoneTemplate")
export class ZoneTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ unique: true })
  matixName: string;
  @Column({ type: "boolean", default: false })
  mirrorAllEnteredAmount?: boolean;
  @Column({ type: "float", nullable: true })
  globalIncrementAmount?: number;
  @Column({ type: "float" })
  costPerExtraMile: number;
  @Column({ type: "float" })
  pricePerExtraMile: number;

  @OneToMany(() => ZoneCost, (zc) => zc.zoneTemplate, {
    cascade: true,
    onDelete: "CASCADE",
  })
  zoneCost: ZoneCost[];

  //  commenting relationship from here because now zome is dynamic and added in dropdown
  // @OneToMany(() => Tariff, (tariff) => tariff.destinationZone)
  // // @JoinColumn()
  // tariffDestination: Tariff[];

  // @OneToMany(() => Tariff, (tariff) => tariff.pickupZone)
  // // @JoinColumn()
  // tariffPickup: Tariff[];

  @OneToMany(() => Tariff, (tariff) => tariff.zoneTemplate)
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
