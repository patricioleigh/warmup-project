import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let users: Pick<UsersService, 'createUser' | 'findByEmail'>;
  let jwt: Pick<JwtService, 'signAsync'>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      createUser: jest.fn(),
      findByEmail: jest.fn(),
    };
    jwt = {
      signAsync: jest.fn(),
    };
    service = new AuthService(users as UsersService, jwt as JwtService);
  });

  describe('register', () => {
    it('hashes the password and creates the user', async () => {
      (bcrypt.hash as unknown as jest.Mock).mockResolvedValueOnce('hash_123');
      (users.createUser as jest.Mock).mockResolvedValueOnce({
        userId: 'u1',
        email: 'a@b.com',
      });

      await expect(
        service.register({ email: 'a@b.com', password: 'password123' }),
      ).resolves.toEqual({
        userId: 'u1',
        email: 'a@b.com',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(users.createUser).toHaveBeenCalledWith({
        email: 'a@b.com',
        passwordHash: 'hash_123',
      });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      (users.findByEmail as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      (users.findByEmail as jest.Mock).mockResolvedValueOnce({
        _id: 'u1',
        email: 'a@b.com',
        passwordHash: 'hash',
      });
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns accessToken when credentials are valid', async () => {
      (users.findByEmail as jest.Mock).mockResolvedValueOnce({
        _id: 'u1',
        email: 'a@b.com',
        passwordHash: 'hash',
      });
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValueOnce(true);
      (jwt.signAsync as jest.Mock).mockResolvedValueOnce('token_abc');

      await expect(
        service.login({ email: 'a@b.com', password: 'password123' }),
      ).resolves.toEqual({
        accessToken: 'token_abc',
      });

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'a@b.com',
      });
    });
  });
});
