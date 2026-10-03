import { Drivers } from "src/driver/driver.entity";
import { Vehicle } from "src/vehicles/vehicle.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("documents")
export class Document {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  fileName: string;

  @Column()
  imageUrl: string;

  @Column()
  documentType: string;

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
  deletedAt: Date;

  @ManyToOne(() => Drivers, (driver) => driver.documents)
  @JoinColumn({ name: "driverId" })
  driver: Drivers;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.documents, { nullable: true })
  @JoinColumn({ name: "vehicleId" })
  vehicle: Vehicle;
}
