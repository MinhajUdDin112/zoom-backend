import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  ValidationPipe,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDTO } from "./dto/login.dto";
import { PinoLogger } from "nestjs-pino";
import { ResetPasswordDTO } from "./dto/resetPassword.dto";
import { CreateUserDTO } from "src/users/dto/user.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly logger: PinoLogger,
    private readonly authService: AuthService
  ) {}

  @Post("/login")
  async userLogin(@Body() login: LoginDTO) {
    this.logger.info("Controller=>userlogin=>Input: %o", login);
    let result = await this.authService.userLogin(login);
    this.logger.info("Controller=>userlogin=>Output: %o", result);
    return result;
  }

  @Post("/resetPassword")
  async resetPassword(@Body() body: ResetPasswordDTO) {
    const result = await this.authService.resetPassword(body);
    return { message: "success" };
  }

  @Post("/create")
  async registerUser(@Body(ValidationPipe) user: CreateUserDTO) {
    const result = await this.authService.registerUser(user);
    this.logger.info("Controller=>registerUser=>Output: %o", result);
    return result;
  }
}
