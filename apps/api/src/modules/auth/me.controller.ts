import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";

@ApiTags("auth")
@ApiBearerAuth()
@Controller("me")
export class MeController {
  @Get()
  getMe(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
    };
  }
}
