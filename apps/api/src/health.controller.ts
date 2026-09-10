import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "./prisma/prisma.service";
import { Public } from "./modules/auth/public.decorator";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get("health")
  @ApiOperation({ summary: "Health check endpoint" })
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: "unhealthy",
        database: "disconnected",
      });
    }

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    };
  }
}
