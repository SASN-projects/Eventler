import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../auth/entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { Event } from '../events/entities/event.entity';
import { EventResponse } from '../events/entities/event-response.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;

  const createUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'user@example.com',
    username: 'old_name',
    firstName: 'Old',
    lastName: 'Name',
    city: 'Berlin',
    country: 'DE',
    occupation: 'Planner',
    dateOfBirth: '1990-01-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User);

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(UserPreferences), useValue: {} },
        { provide: getRepositoryToken(Event), useValue: {} },
        { provide: getRepositoryToken(EventResponse), useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('persists username updates for the authenticated user', async () => {
    const user = createUser();
    userRepository.findOne.mockResolvedValue(user);

    const result = await service.updateMe('user-1', { username: 'new_name' } as any);

    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ username: 'new_name' }));
    expect(result.username).toBe('new_name');
  });

  it('throws when the current user cannot be found', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.updateMe('missing-user', { username: 'new_name' } as any)).rejects.toThrow(NotFoundException);
  });
});