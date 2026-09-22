import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@foxiby/database';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

export type AuthUser = {
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
};

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  async register(input: { email: string; password: string; name?: string; organizationName: string }) {
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email is already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, passwordHash, name: input.name?.trim() } });
      const organization = await tx.organization.create({ data: { name: input.organizationName.trim() } });
      const membership = await tx.organizationMembership.create({
        data: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
      });
      return { user, membership };
    });

    return this.issueToken({ userId: result.user.id, organizationId: result.membership.organizationId, role: result.membership.role });
  }

  async login(input: { email: string; password: string; organizationId?: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() }, include: { memberships: true } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const membership = input.organizationId
      ? user.memberships.find((item) => item.organizationId === input.organizationId)
      : user.memberships[0];
    if (!membership) throw new UnauthorizedException('Organization access denied');
    return this.issueToken({ userId: user.id, organizationId: membership.organizationId, role: membership.role });
  }

  verifyToken(token: string): AuthUser {
    try {
      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) throw new Error('JWT_SECRET is not configured');
      const payload = jwt.verify(token, secret);
      if (typeof payload !== 'object' || !payload || !('userId' in payload) || !('organizationId' in payload) || !('role' in payload)) throw new Error('Invalid token');
      return payload as AuthUser;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private issueToken(user: AuthUser) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return { accessToken: jwt.sign(user, secret, { expiresIn: '1h' }), user };
  }
}
