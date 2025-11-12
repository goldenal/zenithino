import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './entities/user.entity';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findById(userId);
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      businessName: user.businessName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      bvn: user.bvn,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    updateData: Partial<User>,
  ): Promise<UserProfileDto> {
    const user = await this.findById(userId);
    await user.update(updateData);
    return this.getProfile(userId);
  }
}