import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GroupMember } from './group-member.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ length: 150 })
    name: string;

  @Column('text')
    description: string;

  @Column({ name: 'created_by' })
    createdById: string;

  @Column({ name: 'invite_link_token', unique: true, length: 255 })
    inviteLinkToken: string;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

  @OneToMany(() => GroupMember, (member) => member.group)
    members: GroupMember[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
    createdBy: User;
}
