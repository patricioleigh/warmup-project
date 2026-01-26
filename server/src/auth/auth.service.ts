import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(params: { email: string; password: string }) {
    const passwordHash = await bcrypt.hash(params.password, 12);
    return this.users.createUser({ email: params.email, passwordHash });
  }

  async login(params: { email: string; password: string }) {
    const user = await this.users.findByEmail(params.email);
    if (!user)
      throw new UnauthorizedException({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(
      params.password,
      (user as any).passwordHash,
    );
    if (!ok)
      throw new UnauthorizedException({ message: 'Invalid credentials' });

    const userId = String((user as any)._id);
    const accessToken = await this.jwt.signAsync({
      sub: userId,
      email: user.email,
    });

    return { accessToken };
  }
}
