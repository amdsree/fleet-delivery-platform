import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/require-permissions.decorator';
import { PermissionCode, RoleName } from '../enums';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User session not found');
    }

    // ADMIN role bypasses individual permission restrictions
    if (user.role?.name === RoleName.ADMIN) {
      return true;
    }

    const userPermissions: string[] =
      user.role?.permissions?.map((p: any) => p.permission_code) || [];

    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAll) {
      throw new ForbiddenException(
        `Insufficient permissions: requires [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('User role not assigned');
    }

    if (user.role.name === RoleName.ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role.name);
    if (!hasRole) {
      throw new ForbiddenException(
        `Unauthorized role: requires [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
