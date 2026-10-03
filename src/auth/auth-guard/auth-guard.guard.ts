import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { Reflector } from "@nestjs/core";
import { Role } from "src/users/enums/users.enum";
import { ROLES_KEY } from "src/Roles.decorator";
import { JwtService } from "@nestjs/jwt";
import { STATUS } from "src/driver/enums/driver.enum";
import { ERROR_MESSAGE } from "src/constants/errorMessage";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private reflector: Reflector,
    private readonly jwtService: JwtService
  ) {}
  async canActivate(context: ExecutionContext) {
    let decodedJWTToken;
    let req;
    try {
      req = context.switchToHttp().getRequest();
      const token = req.headers?.authorization.split(" ")[1];
      // Decode the token
      decodedJWTToken = this.jwtService.decode(token, { complete: true });
      const decodedToken = await this.jwtService.verifyAsync(token, {
        secret: process.env.SECRET_KEY,
      });
      if (decodedToken.role === Role.DRIVER) {
        const isDriver = await this.usersService.findUserById(
          decodedToken.id,
          Role.ADMIN
        );

        if (isDriver) {
          const driverForRole = await this.usersService.findUserWithoutStatus(
            isDriver.email
          );
          if (
            !driverForRole &&
            (isDriver.status === STATUS.SUSPENDED ||
              isDriver.status === STATUS.DISABLED)
          ) {
            throw new Error(
              isDriver.status === ERROR_MESSAGE.DRIVER_SUSPENDED
                ? ERROR_MESSAGE.DRIVER_SUSPENDED
                : ERROR_MESSAGE.DRIVER_DEACTIVATED
            );
          }
        } else {
          return false;
        }
      }
      const roleParam =
        decodedToken.role === Role.DRIVER ? Role.ADMIN : undefined;
      const user = await this.usersService.findUserById(
        decodedToken.id,
        roleParam
      );
      req.user = decodedToken;
      if (!user) {
        return false;
      }

      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()]
      );
      if (!requiredRoles.includes(decodedToken.role)) {
        return false;
      }
      return true;
    } catch (err) {
      console.log(err);
      if (
        err.message === "jwt expired" ||
        err.message === ERROR_MESSAGE.DRIVER_SUSPENDED ||
        err.message === ERROR_MESSAGE.DRIVER_DEACTIVATED
      ) {
        if (decodedJWTToken?.payload?.role === Role.DRIVER) {
          await this.usersService.driverLogout(req.headers.authorization, {
            online: false,
          });
        } else {
          await this.usersService.userLogout(decodedJWTToken?.payload?.id);
        }
        throw new UnauthorizedException();
      }
      return false;
    }
  }
}
