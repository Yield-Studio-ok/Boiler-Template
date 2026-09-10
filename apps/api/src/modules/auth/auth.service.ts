import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { FirebaseService } from "./firebase.service";
import type { AuthUser } from "./auth.types";
import { LoginDto } from "./dto/login.dto";

const DEMO_USERS = [
  {
    email: "admin@admin.com",
    password: "admin123",
    name: "Admin",
    role: "admin",
  },
  {
    email: "user@user.com",
    password: "user123",
    name: "User",
    role: "user",
  },
] as const;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private firebase: FirebaseService,
  ) {}

  async onModuleInit() {
    if (this.firebase.isEnabled()) return;
    await this.ensureDemoUsers();
  }

  async login(dto: LoginDto) {
    if (this.firebase.isEnabled()) {
      throw new BadRequestException(
        "Password login is disabled while Firebase Auth is configured. Sign in with Firebase and send the ID token.",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const authUser: AuthUser = {
      uid: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwt.sign({
        sub: authUser.uid,
        email: authUser.email,
        role: authUser.role,
      }),
      user: authUser,
    };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    if (this.firebase.isEnabled()) {
      return this.firebase.verifyIdToken(token);
    }

    const payload = this.jwt.verify<{
      sub: string;
      email: string;
      role: string;
    }>(token);

    return {
      uid: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

  private async ensureDemoUsers() {
    for (const demo of DEMO_USERS) {
      const password = await bcrypt.hash(demo.password, 10);
      await this.prisma.user.upsert({
        where: { email: demo.email },
        update: { password, role: demo.role, name: demo.name },
        create: {
          email: demo.email,
          password,
          name: demo.name,
          role: demo.role,
        },
      });
    }

    this.logger.log("Demo users ready (admin@admin.com / user@user.com)");
  }
}
