import {
  Controller,
  Res,
  Get,
  HttpStatus,
  Body,
  ValidationPipe,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  Post,
  Put,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import {
  ChangePasswordDTO,
  CreateUserDTO,
  GetUserDTO,
  UpdateUserDTO,
} from "./dto/user.dto";
import { PinoLogger } from "nestjs-pino";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { Role } from "./enums/users.enum";
import { NotFoundError } from "rxjs";
import { ApiBearerAuth } from "@nestjs/swagger";
import { CurrentUser } from "src/auth/current-user/current-user.guard";
@Controller("user")
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly logger: PinoLogger,
    private usersService: UsersService
  ) {}

  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @Get("/list")
  async findUsers(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("role") role: string,
    @Query("search") search: string
  ) {
    this.logger.info("Controller=>list=>Input: %o", limit, page, role, search);
    const result = await this.usersService.findUsers({
      page,
      limit,
      role,
      search,
    });
    this.logger.info("Controller=>list=>Output: %o", result);
    return result;
  }
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @Get("/passenger/list")
  async findPassengers(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("search") search: string
  ) {
    this.logger.info(
      "Controller=>passenger=>list=>Input: %o",
      limit,
      page,
      search
    );
    const result = await this.usersService.findPassengers({
      page,
      limit,
      search,
    });
    this.logger.info("Controller=>passenger=>list=>Output: %o", result);
    return result;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  @Get("/initialAPI")
  async initialAPI(@CurrentUser() user) {
    this.logger.info("Controller=>initialAPI=>Input: %o", user);
    const result = await this.usersService.initialAPI(user);
    return result;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @Get(":id")
  async findUserById(@Param("id") id: string) {
    this.logger.info("Controller=>findUserById=>Input: %o", id);
    const user = await this.usersService.findUserById(id);
    this.logger.info("Controller=>findUserById=>Output: %o", id);
    return user;
  }
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @Get("/admin/:id")
  async findUserByAdminById(@Param("id") id: string) {
    this.logger.info("Controller=>findUserByAdminById=>Input: %o", id);
    const user = await this.usersService.findUserById(id, Role.ADMIN);
    this.logger.info("Controller=>findUserByAdminById=>Output: %o", id);
    return user;
  }
  @UseGuards(AuthGuard)
  @Roles(Role.DRIVER, Role.ADMIN, Role.CUSTOMER)
  @Patch("update/:id")
  async updateUser(
    @Body(ValidationPipe) user: UpdateUserDTO,
    @Param("id") userId: string
  ) {
    this.logger.info("Controller=>updateUser=>Input: %o", user);
    let result = await this.usersService.updateUser(user, userId);
    this.logger.info("Controller=>updateUser=>Output: %o", result);
    return result;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @Delete("/delete/:id")
  async deleteUser(@Param("id") userId: string) {
    this.logger.info("Controller=>deleteUser=>Input: %o", userId);
    const result = await this.usersService.deleteUser(userId);
    this.logger.info("Controller=>deleteUser=>Output: %o", result);
    return result;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  @Post("/create")
  async registerUser(@Body(ValidationPipe) user: CreateUserDTO) {
    const result = await this.usersService.createUser(user);
    this.logger.info("Controller=>registerUser=>Output: %o", result);
    return result;
  }
  @UseGuards(AuthGuard)
  @Roles(
    Role.ADMIN,
    Role.CUSTOMER,
    Role.CONTROLLER,
    Role.FINANCE,
    Role.OPERATOR,
    Role.DRIVER
  )
  @Post("/logout")
  async userLogout(@CurrentUser() user: GetUserDTO) {
    const result = await this.usersService.userLogout({
      id: user?.id,
    });
    this.logger.info("Controller=>userLogout=>Output: %o", result);
    return result;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.CUSTOMER)
  @Post("/delete")
  async deleteUserRequest(@CurrentUser() user: GetUserDTO) {
    this.logger.info("Controller=>deleteUserRequest=>Input: %o", user?.email);
    const result = await this.usersService.deleteUserRequest(user?.email);
    this.logger.info("Controller=>deleteUserRequest=>Output: %o", result);
    return result;
  }
  @ApiBearerAuth()
  @Patch("/changePasswordOfDriver")
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN, Role.CONTROLLER)
  async changePasswordOfDriver(
    @Body(ValidationPipe) data: ChangePasswordDTO,
    @Res() res
  ) {
    this.logger.info(
      "Controller=>changePasswordOfDriver=>Input: %o",
      data?.driverEmail
    );
    try {
      const driver = await this.usersService.changePasswordOfDriver(data);
      this.logger.info(
        "Controller=>changePasswordOfDriver=>Output: %o",
        data?.driverEmail
      );
      res.status(HttpStatus.OK).json(driver);
    } catch (err) {
      this.logger.error(
        "Controller=>changePasswordOfDriver=>Error: %o",
        data?.driverEmail
      );
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
}
