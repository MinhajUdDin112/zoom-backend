import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Equal, ILike, Repository } from "typeorm";
import { CapabilityTemplate } from "./entity/capabilityTemplate.entity";
import { CapabilityCharges } from "./entity/capabilityCharges.entity";
import {
  CreateCapabilityDTO,
  CapabilityChargeDTO,
  FindAllCapabilityTemplatesQueryDto,
  UpdateCapabilityDTO,
} from "./dto/capabilityCharges.dto";
import { PinoLogger } from "nestjs-pino";
import { DeepPartial } from "typeorm";
import { Capability } from "src/capability/entity/capability.entity";
import { ERROR_MESSAGE } from "src/constants/errorMessage";

@Injectable()
export class CapabilityChargesService {
  constructor(
    @InjectRepository(CapabilityTemplate)
    private readonly capabilityTemplateRepository: Repository<CapabilityTemplate>,
    @InjectRepository(CapabilityTemplate)
    private readonly capabilityRepository: Repository<Capability>,

    @InjectRepository(CapabilityCharges)
    private readonly capabilityChargesRepository: Repository<CapabilityCharges>,
    private readonly logger: PinoLogger
  ) {}

  async createCapability(data: CreateCapabilityDTO) {
    const queryRunner =
      this.capabilityTemplateRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.info("Service=>createCapability=>Input: %o", data);

      // Extract capability data from DTO
      const { capabilityCharges, ...capabilityData } = data;

      // Create Capability Template
      const capabilityTemplate = await this.capabilityTemplateRepository.create(
        {
          ...capabilityData,
          status: "ACTIVE", // Assuming status needs to be set
        }
      );
      const savedCapabilityTemplate = await queryRunner.manager.save(
        CapabilityTemplate,
        capabilityTemplate
      );

      // Create Capability Charges
      const capabilityChargesEntities = capabilityCharges.map((charge) => {
        const chargeEntity: DeepPartial<CapabilityCharges> = {
          ...charge,
          capabilityTemplate: savedCapabilityTemplate,
          capabilities: charge.capabilities.map((capabilityId) => ({
            id: capabilityId,
          })) as Capability[], // Convert capability IDs to Capability objects
        };
        return chargeEntity;
      });

      // Save Capability Charges
      const savedCapabilityCharges = await queryRunner.manager.save(
        CapabilityCharges,
        capabilityChargesEntities
      );

      // Commit transaction
      await queryRunner.commitTransaction();
      this.logger.info(
        "Service=>createCapability=>Output: %o",
        savedCapabilityTemplate
      );
      return savedCapabilityTemplate;
    } catch (err) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>createCapability=>Error: %o", err);
      if (
        err?.detail?.toString().includes("Key (name)=(") &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(
          ERROR_MESSAGE.CAPABILITY_CHARGE_TEMPLATE_DUPLICATE
        );
      } else {
        throw new BadRequestException(err);
      }
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async updateCapabilityTemplate(
    id: string,
    data: Partial<UpdateCapabilityDTO>
  ): Promise<CapabilityTemplate> {
    const queryRunner =
      this.capabilityTemplateRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.info("Service=>updateCapabilityTemplate=>Input: %s", id);

      // Find the capability template to update
      const capabilityTemplate =
        await this.capabilityTemplateRepository.findOne({
          where: { id: id },
          relations: ["capabilityCharges", "capabilityCharges.capabilities"],
        });

      if (!capabilityTemplate) {
        throw new NotFoundException(
          `Capability template with id ${id} not found`
        );
      }

      // Update the capability template fields if provided
      if (data.name) {
        capabilityTemplate.name = data.name;
      }
      if (data.description) {
        capabilityTemplate.description = data.description;
      }

      // Mark the capabilityTemplate entity as dirty
      await this.capabilityTemplateRepository.manager.save(capabilityTemplate);

      // Delete existing capability charges and associated capabilities
      await queryRunner.manager.remove(capabilityTemplate.capabilityCharges);

      // Create new capability charges if provided
      if (data.capabilityCharges) {
        for (const chargeData of data.capabilityCharges) {
          // Ensure chargeData is compatible with DeepPartial<CapabilityCharges>
          const chargeEntity: DeepPartial<CapabilityCharges> = {
            ...chargeData,
            // Transform the array of strings into an array of Capability entities
            capabilities: chargeData.capabilities.map((capabilityId) => ({
              id: capabilityId,
            })) as Capability[],
            capabilityTemplate: capabilityTemplate,
          };
          const capabilityCharge =
            this.capabilityChargesRepository.create(chargeEntity);
          await queryRunner.manager.save(CapabilityCharges, capabilityCharge);
        }
      }

      // Commit transaction
      await queryRunner.commitTransaction();
      this.logger.info(
        "Service=>updateCapabilityTemplate=>Output: %o",
        capabilityTemplate
      );

      return capabilityTemplate;
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error("Service=>updateCapabilityTemplate=>Error: %o", error);
      if (
        error?.detail?.toString().includes("Key (name)=(") &&
        error?.detail?.toString().includes(") already exists.")
      ) {
        throw new BadRequestException(
          ERROR_MESSAGE.CAPABILITY_CHARGE_TEMPLATE_DUPLICATE
        );
      } else {
        throw new BadRequestException(error);
      }
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async findCapabilityTemplateById(
    id: string
  ): Promise<CapabilityTemplate | undefined> {
    try {
      this.logger.info("service=>findCapabilityTemplateById=>Input: %o", id);
      const capabilityCharges = await this.capabilityTemplateRepository.findOne(
        {
          where: { id },
          relations: ["capabilityCharges", "capabilityCharges.capabilities"],
        }
      );
      if (!capabilityCharges) {
        this.logger.error(
          "Service=>findCapabilityTemplateById=>Error: %o",
          ERROR_MESSAGE.NOT_FOUND
        );
        throw new NotFoundException(`Capability with ID ${id} not found.`);
      }
      this.logger.info(
        "service=>findCapabilityTemplateById=>Output: %o",
        capabilityCharges
      );
      return capabilityCharges;
    } catch (error) {
      this.logger.error(
        "Service=>findCapabilityTemplateById=>Error: %o",
        error
      );
      throw new BadRequestException(
        `Failed to find capability: ${error.message}`
      );
    }
  }

  async listCapabilityChargesTemplates(options: {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
  }): Promise<{ rows: CapabilityTemplate[]; count: number }> {
    const { page, limit, search } = options;
    const skip = limit ? (page - 1) * limit : undefined;
    let where: any = {};
    let sortBy = options.sort;
    const orConditions = [];

    if (search) {
      orConditions.push(
        { name: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) }
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
      const [capabilityCharges, total] =
        await this.capabilityTemplateRepository.findAndCount({
          skip,
          take: limit,
          where,
          order,
          relations: {
            capabilityCharges: true,
          },
        });
      this.logger.info(
        "service=>list=>CapabilityChargesTemplatesOutput: %o",
        capabilityCharges
      );
      return { rows: capabilityCharges, count: total };
    } catch (error) {
      this.logger.error(
        "Service=>CapabilityChargesTemplatesOutput=>Error: %o",
        error
      );
      throw new Error(
        `Failed to get capability charges templates: ${error.message}`
      );
    }
  }

  async deleteCapabilityCharges(id: string): Promise<string> {
    const queryRunner =
      this.capabilityTemplateRepository.manager.connection.createQueryRunner();

    try {
      this.logger.info("Service=>deleteCapabilityCharges=>Input: %o", id);
      await queryRunner.startTransaction();

      // Fetch the capability template
      const capabilityTemplate =
        await this.capabilityTemplateRepository.findOne({
          where: { id },
          relations: ["capabilityCharges", "capabilityCharges.capabilities"],
        });

      if (!capabilityTemplate) {
        throw new Error(`Capability template with id ${id} not found`);
      }

      // Delete the associated capabilities
      for (const capabilityCharge of capabilityTemplate.capabilityCharges) {
        for (const capability of capabilityCharge.capabilities) {
          await this.capabilityRepository.delete(capability.id);
        }
      }

      // Delete the associated capability charges
      for (const capabilityCharge of capabilityTemplate.capabilityCharges) {
        await this.capabilityChargesRepository.delete(capabilityCharge.id);
      }

      // Delete the capability template
      const result = await this.capabilityTemplateRepository.delete(id);

      if (result.affected === 0) {
        throw new Error(`Capability template with id ${id} not found`);
      }

      await queryRunner.commitTransaction();
      this.logger.info("Service=>deleteCapabilityCharges=>Ouput: %o", id);
      return `Capability template with id ${id} deleted successfully.`;
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to delete capability template: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
