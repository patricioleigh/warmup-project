import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async findByEmail(email: string): Promise<(User & { _id: any }) | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).lean();
  }

  async createUser(params: {
    email: string;
    passwordHash: string;
  }): Promise<{ userId: string; email: string }> {
    const existing = await this.findByEmail(params.email);
    if (existing) {
      throw new ConflictException({ message: 'Email already in use' });
    }

    const created = await this.userModel.create({
      email: params.email.toLowerCase(),
      passwordHash: params.passwordHash,
    });

    return { userId: String(created._id), email: created.email };
  }
}
