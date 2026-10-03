import { Controller, Get, Post, Body, Patch, Param, Delete, Query, DefaultValuePipe, ParseIntPipe, ValidationPipe, UseGuards } from '@nestjs/common';
import { VaraiableFareTemplateService } from '../services/variableFareTemplate.service';
import { CreateVariableFareTemplateDTO, UpdateVariableFareTemplateDTO } from '../dto/variableFareTemplate.dto';
import { PinoLogger } from 'nestjs-pino';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth-guard/auth-guard.guard';
import { Roles } from 'src/Roles.decorator';
import { Role } from 'src/users/enums/users.enum';
import { ZoneTemplateService } from '../services/zoneTemplate.service';
import { CreateZoneTemplateDTO, UpdateZoneTemplateDTO } from '../dto/zoneTemplate.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles (Role.ADMIN)

@Controller('api/zoneTemplate')
export class ZoneTemplateController {
  constructor(private readonly zoneTemplateService: ZoneTemplateService,
    private readonly logger:PinoLogger

    ) {}

  @Post('create')
  async create(@Body() data: CreateZoneTemplateDTO) {
    this.logger.info('Controller=>createZoneTemplate=>Input: %o',data)
    const res = this.zoneTemplateService.create(data);
    this.logger.info('Controller=>createZoneTemplate=>Output: %o',res)
    return res;
  }

  @Get('findAll')
  async findAll(@Query('limit',new DefaultValuePipe(10), ParseIntPipe)
   limit:number, @Query('page') page:number,
   @Query('filter') filter?: string,
   @Query('search') search?: string)  {
    this.logger.info('Controller=>zoneTemplate=>findAll=>Input: %o',{limit, page,filter,search})
    const res = await this.zoneTemplateService.findAll({limit, page,filter,search})
    this.logger.info('Controller=>zoneTemplate=>findAll=>Output: %o',res)
    return res
  }

  @Get('find/:id')
  async findOne(@Param('id') id: string) {
    this.logger.info('Controller=>zoneTemplate=>findById=>Input: %o',id)
        const res = this.zoneTemplateService.findOne(id);
        this.logger.info('Controller=>zoneTemplate=>findById=>Output: %o',res)
        return res
  }


  @Patch('update/:id')
  async update(@Body(ValidationPipe) data:UpdateZoneTemplateDTO, @Param('id') id:string) {
    this.logger.info('Controller=>updateZoneTemplate=>Input: %o',data)
    const res = await this.zoneTemplateService.update(id, data);
    this.logger.info('Controller=>updateZoneTemplate=>Output: %o',res)
    return res
  }


  @Delete("/delete/:id")
  async deleteCapability(@Param("id") id: string) {
    this.logger.info("Controller=>deleteZoneTemplate=>Input: %o", id);
    const result = await this.zoneTemplateService.remove(id);
    this.logger.info("Controller=>deleteZoneTemplate=>Output: %o", result);
    return result;
  }
}
