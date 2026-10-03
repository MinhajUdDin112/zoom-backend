import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import { ETransactionType } from "./enums/transaction.enum";

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: number;

  @Column()
  rideId: string;

  @Column()
  paymentMethod: string;

  @Column()
  amount: number;

  @Column()
  currency: string;

  @Column()
  status: string;

  @Column()
  type: ETransactionType;

  @Column()
  paymentIntentId: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
