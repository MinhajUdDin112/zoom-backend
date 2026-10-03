import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateVariableFareTemplateDTO,
  UpdateCapabilityCostPriceDTO,
  UpdateVariableFareTemplateDTO,
} from "../dto/variableFareTemplate.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { VariableFareTemplate } from "../entities/variableFareTemplate.entity";
import {
  DataSource,
  FindManyOptions,
  ILike,
  In,
  Not,
  Repository,
} from "typeorm";
import { DistanceCost } from "../entities/distanceCost.entity";
import { TimeCost } from "../entities/timeCost.entity";
import { Capability } from "src/capability/entity/capability.entity";
import { PinoLogger } from "nestjs-pino";
import { FindAllQueryDto } from "src/utils/dto/filterBy.dto";
import { getAllVariableFareTemplates } from "../types";
import { QueryOptionsDTO } from "src/utils/dto/queryOption.dto";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { CapabilityCostPrice } from "../entities/capabilityCostPrice.entity";

// import { UpdateTemplateDto } from './dto/distanceCost.dto';

@Injectable()
export class VaraiableFareTemplateService {
  constructor(
    @InjectRepository(VariableFareTemplate)
    private readonly variableFareTemplateRepository: Repository<VariableFareTemplate>,
    @InjectRepository(DistanceCost)
    private readonly distanceCostRepository: Repository<DistanceCost>,
    @InjectRepository(TimeCost)
    private readonly timeCostRepository: Repository<TimeCost>,
    @InjectRepository(CapabilityCostPrice)
    private readonly capabilityCostPriceRepository: Repository<CapabilityCostPrice>,
    @InjectRepository(Capability)
    private readonly capabilityRepository: Repository<Capability>,
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource
  ) {}
  // async create(
  //   data: CreateVariableFareTemplateDTO
  // ): Promise<VariableFareTemplate> {
  //   const {
  //     name,
  //     description,
  //     sameCostPrice,
  //     minCost,
  //     maxCost,
  //     minPrice,
  //     maxPrice,
  //     pickupPrice,
  //     pickupCost,
  //     distanceCost,
  //     timeCost,
  //     capability,
  //   } = data;
  //   try {
  //     let capabilities = [];

  //     if (capability) {
  //       capabilities = await this.capabilityRepository.find({
  //         where: { id: In(capability) },
  //       });
  //     }

  //     const variableFareTemplate = this.variableFareTemplateRepository.create({
  //       name,
  //       description,
  //       sameCostPrice,
  //       minCost: sameCostPrice ? minPrice : minCost,
  //       maxCost: sameCostPrice ? maxPrice : maxCost,
  //       minPrice,
  //       maxPrice,
  //       pickupPrice,
  //       pickupCost: !sameCostPrice ? pickupCost : pickupPrice,
  //     });

  //     if (capabilities.length > 0)
  //       variableFareTemplate.capability = capabilities;

  //     // Save VariableFareTemplate
  //     const savedVariableFareTemplate =
  //       await this.variableFareTemplateRepository.save(variableFareTemplate);

  //     // Associate distanceCost with VariableFareTemplate
  //     if (distanceCost && distanceCost.length > 0) {
  //       distanceCost.forEach(async (dc) => {
  //         const distanceCostEntity = this.distanceCostRepository.create(dc);
  //         distanceCostEntity.cost = sameCostPrice
  //           ? distanceCostEntity.price
  //           : distanceCostEntity.cost;

  //         distanceCostEntity.variableFareTemplate = savedVariableFareTemplate;
  //         await this.distanceCostRepository.save(distanceCostEntity);
  //       });
  //     }

  //     // Associate timeCost with VariableFareTemplate
  //     if (timeCost && timeCost.length > 0) {
  //       timeCost.forEach(async (tc) => {
  //         const timeCostEntity = this.timeCostRepository.create(tc);

  //         timeCostEntity.cost = sameCostPrice
  //           ? timeCostEntity.price
  //           : timeCostEntity.cost;

  //         timeCostEntity.variableFareTemplate = savedVariableFareTemplate;
  //         await this.timeCostRepository.save(timeCostEntity);
  //       });
  //     }

  //     this.logger.info(
  //       "Service=>createVariableFareTemplate=>Output: %o",
  //       savedVariableFareTemplate
  //     );

  //     return savedVariableFareTemplate;
  //   } catch (error) {
  //     this.logger.error("Service=>createCapabilities=>Error: %o", error);
  //     throw new BadRequestException(error);
  //   }
  // }

  async create(
    data: CreateVariableFareTemplateDTO
  ): Promise<VariableFareTemplate> {
    const { name, description, capabilityCostPrice } = data;

    try {
      // Step 1: Create VariableFareTemplate
      const variableFareTemplate = this.variableFareTemplateRepository.create({
        name,
        description,
      });

      const savedVariableFareTemplate =
        await this.variableFareTemplateRepository.save(variableFareTemplate);

      // Step 2: Create CapabilityCostPrice, DistanceCost, and TimeCost
      if (capabilityCostPrice && capabilityCostPrice.length > 0) {
        for (const capabilityCostData of capabilityCostPrice) {
          const {
            capability,
            sameCostPrice,
            minCost,
            maxCost,
            minPrice,
            maxPrice,
            pickupPrice,
            pickupCost,
            distanceCost,
            timeCost,
          } = capabilityCostData;

          // Find capability by ID (just ensure it's a valid UUID string)
          const capabilityId = capability; // Assuming capability is a valid UUID string

          // Create CapabilityCostPrice
          const capabilityCostPriceEntity =
            this.capabilityCostPriceRepository.create({
              capability: capabilityId ? { id: capabilityId } : undefined, // Assign capabilityId directly
              sameCostPrice,
              minCost: sameCostPrice ? minPrice : minCost,
              maxCost: sameCostPrice ? maxPrice : maxCost,
              minPrice,
              maxPrice,
              pickupPrice,
              pickupCost: sameCostPrice ? pickupPrice : pickupCost,
              variableFareTemplate: savedVariableFareTemplate,
            });

          const savedCapabilityCostPrice =
            await this.capabilityCostPriceRepository.save(
              capabilityCostPriceEntity
            );

          // Create DistanceCost
          if (distanceCost && distanceCost.length > 0) {
            for (const dc of distanceCost) {
              const distanceCostEntity = this.distanceCostRepository.create({
                ...dc,
                capabilityCostPrice: savedCapabilityCostPrice,
              });
              await this.distanceCostRepository.save(distanceCostEntity);
            }
          }

          // Create TimeCost
          if (timeCost && timeCost.length > 0) {
            for (const tc of timeCost) {
              const timeCostEntity = this.timeCostRepository.create({
                ...tc,
                capabilityCostPrice: savedCapabilityCostPrice,
              });
              await this.timeCostRepository.save(timeCostEntity);
            }
          }
        }
      }

      return savedVariableFareTemplate;
    } catch (error) {
      this.logger.error(error);
      if (
        error?.detail?.toString().includes("Key (name)=(") &&
        error?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(
          ERROR_MESSAGE.VARIABLE_TEMPLATE_DUPLICATE
        );
      }
    }
  }

  async findAll(
    options: FindAllQueryDto
  ): Promise<{ data: VariableFareTemplate[]; count: number }> {
    const { page, limit, filter, search } = options;

    // Calculate skip and take for pagination
    let skip: number | undefined;
    let take: number | undefined;
    if (page && limit) {
      skip = (page - 1) * limit;
      take = limit;
    }

    // Build where conditions based on filter and search
    let where: any = {};
    const orConditions: any[] = [];

    if (filter) {
      const filterArray = filter.split("&");
      for (const filterItem of filterArray) {
        const [key, val] = filterItem.split(":");
        where[key] = val;
      }
    }

    if (search) {
      orConditions.push(
        { name: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) }
      );
    }

    if (orConditions.length > 0) {
      where = [{ ...where }, ...orConditions];
    }

    // Build query options
    const queryOptions: FindManyOptions<VariableFareTemplate> = {
      select: ["id", "name", "description"], // Select only id, name, and description fields
      where,
      order: {
        createdAt: "DESC", // Default ordering
      },
    };

    if (skip !== undefined && take !== undefined) {
      queryOptions.skip = skip;
      queryOptions.take = take;
    }

    try {
      const [data, count] =
        await this.variableFareTemplateRepository.findAndCount(queryOptions);
      return { data, count };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }
  async findOne(id: string): Promise<VariableFareTemplate> {
    this.logger.info("service=>findById=>Input: %o", id);
    try {
      const res = await this.variableFareTemplateRepository
        .createQueryBuilder("variableFareTemplate")
        .leftJoinAndSelect(
          "variableFareTemplate.capabilityCostPrice",
          "capabilityCostPrice"
        )
        .leftJoinAndSelect("capabilityCostPrice.distanceCost", "distanceCost")
        .leftJoinAndSelect("capabilityCostPrice.timeCost", "timeCost")
        .leftJoinAndSelect("capabilityCostPrice.capability", "capability")
        .where("variableFareTemplate.id = :id", { id })
        .orderBy("distanceCost.from", "ASC") // or "DESC" for descending order
        .addOrderBy("timeCost.fromMinutes", "ASC") // or "DESC" for descending order
        .getOne();

      if (!res) {
        this.logger.error(
          "Service=>findById=>Error: %o",
          ERROR_MESSAGE.NOT_FOUND
        );
        throw new NotFoundException(ERROR_MESSAGE.NOT_FOUND);
      }

      this.logger.info("service=>findById=>Output: %o", res);
      return res;
    } catch (err) {
      this.logger.error("Service=>findById=>Error: %o", err);
      throw new InternalServerErrorException(err);
    }
  }

  // async update(
  //   id: string,
  //   data: UpdateVariableFareTemplateDTO
  // ): Promise<VariableFareTemplate> {
  //   const {
  //     name,
  //     description,
  //     sameCostPrice,
  //     minCost,
  //     maxCost,
  //     minPrice,
  //     maxPrice,
  //     pickupPrice,
  //     pickupCost,
  //     distanceCost,
  //     timeCost,
  //     capability,
  //   } = data;

  //   try {
  //     // Fetch the existing VariableFareTemplate with its relations
  //     const variableFareTemplate =
  //       await this.variableFareTemplateRepository.findOne({
  //         where: { id },
  //         relations: ["distanceCost", "timeCost", "capability"],
  //       });

  //     if (!variableFareTemplate) {
  //       throw new NotFoundException("VariableFareTemplate not found");
  //     }

  //     const updateFields = {
  //       name,
  //       description,
  //       sameCostPrice,
  //       minCost: sameCostPrice ? minPrice : minCost,
  //       maxCost: sameCostPrice ? maxPrice : maxCost,
  //       minPrice,
  //       maxPrice,
  //       pickupPrice,
  //       pickupCost: sameCostPrice ? pickupPrice : pickupCost,
  //     };

  //     for (const key in updateFields) {
  //       if (updateFields[key] !== undefined) {
  //         variableFareTemplate[key] = updateFields[key];
  //       }
  //     }

  //     if (sameCostPrice) {
  //       variableFareTemplate["minCost"] = variableFareTemplate["minPrice"];
  //       variableFareTemplate["maxCost"] = variableFareTemplate["maxPrice"];
  //       variableFareTemplate["pickupCost"] =
  //         variableFareTemplate["pickupPrice"];
  //     }
  //     // Update capabilities
  //     if (capability) {
  //       if (capability.length > 0) {
  //         const capabilities = await this.capabilityRepository.find({
  //           where: { id: In(capability) },
  //         });
  //         variableFareTemplate.capability = capabilities;
  //       } else {
  //         variableFareTemplate.capability = [];
  //       }
  //     }

  //     await this.variableFareTemplateRepository.save(variableFareTemplate);

  //     // Update distance costs
  //     if (distanceCost) {
  //       if (distanceCost.length > 0) {
  //         // Remove existing distance costs that are not in the update data
  //         const distanceCostIds = distanceCost.map((dc) => dc.id);
  //         await this.distanceCostRepository.delete({
  //           variableFareTemplate: { id },
  //           id: Not(In(distanceCostIds)),
  //         });

  //         for (const dc of distanceCost) {
  //           let distanceCostEntity = await this.distanceCostRepository.findOne({
  //             where: { id: dc.id, variableFareTemplate: { id } },
  //           });
  //           if (distanceCostEntity && dc.id) {
  //             Object.assign(distanceCostEntity, dc);
  //           } else {
  //             distanceCostEntity = this.distanceCostRepository.create(dc);
  //             distanceCostEntity.variableFareTemplate = variableFareTemplate;
  //           }
  //           distanceCostEntity.cost = sameCostPrice
  //             ? distanceCostEntity.price
  //             : distanceCostEntity.cost;
  //           await this.distanceCostRepository.save(distanceCostEntity);
  //         }
  //       } else {
  //         await this.distanceCostRepository.delete({
  //           variableFareTemplate: { id },
  //         });
  //       }
  //     }

  //     // Update time costs
  //     if (timeCost) {
  //       if (timeCost.length > 0) {
  //         // Remove existing time costs that are not in the update data
  //         const timeCostIds = timeCost.map((tc) => tc.id);
  //         await this.timeCostRepository.delete({
  //           variableFareTemplate: { id },
  //           id: Not(In(timeCostIds)),
  //         });

  //         for (const tc of timeCost) {
  //           let timeCostEntity = await this.timeCostRepository.findOne({
  //             where: { id: tc.id, variableFareTemplate: { id } },
  //           });
  //           if (timeCostEntity && tc.id) {
  //             Object.assign(timeCostEntity, tc);
  //           } else {
  //             timeCostEntity = this.timeCostRepository.create(tc);
  //             timeCostEntity.variableFareTemplate = variableFareTemplate;
  //           }
  //           timeCostEntity.cost = sameCostPrice
  //             ? timeCostEntity.price
  //             : timeCostEntity.cost;

  //           await this.timeCostRepository.save(timeCostEntity);
  //         }
  //       } else {
  //         await this.timeCostRepository.delete({
  //           variableFareTemplate: { id },
  //         });
  //       }
  //     }

  //     // Refetch the updated VariableFareTemplate with its relations
  //     const updatedVariableFareTemplate =
  //       await this.variableFareTemplateRepository.findOne({
  //         where: { id },
  //         relations: ["distanceCost", "timeCost", "capability"],
  //       });

  //     this.logger.info(
  //       "Service=>updateVariableFareTemplate=>Output: %o",
  //       updatedVariableFareTemplate
  //     );

  //     return updatedVariableFareTemplate;
  //   } catch (error) {
  //     this.logger.error(
  //       "Service=>updateVariableFareTemplate=>Error: %o",
  //       error
  //     );
  //     throw new BadRequestException(error);
  //   }
  // }

  async update(
    id: string,
    data: UpdateVariableFareTemplateDTO
  ): Promise<VariableFareTemplate> {
    const { name, description, capabilityCostPrice } = data;

    try {
      let variableFareTemplate =
        await this.variableFareTemplateRepository.findOne({
          where: { id },
          relations: [
            "capabilityCostPrice",
            "capabilityCostPrice.distanceCost",
            "capabilityCostPrice.timeCost",
          ],
        });

      if (!variableFareTemplate) {
        throw new NotFoundException("VariableFareTemplate not found");
      }

      // Update basic fields
      if (name) variableFareTemplate.name = name;
      if (description) variableFareTemplate.description = description;

      const newCapIds = capabilityCostPrice
        ?.filter((el) => el.id != undefined)
        .map((el) => el?.id);

      const existingCapIds = variableFareTemplate.capabilityCostPrice.map(
        (el) => el.id
      );

      // Find the IDs that are in existingCapIds but not in newCapIds
      const idsNotInNewCapIds = existingCapIds.filter(
        (id) => !newCapIds.includes(id)
      );

      // Update capabilityCostPrice
      if (capabilityCostPrice && capabilityCostPrice.length > 0) {
        for (const cap of capabilityCostPrice) {
          let existingCap = variableFareTemplate.capabilityCostPrice.find(
            (item) => item.id === cap.id
          );

          if (existingCap) {
            // Update existing capabilityCostPrice entity
            // Object.assign(existingCap, cap);

            if (cap?.minCost) existingCap.minCost = cap.minCost;
            if (cap?.minPrice) existingCap.minPrice = cap.minPrice;
            if (cap?.pickupCost) existingCap.pickupCost = cap.pickupCost;
            if (cap?.pickupPrice) existingCap.pickupPrice = cap.pickupPrice;
            if (cap?.maxCost) existingCap.maxCost = cap.maxCost;
            if (cap?.maxPrice) existingCap.maxPrice = cap.maxPrice;
            if (cap?.sameCostPrice != undefined)
              existingCap.sameCostPrice = cap?.sameCostPrice;

            // Update distanceCost if provided
            if (cap.distanceCost && cap.distanceCost.length > 0) {
              //   const deletedDistanceCost =
              //     await this.distanceCostRepository.delete({
              //       capabilityCostPrice: existingCap,
              //     });
              existingCap.distanceCost = [];
              for (const dc of cap.distanceCost) {
                const newDC = await this.distanceCostRepository.create(dc);

                // let existingDC = existingCap.distanceCost.find(
                //   (item) => item.id === dc.id
                // );
                // if (existingDC) {
                //   Object.assign(existingDC, dc);
                // } else {
                newDC.capabilityCostPrice = existingCap;
                existingCap.distanceCost.push(newDC);
                // }
              }
            } else {
              existingCap.distanceCost = [];
            }

            // Update timeCost if provided
            if (cap.timeCost && cap.timeCost.length > 0) {
              //   const deletedTimeCost = await this.distanceCostRepository.delete({
              //     capabilityCostPrice: existingCap,
              //   });
              existingCap.timeCost = [];

              for (const tc of cap.timeCost) {
                const newTC = this.timeCostRepository.create(tc);
                newTC.capabilityCostPrice = existingCap;
                existingCap.timeCost.push(newTC);
                // }
              }
            } else {
              existingCap.timeCost = [];
            }
          } else {
            // Fetch capability entity
            const capability = await this.capabilityRepository.findOne({
              where: { id: cap.capability },
            });

            if (!capability) {
              throw new NotFoundException(
                `Capability with id ${cap.capability} not found`
              );
            }
            // Create new capabilityCostPrice entity if not found
            const newCap = await this.capabilityCostPriceRepository.create({
              ...cap,
              capability,
              // variableFareTemplate,
            });

            const savedCap = await this.capabilityCostPriceRepository.save(
              newCap
            );

            // Create distanceCost entities if provided
            if (cap.distanceCost && cap.distanceCost.length > 0) {
              const newDistanceCosts = cap.distanceCost.map((dc) =>
                this.distanceCostRepository.create({
                  ...dc,
                  capabilityCostPrice: newCap,
                })
              );
              savedCap.distanceCost = newDistanceCosts;
            } else {
              savedCap.distanceCost = [];
            }

            // Create timeCost entities if provided
            if (cap.timeCost && cap.timeCost.length > 0) {
              const newTimeCosts = cap.timeCost.map((tc) =>
                this.timeCostRepository.create({
                  ...tc,
                  capabilityCostPrice: newCap,
                })
              );
              savedCap.timeCost = newTimeCosts;
            } else {
              savedCap.timeCost = [];
            }

            const updatedSavedCap =
              await this.capabilityCostPriceRepository.save(savedCap);

            variableFareTemplate.capabilityCostPrice.push(updatedSavedCap);
          }
        }
      }

      const savedvariableFareTemplate =
        await this.variableFareTemplateRepository.save(variableFareTemplate);

      for (const toBeDeletedCapId of idsNotInNewCapIds) {
        const capPrice = variableFareTemplate.capabilityCostPrice.find(
          (el) => el.id === toBeDeletedCapId
        );

        // Delete related distanceCost records
        if (capPrice.distanceCost) {
          for (const deletedDC of capPrice.distanceCost) {
            await this.distanceCostRepository.delete({
              id: deletedDC.id,
            });
          }
        }

        // Delete related timeCost records
        if (capPrice.timeCost) {
          for (const deletedTC of capPrice.timeCost) {
            await this.timeCostRepository.delete({ id: deletedTC.id });
          }
        }

        // Delete the capabilityCostPrice record
        await this.capabilityCostPriceRepository.delete({
          id: toBeDeletedCapId,
        });
      }
      // Fetch the updated VariableFareTemplate with its relations
      variableFareTemplate = await this.variableFareTemplateRepository.findOne({
        where: { id },
        relations: [
          "capabilityCostPrice",
          "capabilityCostPrice.distanceCost",
          "capabilityCostPrice.timeCost",
        ],
      });

      if (!variableFareTemplate) {
        throw new NotFoundException("Updated VariableFareTemplate not found");
      }

      return variableFareTemplate;
    } catch (error) {
      this.logger.error(error);
      if (
        error?.detail?.toString().includes("Key (name)=(") &&
        error?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(
          ERROR_MESSAGE.VARIABLE_TEMPLATE_DUPLICATE
        );
      }
    }
  }

  async remove(id: string): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();

      // Fetch the VariableFareTemplate with associated entities
      const variableFareTemplate = await queryRunner.manager.findOne(
        VariableFareTemplate,
        {
          where: { id },
          relations: [
            "capabilityCostPrice",
            "capabilityCostPrice.distanceCost",
            "capabilityCostPrice.timeCost",
            "capabilityCostPrice.capability",
          ],
        }
      );

      if (!variableFareTemplate) {
        throw new Error(`VariableFareTemplate with id ${id} not found`);
      }

      // Remove related DistanceCost and TimeCost entities
      if (variableFareTemplate.capabilityCostPrice) {
        for (const ccp of variableFareTemplate.capabilityCostPrice) {
          if (ccp.distanceCost && ccp.distanceCost.length > 0) {
            for (const dc of ccp.distanceCost) {
              await queryRunner.manager.delete(DistanceCost, dc.id);
            }
          }

          if (ccp.timeCost && ccp.timeCost.length > 0) {
            for (const tc of ccp.timeCost) {
              await queryRunner.manager.delete(TimeCost, tc.id);
            }
          }

          // Remove Capability relation using set(null)
          await queryRunner.manager
            .createQueryBuilder()
            .update(CapabilityCostPrice)
            .set({ capability: null })
            .where("id = :id", { id: ccp.id })
            .execute();

          // Remove CapabilityCostPrice entity
          await queryRunner.manager.delete(CapabilityCostPrice, ccp.id);
        }
      }

      // Remove the VariableFareTemplate entity
      const result = await queryRunner.manager.delete(VariableFareTemplate, id);
      if (result.affected === 0) {
        throw new Error(`VariableFareTemplate with id ${id} not found`);
      }

      await queryRunner.commitTransaction();
      return "success";
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new Error(
        `Failed to delete VariableFareTemplate: ${error.message}`
      );
    } finally {
      await queryRunner.release();
    }
  }
}
