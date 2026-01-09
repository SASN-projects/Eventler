import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupMember } from './group-member.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column()
    name: string;

  @Column({ name: 'invite_link', unique: true })
    inviteLink: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @OneToMany(() => GroupMember, (member) => member.group)
    members: GroupMember[];
}
