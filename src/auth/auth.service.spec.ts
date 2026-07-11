jest.doMock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.doMock('typeorm', () => ({
  Repository: class Repository {},
  Entity: () => () => undefined,
  Column: () => () => undefined,
  PrimaryGeneratedColumn: () => () => undefined,
  OneToMany: () => () => undefined,
  ManyToOne: () => () => undefined,
  JoinColumn: () => () => undefined,
  RelationId: () => () => undefined,
  CreateDateColumn: () => () => undefined,
  UpdateDateColumn: () => () => undefined,
}));

import { BadRequestException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import type { DataSource, Repository } from 'typeorm';
import type { PasswordResetEmailService } from './password-reset-email.service';
import type { User } from './user.entity';

const { AuthService } = require('./auth.service') as typeof import('./auth.service');

describe('AuthService password reset security', () => {
  const buildService = () => {
    const userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const jwtService = { sign: jest.fn() };
    const dataSource = { transaction: jest.fn() };
    const emailService = {
      sendPasswordReset: jest.fn(),
      sendPasswordChanged: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AuthService(
      userRepository as unknown as Repository<User>,
      jwtService as unknown as JwtService,
      dataSource as unknown as DataSource,
      emailService as unknown as PasswordResetEmailService,
    );

    return { service, userRepository, dataSource, emailService };
  };

  it('does not disclose reset tokens and stores only their hash', async () => {
    const { service, userRepository, emailService } = buildService();
    const user = { email: 'user@example.com' } as User;
    userRepository.findOne.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    emailService.sendPasswordReset.mockResolvedValue(undefined);

    const response = await service.forgotPassword({ email: 'user@example.com' });

    expect(response).toEqual({
      message: 'If an account exists for that email, password reset instructions have been sent',
    });
    expect(response).not.toHaveProperty('resetToken');
    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      'user@example.com',
      expect.any(String),
    );

    const rawToken = emailService.sendPasswordReset.mock.calls[0][1] as string;
    expect(rawToken).toHaveLength(64);
    expect(user.password_reset_token).toBe(
      createHash('sha256').update(rawToken).digest('hex'),
    );
    expect(user.password_reset_token).not.toBe(rawToken);
  });

  it('returns the same response for an unknown email without sending mail', async () => {
    const { service, userRepository, emailService } = buildService();
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.forgotPassword({ email: 'unknown@example.com' }),
    ).resolves.toEqual({
      message: 'If an account exists for that email, password reset instructions have been sent',
    });
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('does not reveal an existing account when email delivery fails', async () => {
    const { service, userRepository, emailService } = buildService();
    const user = { email: 'user@example.com' } as User;
    userRepository.findOne.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    emailService.sendPasswordReset.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      service.forgotPassword({ email: 'user@example.com' }),
    ).resolves.toEqual({
      message: 'If an account exists for that email, password reset instructions have been sent',
    });
    expect(user.password_reset_token).toBeNull();
    expect(user.password_reset_expires_at).toBeNull();
  });

  it('rejects mismatched password confirmation before opening a transaction', async () => {
    const { service, dataSource } = buildService();

    await expect(
      service.resetPassword({
        token: 'token',
        password: 'NewPassword1!',
        passwordConfirmation: 'DifferentPassword1!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('consumes the token and invalidates existing JWTs in one transaction', async () => {
    const { service, dataSource, emailService } = buildService();
    const user = {
      email: 'user@example.com',
      password: 'old-hash',
      password_reset_token: 'stored-hash',
      password_reset_expires_at: new Date(Date.now() + 60_000),
      token_version: 2,
    } as User;
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
      save: jest.fn().mockResolvedValue(user),
    };
    dataSource.transaction.mockImplementation(async(callback: (value: typeof manager) => Promise<void>) => {
      await callback(manager);
    });

    await expect(
      service.resetPassword({
        token: 'valid-token',
        password: 'NewPassword1!',
        passwordConfirmation: 'NewPassword1!',
      }),
    ).resolves.toEqual({ message: 'Password reset successfully' });

    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(user.password_reset_token).toBeNull();
    expect(user.password_reset_expires_at).toBeNull();
    expect(user.token_version).toBe(3);
    expect(user.password).not.toBe('old-hash');
    expect(manager.save).toHaveBeenCalledWith(user);
    expect(emailService.sendPasswordChanged).toHaveBeenCalledWith('user@example.com');
  });
});
