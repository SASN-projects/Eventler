import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Event } from "../../events/entities/event.entity";

@Entity("recommendations")
export class Recommendation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column()
  address: string;

  @Column()
  vibe: string;

  @Column({ type: "decimal", nullable: true })
  score: number;

  @Column({ nullable: true })
  rank: number;

  @Column({ type: "json", nullable: true })
  tags: string[];
}
