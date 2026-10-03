import { Users } from 'src/users/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity()
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', comment: 'Ref: userId from user table' })
  userId: string;

  @ManyToOne(() => Users, user => user.deviceTokens)
  user: Users;

  @Column({ type: 'text', comment: 'The operating system of the device.' })
  os: string;

  @Column({ unique:true,type: 'text', comment: 'The device token.' })
  deviceToken: string;

  @Column({ nullable: true })
  deleted_at: Date;

  @Column({ nullable: true })
  created_at: Date;
}
