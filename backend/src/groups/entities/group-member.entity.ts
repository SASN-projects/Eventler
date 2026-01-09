import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('group_members')
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'group_id' })
    groupId: string;

  @Column({ name: 'user_id' })
    userId: string;

  @ManyToOne(() => Group, (group) => group.members)
  @JoinColumn({ name: 'group_id' })
    group: Group;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
    user: User;
}
