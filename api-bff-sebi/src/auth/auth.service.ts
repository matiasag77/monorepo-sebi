import {
  Injectable,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { TrackingService } from '../tracking/tracking.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private trackingService: TrackingService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }
    if (!user.password) {
      return null;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }
    const { password: _password, ...result } = user.toObject();
    return result;
  }

  async login(user: any) {
    await this.usersService.trackLogin(user._id);
    await this.trackingService.logEvent({ userId: String(user._id), action: 'login' });
    const payload = {
      email: user.email,
      sub: user._id,
      name: user.name,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      provider: 'local',
    });
    const { password: _password, ...result } = user.toObject();
    return result;
  }

  async registerPublic(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      role: 'user',
      password: hashedPassword,
      provider: 'local',
    });
    await this.usersService.trackLogin(String(user._id));
    await this.trackingService.logEvent({ userId: String(user._id), action: 'login' });
    const payload = {
      email: user.email,
      sub: user._id,
      name: user.name,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async googleLogin(googleData: {
    email: string;
    name: string;
    googleId: string;
    avatar?: string;
  }) {
    let user = await this.usersService.findByEmail(googleData.email);
    if (!user) {
      user = await this.usersService.create({
        email: googleData.email,
        name: googleData.name,
        googleId: googleData.googleId,
        avatar: googleData.avatar,
        provider: 'google',
      });
    }
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }
    await this.usersService.trackLogin(String(user._id));
    await this.trackingService.logEvent({ userId: String(user._id), action: 'login' });
    const payload = {
      email: user.email,
      sub: user._id,
      name: user.name,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}
