import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { COMPANY, Role, STATUS } from "./enums/users.enum";
import { IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { DeviceToken } from "src/notification/entity/device-token.entity";
import { Notification } from "src/notification/entity/notification.entity";
import { Rating } from "src/rating/rating.entity";
import { Rides } from "src/rides/rides.entity";
@Entity("users")
export class Users {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  userName: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  latestAppVersion?: string;

  @Column({ nullable: true })
  deviceVersion?: string;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column()
  role: string;

  @Column({ type: "timestamp", nullable: true })
  dob: Date;

  @Column({ default: STATUS.ACTIVE })
  status: string;

  @IsOptional()
  @Column({ nullable: true })
  creater?: string;

  @Column({ nullable: true, type: "timestamptz" })
  lastLogin?: Date | null;

  @Column({ nullable: true, default: COMPANY.ZOOM_CARS })
  company: string;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    nullable: true,
  })
  authorizationDate: Date;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
    nullable: true,
  })
  lastModified: Date;

  @OneToMany(() => Rides, (ride) => ride.customer)
  rides: Rides[];

  @OneToMany(() => Rating, (rating) => rating.user)
  rating: Rating[];

  @OneToMany(() => DeviceToken, (deviceToken) => deviceToken.user)
  deviceTokens: DeviceToken[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @Column({
    nullable: true,
  })
  deleted_at: Date;

  // new ride
  //   @OneToMany(() => NewRide, (newRide) => newRide.customer)
  //   newRide: NewRide[];
}
