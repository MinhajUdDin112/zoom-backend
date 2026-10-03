import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import {
  CreateDriverGroupDTO,
  UpdateDriverGroupDTO,
} from "./dto/driverGroup.dto";
import { PinoLogger } from "nestjs-pino";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, In, Like, Repository } from "typeorm";
import { DriverGroup } from "./driverGroup.entity";
import { DriversService } from "src/driver/driver.service";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { UtilsService } from "src/utils/utils.service";

@Injectable()
export class DriverGroupService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
    @InjectRepository(DriverGroup)
    private readonly driverGroupRepository: Repository<DriverGroup>,
    private readonly utilsService: UtilsService,
    private readonly driverService: DriversService
  ) {}

  async createDriverGroup(
    createDriverGroupDto: CreateDriverGroupDTO
  ): Promise<DriverGroup> {
    try {
      createDriverGroupDto.name = this.utilsService.capitalizeWords(
        createDriverGroupDto.name
      );
      const { name, mode, driverIds } = createDriverGroupDto;
      const driverGroupExists = await this.findDriverGroupByName(
        createDriverGroupDto.name
      );
      if (driverIds && driverIds.length > 0) {
        let driverInDriverGroupExists = false;
        for (let driverId of driverIds) {
          const driverExists = await this.driverGroupRepository.findOne({
            where: { drivers: { id: driverId } },
            relations: {
              drivers: true,
            },
          });
          if (driverExists) {
            driverInDriverGroupExists = true;
            throw new ConflictException(
              ERROR_MESSAGE.DRIVER_ALREADY_IN_DRIVER_GROUP
            );
          }
        }
      }
      if (driverGroupExists) {
        throw new ConflictException(
          ERROR_MESSAGE.DRIVER_GROUP_NAME_ALREADY_EXISTS
        );
      }

      let driverGroupCreated = await this.driverGroupRepository.save({
        name,
        mode,
      });
      if (driverIds && driverIds.length > 0) {
        const drivers = await Promise.all(
          driverIds.map(async (driverId) => {
            // Fetch documents using DocumentService
            return await this.driverService.findDriverById(driverId);
          })
        );

        // Assign documents to the driver
        driverGroupCreated.drivers = drivers;

        // Save the driver entity with associated documents
        driverGroupCreated = await this.driverGroupRepository.save(
          driverGroupCreated
        );
      }

      return driverGroupCreated;

      // const drivers = await this.DriverRepository.findBy({ id: In(driverIds) });

      // const newDriverGroup = new DriverGroup();
      // newDriverGroup.name = name;
      // newDriverGroup.mode = mode;

      // const savedDriverGroup = await this.driverGroupRepository.save(
      //   newDriverGroup
      // );

      // const driverGroupDrivers = drivers.map((driver) => {
      //   const driverGroupDriver = new DriverGroupDriver();
      //   driverGroupDriver.driver = driver;
      //   driverGroupDriver.driverGroup = savedDriverGroup;
      //   return driverGroupDriver;
      // });

      // Save the DriverGroupDriver entities to associate drivers with the DriverGroup
      // await this.driverGroupDriverRepository.save(driverGroupDrivers);

      // return savedDriverGroup;
    } catch (error) {
      // Handle errors here
      this.logger.error(error);
      throw error;
    }
  }

  async findDriverGroupByName(name: string) {
    try {
      const capitalizedName = this.utilsService.capitalizeWords(name);
      const driverGroup = await this.driverGroupRepository.findOne({
        where: { name: capitalizedName },
      });
      return driverGroup;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }
  async updateDriverGroup(
    id: string,
    updateDriverGroupDTO: UpdateDriverGroupDTO
  ): Promise<DriverGroup> {
    if (updateDriverGroupDTO.name) {
      updateDriverGroupDTO.name = this.utilsService.capitalizeWords(
        updateDriverGroupDTO.name
      );
      const driverGroupExists = await this.findDriverGroupByName(
        updateDriverGroupDTO.name
      );
      if (driverGroupExists && driverGroupExists.id !== id) {
        throw new ConflictException(
          ERROR_MESSAGE.DRIVER_GROUP_NAME_ALREADY_EXISTS
        );
      }
    }
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      // Begin a transaction
      await queryRunner.startTransaction();

      const driverIds = updateDriverGroupDTO.driverIds;
      delete updateDriverGroupDTO.driverIds;

      // Update the driver entity
      const updateResult = await queryRunner.manager.update(
        DriverGroup,
        { id: id },
        updateDriverGroupDTO
      );

      // If the driver is not found, rollback the transaction and throw an error
      if (updateResult.affected === 0) {
        await queryRunner.rollbackTransaction();
        throw new Error("Driver  Group not found");
      }

      for (const driverId of driverIds) {
        const driverExists = await this.driverGroupRepository
          .createQueryBuilder("group")
          .leftJoinAndSelect("group.drivers", "driver")
          .where("driver.id = :driverId", { driverId })
          .getOne();
        if (driverExists && driverExists.id !== id) {
          throw new ConflictException(
            ERROR_MESSAGE.DRIVER_ALREADY_IN_DRIVER_GROUP
          );
        }
      }

      if (driverIds) {
        const drivers = await Promise.all(
          driverIds.map(async (driverId) => {
            // Fetch documents using DocumentService
            return await this.driverService.findDriverById(driverId);
          })
        );

        // Get the current driver entity
        const currentDriverGroup = await this.driverGroupRepository.findOne({
          where: { id: id },
          relations: ["drivers"], // Load associated documents
        });

        // Remove existing documents
        await queryRunner.manager
          .createQueryBuilder()
          .relation(DriverGroup, "drivers")
          .of(currentDriverGroup)
          .remove(currentDriverGroup.drivers);

        // Add new documents
        await queryRunner.manager
          .createQueryBuilder()
          .relation(DriverGroup, "drivers")
          .of(currentDriverGroup)
          .add(drivers);

        // Commit the transaction
        await queryRunner.commitTransaction();
      }

      // Fetch and return the updated driver entity
      const updatedDriverGroup = await this.driverGroupRepository.findOne({
        where: { id: id },
        relations: ["drivers"], // Load associated documents
      });

      return updatedDriverGroup;
    } catch (err) {
      // Rollback the transaction in case of any error
      await queryRunner.rollbackTransaction();

      this.logger.error("Service=>updateDriver=>Error: %o", err);
      throw err;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
    // try {

    //   // Find the DriverGroup entity by ID

    //   const driverGroup = await this.driverGroupRepository.findOne({
    //     where: { id },
    //     relations: ["drivers"],
    //   });

    //   if (!driverGroup) {
    //     throw new Error(`Driver group with id ${id} not found`);
    //   }

    //   const { name, mode, driverIds } = updateDriverGroupDTO;

    //   // Update the name and mode if provided in the DTO
    //   if (name) {
    //     driverGroup.name = name;
    //   }
    //   if (mode) {
    //     driverGroup.mode = mode;
    //   }

    //   // If driverIds are provided, update the associated drivers
    //   if (driverIds) {

    //     // Find the drivers by their IDs
    //     // const drivers = await this.DriverRepository.find({
    //     //   where: { id: In(driverIds) },
    //     // });

    //     // Create DriverGroupDriver entities for each driver and associate them with the DriverGroup
    //     // const driverGroupDrivers = drivers.map((driver) => {
    //     //   const driverGroupDriver = new DriverGroupDriver();
    //     //   driverGroupDriver.driver = driver;
    //     //   driverGroupDriver.driverGroup = driverGroup;
    //     //   driverGroupDriver.driverGroupId = driverGroup.id; // Explicitly set driverGroupId
    //     //   driverGroupDriver.driverId = driver.id; // Explicitly set driverId
    //     //   return driverGroupDriver;
    //     // });

    //     // Remove existing DriverGroupDriver entities for this DriverGroup
    //     await this.driverGroupDriverRepository.delete({
    //       driverGroup: driverGroup,
    //     });

    //     // Save the new DriverGroupDriver entities to associate drivers with the DriverGroup
    //     // await this.driverGroupDriverRepository.save(driverGroupDrivers);
    //   }

    //   // Save the updated DriverGroup entity
    //   const updatedDriverGroup = await this.driverGroupRepository.save(
    //     driverGroup
    //   );
    //   return updatedDriverGroup;
    // } catch (error) {
    //   console.error("Error updating driver group:", error);
    //   // Handle errors here
    //   throw new Error(`Failed to update driver group: ${error.message}`);
    // }
  }

  async deleteDriverGroup(driverGroupId: string) {
    this.logger.info("Service=>deleteDriverGroup=>Input: %o", driverGroupId);
    try {
      const driverGroup = await this.driverGroupRepository.findOne({
        where: {
          id: driverGroupId,
        },
        relations: {
          drivers: true,
        },
      });
      if (!driverGroup) {
        throw new Error("Driver group not found");
      }
      if (driverGroup.drivers.length > 0) {
        // If there are associated drivers, throw a custom error
        throw new Error("Cannot delete driver group with associated drivers");
      }

      const driverGroupDeleted = await this.driverGroupRepository.delete(
        driverGroupId
      );
      this.logger.info(
        "Service=>deleteDriverGroup=>Output: %o",
        driverGroupDeleted
      );
      return driverGroupId;
    } catch (err) {
      this.logger.error("Service=>deleteDriverGroup=>Error: %o", err);
      throw new Error(err);
    }
  }

  async findDriverGroupById(id: any, driverId?: string) {
    this.logger.info("Service=>findDriverGroupById=>Input: %o", id);
    let driverGroup;
    try {
      if (driverId) {
        driverGroup = await this.driverGroupRepository.find({
          where: { drivers: { id: driverId } },
          relations: {
            drivers: true,
          },
        });
      } else {
        driverGroup = await this.driverGroupRepository.findOne({
          where: { id },
          relations: {
            drivers: true,
          },
        });
      }

      this.logger.info("Service=>findDriverGroupById=>Output: %o", driverGroup);
      if (driverGroup) {
        return driverGroup;
      } else {
        this.logger.error(
          "Service=>findDriverGroupById=>Error: %o",
          "DriverGroup does not exist"
        );
        throw new Error("DriverGroup does not exist");
      }
    } catch (err) {
      this.logger.error("Service=>findDriverGroupById=>Error: %o", err);
      throw new Error(err.message);
    }
  }

  async listDriverGroups(options: {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
    excludeType?: boolean;
  }) {
    const { page, limit, search } = options;
    const skip = limit ? (page - 1) * limit : undefined;
    let where: any = {};
    // const searchMode = Mode[search as keyof typeof Mode];
    const orConditions = [];
    let sortBy = options.sort;
    if (search) {
      orConditions.push(
        { name: ILike(`%${search}%`) },
        { mode: ILike(`%${search}%`) },
        {
          drivers: {
            mobile: ILike(`%${search}%`),
          },
        }
      );
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
      const [driverGroups, total] =
        await this.driverGroupRepository.findAndCount({
          where,
          skip,
          order,
          take: limit,
          relations: {
            drivers: true,
          },
        });

      return { rows: driverGroups, count: total };
    } catch (err) {
      this.logger.error("Service=>listDriverGroups=>Error: %o", err);
      throw new Error(err.message);
    }
  }
}
