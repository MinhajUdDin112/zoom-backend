import { Users } from 'src/users/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', comment: 'Ref: userId from user table' })
  userId: string;

  @ManyToOne(() => Users, user => user.notifications)
  user: Users;

  @Column({ type: 'text', comment: 'Title of notification.' })
  title: string;

  @Column({type: 'text', comment: 'Type of notification.' })
  type: string;

  @Column({type: 'text', comment: 'Message of notification.' })
  message: string;

  @Column({ nullable: true })
  deleted_at: Date;

  @Column({ nullable: true })
  created_at: Date;
}
