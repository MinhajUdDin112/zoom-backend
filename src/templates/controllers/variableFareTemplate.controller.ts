import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ValidationPipe,
  UseGuards,
  Res,
} from "@nestjs/common";
import { VaraiableFareTemplateService } from "../services/variableFareTemplate.service";
import {
  CreateVariableFareTemplateDTO,
  UpdateVariableFareTemplateDTO,
} from "../dto/variableFareTemplate.dto";
import { PinoLogger } from "nestjs-pino";
import { ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";
import { Role } from "src/users/enums/users.enum";

// @ApiBearerAuth()
// @UseGuards(AuthGuard)
// @Roles(Role.ADMIN)
@Controller("api/variableFareTemplate")
export class VariableFareTemplateController {
  constructor(
    private readonly variableFareTemplateService: VaraiableFareTemplateService,
    private readonly logger: PinoLogger
  ) {}

  @Post("create")
  async create(@Body() data: CreateVariableFareTemplateDTO) {
    this.logger.info("Controller=>createVariableFareTemplate=>Input: %o", data);
    const res = this.variableFareTemplateService.create(data);
    this.logger.info("Controller=>createVariableFareTemplate=>Output: %o", res);
    return res;
  }

  @Get("findAll")
  async findAll(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
    @Query("page") page: number,
    @Query("filter") filter?: string,
    @Query("search") search?: string
  ) {
    this.logger.info("Controller=>variableFareTemplate=>findAll=>Input: %o", {
      limit,
      page,
    });
    const res = await this.variableFareTemplateService.findAll({
      limit,
      page,
      filter,
      search,
    });
    this.logger.info(
      "Controller=>variableFareTemplate=>findAll=>Output: %o",
      res
    );
    return res;
  }

  @Get("find/:id")
  async findOne(@Param("id") id: string) {
    this.logger.info(
      "Controller=>variableFareTemplate=>findById=>Input: %o",
      id
    );
    const res = this.variableFareTemplateService.findOne(id);
    this.logger.info(
      "Controller=>variableFareTemplate=>findById=>Output: %o",
      res
    );
    return res;
  }

  @Patch("update/:id")
  async update(
    @Body(ValidationPipe) data: UpdateVariableFareTemplateDTO,
    @Param("id") id: string,
    @Res() res
  ) {
    this.logger.info("Controller=>updateVariableFareTemplate=>Input: %o", data);
    try {
      const result = await this.variableFareTemplateService.update(id, data);
      this.logger.info(
        "Controller=>updateVariableFareTemplate=>Output: %o",
        result
      );

      return res.json(result);
    } catch (error) {
      this.logger.error(
        "Controller=>updateVariableFareTemplate=>Error: %o",
        error
      );

      return res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  }

  @Delete("/delete/:id")
  async deleteCapability(@Param("id") id: string) {
    this.logger.info("Controller=>deleteVariableFareTemplate=>Input: %o", id);
    const result = await this.variableFareTemplateService.remove(id);
    this.logger.info(
      "Controller=>deleteVariableFareTemplate=>Output: %o",
      result
    );
    return result;
  }
}
