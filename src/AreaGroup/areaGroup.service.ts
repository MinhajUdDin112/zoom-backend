import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateAreaGroupDTO, UpdateAreaGroupDTO } from "./dto/areaGroup.dto";
import { PinoLogger } from "nestjs-pino";
import { InjectRepository } from "@nestjs/typeorm";
import { AreaGroup } from "./areaGroup.entity";
import { DataSource, ILike, Repository } from "typeorm";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { Zone } from "src/zone/zone.entity";
import { getConnection, getRepository, QueryRunner } from "typeorm";

@Injectable()
export class AreaGroupsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
    @InjectRepository(AreaGroup)
    private readonly areaGroupRepository: Repository<AreaGroup>
  ) {}

  async createAreaGroup(areaGroup: CreateAreaGroupDTO) {
    this.logger.info("Service=>createAreaGroup=>Input: %o", areaGroup);
    try {
      // Map zone IDs to Zone entities
      const zones = areaGroup.zones.map((id) => {
        const zone = new Zone();
        zone.id = id;
        return zone;
      });

      const areaGroupEntity = this.areaGroupRepository.create({
        ...areaGroup,
        zones,
      });

      const areaGroupCreated = await this.areaGroupRepository.save(
        areaGroupEntity
      );

      this.logger.info(
        "Service=>createAreaGroup=>Output: %o",
        areaGroupCreated
      );

      return areaGroupCreated;
    } catch (err) {
      this.logger.error("Service=>createAreaGroup=>Error: %o", err);
      if (
        err?.detail?.toString().includes("Key (name)=(") &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(ERROR_MESSAGE.AREA_GROUP_DUPLICATE);
      } else {
        throw new BadRequestException(err);
      }
    }
  }

  async updateAreaGroup(areaGroup: UpdateAreaGroupDTO, areaGroupId: string) {
    this.logger.info("Service=>updateAreaGroup=>Input: %o", {
      areaGroup,
      areaGroupId,
    });

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the existing AreaGroup entity
      const existingAreaGroup = await this.areaGroupRepository.findOne({
        where: { id: areaGroupId },
        relations: ["zones"], // Ensure zones are loaded
      });

      if (!existingAreaGroup) {
        throw new NotFoundException(ERROR_MESSAGE.AREA_GROUP_NOT_FOUND);
      }

      // Map zone IDs to Zone entities
      const zonesToUpdate = [];
      for (const zoneId of areaGroup.zones) {
        const zone = new Zone();
        zone.id = zoneId;
        zonesToUpdate.push(zone);
      }

      // Update existing zones with new data
      existingAreaGroup.zones = zonesToUpdate;

      // Update other properties of AreaGroup
      existingAreaGroup.name = areaGroup.name;
      existingAreaGroup.company = areaGroup.company;
      existingAreaGroup.price = areaGroup.price;
      existingAreaGroup.description = areaGroup.description;
      existingAreaGroup.isEnabled = areaGroup.isEnabled;

      // Save the updated AreaGroup entity
      await queryRunner.manager.save(existingAreaGroup);
      await queryRunner.commitTransaction();

      const updatedAreaGroup = await this.areaGroupRepository.findOne({
        where: { id: areaGroupId },
        relations: ["zones"],
      });

      this.logger.info(
        "Service=>updateAreaGroup=>Output: %o",
        updatedAreaGroup
      );

      return updatedAreaGroup;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>updateAreaGroup=>Error: %o", err);

      if (
        err?.detail?.toString().includes("Key (name)=(") &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(ERROR_MESSAGE.AREA_GROUP_DUPLICATE);
      } else {
        throw new InternalServerErrorException(err);
      }
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAreaGroup(areaGroupId: string): Promise<string> {
    this.logger.info("Service=>deleteAreaGroup=>Input: %o", areaGroupId);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the AreaGroup
      const areaGroup = await this.areaGroupRepository.findOne({
        where: { id: areaGroupId },
        relations: ["zones"],
      });

      if (!areaGroup) {
        this.logger.info("Service=>deleteAreaGroup=>NotFound: %o", areaGroupId);
        throw new NotFoundException(ERROR_MESSAGE.AREA_GROUP_NOT_FOUND);
      }

      // Remove relationships in the join table
      await queryRunner.manager
        .createQueryBuilder()
        .relation(AreaGroup, "zones")
        .of(areaGroup)
        .remove(areaGroup.zones);

      // Delete the AreaGroup
      const areaGroupDeleted = await queryRunner.manager
        .getRepository(AreaGroup)
        .delete(areaGroupId);

      if (areaGroupDeleted.affected === 0) {
        this.logger.warn("Service=>deleteAreaGroup=>NotFound: %o", areaGroupId);
        throw new NotFoundException(ERROR_MESSAGE.AREA_GROUP_NOT_FOUND);
      }

      await queryRunner.commitTransaction();

      this.logger.info("Service=>deleteAreaGroup=>Output: %o", "success");
      return "success";
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>deleteAreaGroup=>Error: %o", err);
      throw new InternalServerErrorException(err.message);
    } finally {
      await queryRunner.release();
    }
  }

  async findAreaGroups(options: {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
  }): Promise<{ rows: AreaGroup[]; count: number }> {
    const { page, limit, search } = options;
    const skip = limit ? (page - 1) * limit : undefined;
    let where: any = {};
    let sortBy = options.sort;
    const orConditions = [];

    if (search) {
      const searchValue = Number(search);
      orConditions.push(
        { name: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) },
        { company: ILike(`%${search}%`) }
      );
      // Check if the search value is a valid number for price search
      if (!isNaN(searchValue)) {
        orConditions.push({ price: searchValue });
      }
    }

    if (orConditions.length > 0) {
      where = orConditions;
    }

    const order: any = {};
    if (sortBy) {
      // Assuming sort is in the format of "key:order"
      const allSorting = sortBy.split(",");
      for (const sortItem of allSorting) {
        const [key, orderDirection] = sortItem.split(":");
        order[key] = orderDirection.toUpperCase();
      }
    }
    try {
      const [areaGroups, total] = await this.areaGroupRepository.findAndCount({
        skip,
        take: limit,
        where,
        order,
        relations: ["zones"], // Ensure zones are loaded
      });

      this.logger.info("service=>list=>AreaGroupOutput: %o", areaGroups);
      return { rows: areaGroups, count: total };
    } catch (error) {
      this.logger.error("Service=>AreaGroupOutput=>Error: %o", error);
      throw new Error(`Failed to get area group: ${error.message}`);
    }
  }

  async findAreaGroupById(id: string): Promise<AreaGroup> {
    this.logger.info("Service=>findAreaGroupById=>Input: %o", id);
    try {
      const areaGroup = await this.areaGroupRepository.findOne({
        where: { id },
        relations: ["zones"], // Include relations to fetch zones
      });

      if (!areaGroup) {
        this.logger.error(
          "Service=>findAreaGroupById=>Error: %o",
          ERROR_MESSAGE.AREA_GROUP_NOT_FOUND
        );
        throw new NotFoundException(ERROR_MESSAGE.AREA_GROUP_NOT_FOUND);
      }

      this.logger.info("Service=>findAreaGroupById=>Output: %o", areaGroup);
      return areaGroup;
    } catch (err) {
      this.logger.error("Service=>findAreaGroupById=>Error: %o", err.message);
      throw new InternalServerErrorException(
        `Failed to fetch area group: ${err.message}`
      );
    }
  }
}
