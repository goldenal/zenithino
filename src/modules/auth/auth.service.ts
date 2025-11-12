import {
    Injectable,
    UnauthorizedException,
    ConflictException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { InjectModel } from '@nestjs/sequelize';
  import { User } from '../users/entities/user.entity';
  import { RegisterDto } from './dto/register.dto';
  import { LoginDto } from './dto/login.dto';
  import { AuthResponseDto } from './dto/auth-response.dto';
  
  @Injectable()
  export class AuthService {
    constructor(
      @InjectModel(User)
      private userModel: typeof User,
      private jwtService: JwtService,
    ) {}
  
    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
      const existingUser = await this.userModel.findOne({
        where: { email: registerDto.email },
      });
  
      if (existingUser) {
        throw new ConflictException('Email already registered');
      }
  
      const user = await this.userModel.create({
        ...registerDto,
      });
  
      const payload = { email: user.email, sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(payload);
  
      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          businessName: user.businessName,
        },
      };
    }
  
    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
      const user = await this.userModel.findOne({
        where: { email: loginDto.email },
      });
  
      if (!user || !(await user.validatePassword(loginDto.password))) {
        throw new UnauthorizedException('Invalid credentials');
      }
  
      const payload = { email: user.email, sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(payload);
  
      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          businessName: user.businessName,
        },
      };
    }
  }