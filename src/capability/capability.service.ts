import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Capability } from "./entity/capability.entity";
import { DataSource, ILike, Repository } from "typeorm";
import {
  CreateCapabilityDTO,
  GetAllDTO,
  QueryOptionsDTO,
  UpdateCapabilityDTO,
} from "./dto/createCapabaility.dto";
import { PinoLogger } from "nestjs-pino";
import { OptionsDTO } from "src/users/dto/user.dto";
import { STATUS } from "src/users/enums/users.enum";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { NOTFOUND } from "dns";
import internal from "stream";

@Injectable()
export class CapabilityService {
  constructor(
    @InjectRepository(Capability)
    private readonly capabilityRepository: Repository<Capability>,
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource
  ) {}
  async createCapabilities(data: CreateCapabilityDTO) {
    try {
      this.logger.info("Service=>createCapabilities=>Input: %o", data);
      const createdCapabaility = await this.capabilityRepository.save(data);
      this.logger.info(
        "Service=>createCapabilities=>Output: %o",
        createdCapabaility
      );
      return createdCapabaility;
    } catch (err) {
      this.logger.error("Service=>createCapabilities=>Error: %o", err);
      if (
        err?.detail?.toString().includes("Key (name)=(") &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(
          ERROR_MESSAGE.CAPABILITY_NAME_ALREADY_EXISTS
        );
      } else if (
        err?.detail?.toString().includes(`Key ("shortCode")=(`) &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(
          ERROR_MESSAGE.CAPABILITY_SHORT_CODE_ALREADY_EXISTS
        );
      } else {
        throw new BadRequestException(err);
      }
    }
  }
  async findAll(options: GetAllDTO) {
    let skip: number | undefined;
    let take: number | undefined;

    // Check if page and limit are provided
    if (options.page && options.limit) {
      skip = (options.page - 1) * options.limit;
      take = options.limit;
    }
    let sortBy = options.sort;
    let where = {};
    let orConditions = [];
    let { filter, search } = options;
    let typeSearch: string = search?.replace(/\s+/g, "_");
    if (search) {
      orConditions.push(
        { name: ILike(`%${search}%`) },
        { shortCode: ILike(`%${search}%`) },
        { type: ILike(`%${typeSearch}%`) }
      );
    }
    if (orConditions.length > 0) {
      where = orConditions;
    }
    if (filter) {
      const filterArray = filter.split("&");
      for (const filterItem of filterArray) {
        const [key, val] = filterItem.split(":");
        where = { ...where, [key]: val };
      }
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
    let queryOptions: QueryOptionsDTO = {
      skip,
      take,
    };
    if (Object.keys(where).length > 0) {
      queryOptions.where = where;
    }
    try {
      const capabailities = await this.capabilityRepository.findAndCount({
        ...queryOptions,
        order,
      });
      let response = {
        rows: capabailities[0],
        count: capabailities[1],
      };
      this.logger.info("service=>list=>Output: %o", response);
      return response;
    } catch (err) {
      this.logger.error("Service=>findAll=>Error: %o", err);
      throw new BadRequestException(err);
    }
  }

  async findById(id: string) {
    this.logger.info("service=>findById=>Input: %o", id);
    try {
      const capabaility = await this.capabilityRepository.findOne({
        where: {
          id,
        },
        relations: {
          drivers: true,
          vehicle: true,
          capabilityCostPrice: true,
        },
      });
      if (!capabaility) {
        this.logger.error(
          "Service=>findById=>Error: %o",
          ERROR_MESSAGE.NOT_FOUND
        );
        throw new NotFoundException(ERROR_MESSAGE.NOT_FOUND);
      }
      this.logger.info("service=>findById=>Output: %o", capabaility);
      return capabaility;
    } catch (err) {
      this.logger.error("Service=>findById=>Error: %o", err);
      throw new InternalServerErrorException(err);
    }
  }

  async updateCapability(data: UpdateCapabilityDTO, id: string) {
    this.logger.info("service=>updateCapability=>Input: %o", data);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const response = await queryRunner.manager.update(
        Capability,
        { id: id },
        data
      );
      if (response.affected === 0) {
        this.logger.error(
          "Service=>updateCapability=>Error: %o",
          ERROR_MESSAGE.NOT_FOUND
        );
        throw new NotFoundException(ERROR_MESSAGE.NOT_FOUND);
      }
      const capability = await this.findById(id);
      this.logger.info("service=>updateCapability=>Output: %o", capability);
      return capability;
    } catch (err) {
      this.logger.error("Service=>updateCapability=>Error: %o", err);
      if (
        err?.detail?.toString().includes("Key (name)=(") &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(
          ERROR_MESSAGE.CAPABILITY_NAME_ALREADY_EXISTS
        );
      } else if (
        err?.detail?.toString().includes(`Key ("shortCode")=(`) &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(
          ERROR_MESSAGE.CAPABILITY_SHORT_CODE_ALREADY_EXISTS
        );
      } else {
        throw new InternalServerErrorException(err);
      }
    } finally {
      await queryRunner.release();
    }
  }
  async deleteCapability(id: string) {
    this.logger.info("Service=>deleteCapability=>Input: %o", id);
    const capability = await this.findById(id);
    if (!capability) {
      throw new NotFoundException(ERROR_MESSAGE.NOT_FOUND);
    }
    if (capability.drivers.length > 0) {
      throw new ConflictException(
        ERROR_MESSAGE.CAPABILITY_ASSOCIATED_WITH_DRIVER
      );
    }
    if (capability.vehicle.length > 0) {
      throw new ConflictException(
        ERROR_MESSAGE.CAPABILITY_ASSOCIATED_WITH_VEHICLE
      );
    }
    if (capability.capabilityCostPrice.length > 0) {
      throw new ConflictException(
        ERROR_MESSAGE.CAPABILITY_ASSOCIATED_WITH_TEMPLATE
      );
    }
    try {
      const capabilityDeleted = await this.capabilityRepository.delete(id);
      this.logger.info(
        "Service=>deleteCapability=>Ouput: %o",
        capabilityDeleted
      );
      return "success";
    } catch (err) {
      this.logger.error("Service=>deleteCapability=>Error: %o", err);
      throw new InternalServerErrorException(err);
    }
  }

  async findBulkCapabilitiesById(ids: string[]) {
    try {
      this.logger.info("Service=>findBulkCapabilitiesById=>Input: %o", ids);
      const fetchedCapabilities = await Promise.all(
        await ids.map(async (id) => {
          return await this.capabilityRepository.findOne({
            where: {
              id,
            },
          });
        })
      );
      this.logger.info("Service=>findBulkCapabilitiesById=>Output: %o", ids);
      return fetchedCapabilities;
    } catch (err) {
      this.logger.error("Service=>findBulkCapabilitiesById=>error: %o", err);
      return err;
    }
  }
}
