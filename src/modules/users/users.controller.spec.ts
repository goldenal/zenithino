import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserRole } from '../../common/enums/user-role.enum';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  const mockUser: UserProfileDto = {
    id: 'user-id-123',
    fullName: 'Test User',
    email: 'test@example.com',
    businessName: 'Test Business',
    phoneNumber: '+2348012345678',
    role: UserRole.USER,
    bvn: '12345678901',
    createdAt: new Date(),
  };

  const mockCurrentUser = {
    userId: 'user-id-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockCurrentUser);

      expect(service.getProfile).toHaveBeenCalledWith(mockCurrentUser.userId);
      expect(result).toEqual(mockUser);
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.getProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.getProfile(mockCurrentUser),
      ).rejects.toThrow(NotFoundException);
      expect(service.getProfile).toHaveBeenCalledWith(mockCurrentUser.userId);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData: Partial<UserProfileDto> = {
        fullName: 'Updated Name',
        phoneNumber: '+2348098765432',
      };

      const updatedUser: UserProfileDto = {
        ...mockUser,
        ...updateData,
      };

      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockCurrentUser, updateData);

      expect(service.updateProfile).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        updateData,
      );
      expect(result).toEqual(updatedUser);
      expect(result.fullName).toBe(updateData.fullName);
      expect(result.phoneNumber).toBe(updateData.phoneNumber);
    });

    it('should update only provided fields', async () => {
      const updateData: Partial<UserProfileDto> = {
        businessName: 'New Business Name',
      };

      const updatedUser: UserProfileDto = {
        ...mockUser,
        businessName: 'New Business Name',
      };

      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockCurrentUser, updateData);

      expect(service.updateProfile).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        updateData,
      );
      expect(result.businessName).toBe(updateData.businessName);
      expect(result.fullName).toBe(mockUser.fullName); // Unchanged
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateData: Partial<UserProfileDto> = {
        fullName: 'Updated Name',
      };

      mockUsersService.updateProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.updateProfile(mockCurrentUser, updateData),
      ).rejects.toThrow(NotFoundException);
      expect(service.updateProfile).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        updateData,
      );
    });

    it('should handle empty update data', async () => {
      const updateData: Partial<UserProfileDto> = {};

      mockUsersService.updateProfile.mockResolvedValue(mockUser);

      const result = await controller.updateProfile(mockCurrentUser, updateData);

      expect(service.updateProfile).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        updateData,
      );
      expect(result).toEqual(mockUser);
    });
  });
});

