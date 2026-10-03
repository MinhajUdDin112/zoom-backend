import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { STATUS } from "./enums/areaGroup.enum";
import { Zone } from "src/zone/zone.entity";

@Entity("area_group")
export class AreaGroup {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  @Column({ unique: true })
  name: string;
  @Column()
  company: string;
  @Column({ type: "float", default: 0.0 })
  price: number;
  @Column()
  description: string;
  @Column({ default: false })
  isEnabled: boolean;
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

  @ManyToMany(() => Zone, (zone) => zone.areaGroup)
  zones: Zone[];
}
