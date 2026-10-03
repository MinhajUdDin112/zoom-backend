import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ZoneTemplate } from "./zoneTemplate.entity";

@Entity('zoneCost')

export class ZoneCost {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column()
    from:string
    @Column()
    to:string
    @Column({type:'float'})
    price:number
    @Column({type:'float'})
    cost:number

    @ManyToOne(() => ZoneTemplate, template => template.zoneCost)
    zoneTemplate: ZoneTemplate;

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
