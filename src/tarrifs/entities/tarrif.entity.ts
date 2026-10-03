import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
  ManyToMany,
} from "typeorm";
import { VariableFareTemplate } from "src/templates/entities/variableFareTemplate.entity";
import { ZoneTemplate } from "src/templates/entities/zoneTemplate.entity";
import { LocationType, TariffType } from "../enum";
import { CapabilityTemplate } from "src/capabilityCharges/entity/capabilityTemplate.entity";
import { IsEnum } from "class-validator";
import { Zone } from "src/zone/zone.entity";

@Entity()
export class Tariff {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  @IsEnum(TariffType)
  type: string;

  @Column({ unique: true })
  shortName: string;

  @Column()
  jobType: string;

  @Column()
  @IsEnum(LocationType)
  pickupType: string;

  @Column({ nullable: true })
  pickupValue?: string;

  @Column({ type: "float", nullable: true })
  pickupLatitude: number;

  @Column({ type: "float", nullable: true })
  pickupLongitude: number;

  @Column({ type: "float", nullable: true })
  destinationLatitude: number;

  @Column({ type: "float", nullable: true })
  destinationLongitude: number;

  @Column()
  @IsEnum(LocationType)
  destinationType: string;

  @Column({ nullable: true })
  destinationValue?: string;

  @Column({ nullable: true })
  tariffDate: Date;

  @ManyToOne(
    () => VariableFareTemplate,
    (variableTemplate) => variableTemplate.tariff,
    { onDelete: "CASCADE" }
  )
  @JoinColumn()
  variableFareTemplate: VariableFareTemplate;

  @ManyToOne(() => ZoneTemplate, (zoneTemplate) => zoneTemplate.tariff, {
    onDelete: "CASCADE",
  })
  @JoinColumn()
  zoneTemplate: ZoneTemplate;
  pickupZone: Zone; // Add pickupZone property
  destinationZone: Zone; // Add destinationZone property

  //  commenting relationship from here because now zome is dynamic and added in dropdown
  // @ManyToOne(() => ZoneTemplate, (zoneTemplate) => zoneTemplate.tariffPickup, {
  //   onDelete: "CASCADE",
  // })
  // @JoinColumn()
  // pickupZone: ZoneTemplate;

  // @ManyToOne(
  //   () => ZoneTemplate,
  //   (zoneTemplate) => zoneTemplate.tariffDestination,
  //   { onDelete: "CASCADE" }
  // )
  // @JoinColumn()
  // destinationZone: ZoneTemplate;

  // @Column({ nullable: true })
  // pickupZone: string;

  // @Column({ nullable: true })
  // destinationZone: string;

  @ManyToOne(
    () => CapabilityTemplate,
    (capabilityTemplate) => capabilityTemplate.tariff,
    { onDelete: "CASCADE" }
  )
  @JoinColumn()
  capabilityTemplate: CapabilityTemplate;

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
