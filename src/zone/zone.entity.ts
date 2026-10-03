import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Geometry } from "geojson";
import { AreaGroup } from "src/AreaGroup/areaGroup.entity";

@Entity()
export class Zone {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column("geometry", {
    spatialFeatureType: "Polygon",
    srid: 4326,
  })
  geometry: Geometry;
  @ManyToMany(() => AreaGroup, (areaGroup) => areaGroup.zones)
  @JoinTable()
  areaGroup: AreaGroup[];
}
