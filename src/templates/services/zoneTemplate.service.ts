import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, In, Not, Repository } from "typeorm";
import { PinoLogger } from "nestjs-pino";
import { FindAllQueryDto } from "src/utils/dto/filterBy.dto";
import { getAllZoneTemplates } from "../types";
import { QueryOptionsDTO } from "src/utils/dto/queryOption.dto";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { ZoneTemplate } from "../entities/zoneTemplate.entity";
import { ZoneCost } from "../entities/zoneCost.entity";
import {
  CreateZoneTemplateDTO,
  UpdateZoneTemplateDTO,
} from "../dto/zoneTemplate.dto";

@Injectable()
export class ZoneTemplateService {
  constructor(
    @InjectRepository(ZoneTemplate)
    private readonly zoneTemplateRepository: Repository<ZoneTemplate>,
    @InjectRepository(ZoneCost)
    private readonly zoneCostRepository: Repository<ZoneCost>,
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource
  ) {}

  async create(data: CreateZoneTemplateDTO): Promise<ZoneTemplate> {
    const zonesCost = data["zoneCost"];
    delete data["zoneCost"];

    try {
      const zoneTemplate = this.zoneTemplateRepository.create(data);

      // Save VariableFareTemplate
      const savedZoneTemplate = await this.zoneTemplateRepository.save(
        zoneTemplate
      );

      // Associate distanceCost with VariableFareTemplate
      if (zonesCost && zonesCost.length > 0) {
        for (let index = 0; index < zonesCost.length; index++) {
          const element = zonesCost[index];
          const zoneCostEntity = this.zoneCostRepository.create(element);

          zoneCostEntity.zoneTemplate = savedZoneTemplate;
          await this.zoneCostRepository.save(zoneCostEntity);
        }
        // zonesCost.forEach(async (zc) => {});
      }

      this.logger.info(
        "Service=>createZoneTemplate=>Output: %o",
        savedZoneTemplate
      );

      return savedZoneTemplate;
    } catch (err) {
      this.logger.error("Service=>createZoneTemplate=>Error: %o", err);
      if (
        err?.code === "23505" &&
        err?.detail?.includes('Key ("matixName")=(') &&
        err?.detail?.includes(") already exists.")
      ) {
        throw new BadRequestException(ERROR_MESSAGE.ZONE_TEMPLATE_DUPLICATE);
      } else {
        throw new InternalServerErrorException(err);
      }
    }
  }

  async findAll(options: FindAllQueryDto): Promise<getAllZoneTemplates> {
    let skip: number | undefined;
    let take: number | undefined;

    // Check if page and limit are provided
    if (options.page && options.limit) {
      skip = (options.page - 1) * options.limit;
      take = options.limit;
    }
    const orConditions = [];

    let where = {};
    let { filter, search } = options;
    if (filter) {
      const filterArray = filter.split("&");
      for (const filterItem of filterArray) {
        const [key, val] = filterItem.split(":");
        where = { ...where, [key]: val };
      }
    }
    if (search) {
      orConditions.push(
        { matixName: ILike(`%${search}%`) },
        { costPerExtraMile: Number(search) },
        { pricePerExtraMile: Number(search) }
      );
    }

    if (orConditions.length > 0) {
      where = orConditions;
    }

    let queryOptions: QueryOptionsDTO = {
      skip,
      take,
    };

    if (skip !== undefined && take !== undefined) {
      queryOptions.skip = skip;
      queryOptions.take = take;
    }

    if (Object.keys(where).length > 0) {
      queryOptions.where = where;
    }

    queryOptions.relations = ["zoneCost"];

    queryOptions.order = {
      createdAt: "DESC",
    };

    try {
      const res = await this.zoneTemplateRepository.findAndCount(queryOptions);
      const response = {
        data: res[0],
        count: res[1],
      };
      this.logger.info("service=>list=>Output: %o", response);
      return response;
    } catch (err) {
      this.logger.error("Service=>findAll=>Error: %o", err);
      throw new BadRequestException(err);
    }
  }

  async findOne(id: string): Promise<ZoneTemplate> {
    this.logger.info("service=>findById=>Input: %o", id);
    try {
      const query = `WITH ZoneCostData AS (
        SELECT
          zc.id AS "zoneCostId",
          zc."from",
          zc."to",
          zc.price,
          zc.cost,
          zc."createdAt" AS "zoneCostCreatedAt",
          zc."lastModified" AS "zoneCostLastModified",
          zc."zoneTemplateId"
        FROM 
          "public"."zoneCost" zc
        LEFT JOIN 
          "public"."zone" z ON z.id::text = zc."to"
        ORDER BY 
          z.name
      )
      SELECT 
        zt.id,
        zt."matixName",
        zt."mirrorAllEnteredAmount",
        zt."globalIncrementAmount",
        zt."costPerExtraMile",
        zt."pricePerExtraMile",
        zt."createdAt",
        zt."lastModified",
        COALESCE(
          json_agg(
            json_build_object(
              'id', zc."zoneCostId",
              'from', zc."from",
              'to', zc."to",
              'price', zc.price,
              'cost', zc.cost,
              'createdAt', zc."zoneCostCreatedAt",
              'lastModified', zc."zoneCostLastModified"
            )
          ) FILTER (WHERE zc."zoneCostId" IS NOT NULL), '[]'
        ) AS "zoneCost"
      FROM 
        "public"."zoneTemplate" zt
      LEFT JOIN 
        ZoneCostData zc ON zc."zoneTemplateId" = zt.id
      WHERE 
        zt.id = $1::uuid
      GROUP BY 
        zt.id;
      `;

      const res = await this.zoneTemplateRepository.query(query, [id]);
      if (!res[0]) {
        this.logger.error(
          "Service=>findById=>Error: %o",
          ERROR_MESSAGE.NOT_FOUND
        );
        throw new NotFoundException(ERROR_MESSAGE.NOT_FOUND);
      }
      this.logger.info("service=>findById=>Output: %o", res[0]);
      return res[0];
    } catch (err) {
      this.logger.error("Service=>findById=>Error: %o", err);
      throw new InternalServerErrorException(err);
    }
  }

  async remove(id: string): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      // Fetch the vehicle with associated documents
      const zoonTemplate = await queryRunner.manager.findOne(ZoneTemplate, {
        where: { id: id },
        relations: ["zoneCost"],
      });

      if (zoonTemplate.zoneCost && zoonTemplate.zoneCost.length > 0) {
        for (const zc of zoonTemplate.zoneCost) {
          await queryRunner.manager.delete(ZoneCost, zc.id);
        }
      }

      // Delete the vehicles
      const result = await queryRunner.manager.delete(ZoneTemplate, id);
      if (result.affected === 0) {
        throw new Error(`variableFareTemplate with id ${id} not found`);
      }
      await queryRunner.commitTransaction();
      return "success";
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new Error(
        `Failed to delete variableFareTemplate: ${error.message}`
      );
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, data: UpdateZoneTemplateDTO): Promise<ZoneTemplate> {
    const zonesCost = data["zoneCost"];
    delete data["zoneCost"];

    try {
      // Fetch the existing VariableFareTemplate with its relations
      const zoonTemplate = await this.zoneTemplateRepository.findOne({
        where: { id },
        relations: ["zoneCost"],
      });

      if (!zoonTemplate) {
        throw new NotFoundException("ZoneTemplate not found");
      }

      // Update basic properties
      Object.assign(zoonTemplate, data);

      await this.zoneTemplateRepository.save(zoonTemplate);

      // Update distance costs
      if (zonesCost) {
        if (zonesCost.length > 0) {
          // Remove existing distance costs that are not in the update data
          const zonesCostIds = zonesCost.map((zc) => zc.id);
          await this.zoneCostRepository.delete({
            zoneTemplate: { id },
            id: Not(In(zonesCostIds)),
          });

          for (const zc of zonesCost) {
            let zoneCostEntity = await this.zoneCostRepository.findOne({
              where: { id: zc.id, zoneTemplate: { id } },
            });
            if (zoneCostEntity && zc.id) {
              Object.assign(zoneCostEntity, zc);
            } else {
              zoneCostEntity = this.zoneCostRepository.create(zc);
              zoneCostEntity.zoneTemplate = zoonTemplate;
            }
            await this.zoneCostRepository.save(zoneCostEntity);
          }
        } else {
          await this.zoneCostRepository.delete({ zoneTemplate: { id } });
        }
      }

      const updatedZoneTemplate = await this.zoneTemplateRepository.findOne({
        where: { id },
        relations: ["zoneCost"],
      });

      this.logger.info(
        "Service=>updateZoneTemplate=>Output: %o",
        updatedZoneTemplate
      );

      return updatedZoneTemplate;
    } catch (err) {
      this.logger.error("Service=>updateZoneTemplate=>Error: %o", err);
      if (
        err?.code === "23505" &&
        err?.detail?.includes('Key ("matixName")=(') &&
        err?.detail?.includes(") already exists.")
      ) {
        throw new BadRequestException(ERROR_MESSAGE.ZONE_TEMPLATE_DUPLICATE);
      } else {
        throw new InternalServerErrorException(err);
      }
    }
  }
}
