import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from '../../auth/entities/user.entity';
import { GroupRole } from '../enums/group-role.enum';

@Entity('group_members')
export class GroupMember {
  @PrimaryColumn({ name: 'group_id' })
    groupId: string;

  @PrimaryColumn({ name: 'user_id' })
    userId: string;

  @Column({ type: 'varchar', length: 20, default: GroupRole.MEMBER })
    role: GroupRole;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    joinedAt: Date;

  @ManyToOne(() => Group, (group) => group.members)
  @JoinColumn({ name: 'group_id' })
    group: Group;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
    user: User;
}
