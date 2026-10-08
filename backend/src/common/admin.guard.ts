import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/** Если задана переменная ADMIN_TOKEN — админ-эндпоинты требуют заголовок x-admin-token. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const token = process.env.ADMIN_TOKEN;
    if (!token) return true;
    const req = ctx.switchToHttp().getRequest();
    if (req.headers['x-admin-token'] !== token) throw new UnauthorizedException({ code: 'BAD_TOKEN', params: {} });
    return true;
  }
}
