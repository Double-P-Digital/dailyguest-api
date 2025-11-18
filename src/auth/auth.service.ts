import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User, UserDocument } from './user.schema';
import { UserDto } from './dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(userDto: UserDto): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(userDto.password, 10);

      await this.userModel.create({
        username: userDto.username,
        password: hashedPassword,
      });

      return 'Registration successful';
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async login(userDto: UserDto): Promise<{ token: string }> {
    try {
      const user = await this.userModel.findOne({ username: userDto.username });

      if (!user) {
        throw new UnauthorizedException('Invalid username or password');
      }

      const passwordsMatch = await bcrypt.compare(
        userDto.password,
        user.password,
      );

      if (!passwordsMatch) {
        throw new UnauthorizedException('Invalid username or password');
      }

      const payload = { username: user.username };
      const token = this.jwtService.sign(payload);

      return { token };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
