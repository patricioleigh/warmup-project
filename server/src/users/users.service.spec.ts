import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  beforeEach(async () => {
    const mockUserModel = function (this: any, dto: any) {
      this.email = dto.email;
      this.passwordHash = dto.passwordHash;
      this._id = 'mock-id';
      this.save = jest.fn().mockResolvedValue(this);
    };

    mockUserModel.findOne = jest.fn().mockReturnValue({
      lean: jest.fn(),
    });
    mockUserModel.create = jest.fn();
    mockUserModel.prototype.save = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createDto = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      };

      userModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      userModel.create.mockResolvedValue({
        _id: 'created-id',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      });

      const result = await service.createUser(createDto);

      expect(result).toBeDefined();
      expect(result.userId).toBe('created-id');
      expect(result.email).toBe('test@example.com');
      expect(userModel.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const createDto = {
        email: 'existing@example.com',
        passwordHash: 'hashedpassword',
      };

      userModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          email: createDto.email,
          _id: 'existing-id',
        }),
      });

      await expect(service.createUser(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user if found', async () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hash',
      };

      userModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });

    it('should return null if user not found', async () => {
      userModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });
});
