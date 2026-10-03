import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, Like, Repository } from "typeorm";
import { CreateVehicleDTO, UpdateVehicleDTO } from "./dto/vehicle.dto";
import { Vehicle } from "./vehicle.entity";
import { VehicleStatus } from "./enums/document.enum";
import { DocumentService } from "src/documents/document.service";
import { Document } from "src/documents/document.entity";
import { Capability } from "src/capability/entity/capability.entity";
import { CapabilityService } from "src/capability/capability.service";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { Liscense } from "src/liscense/entity/liscense.entity";
import { DriverTypeEnum } from "src/driver/enums/driver.enum";
import { DriverGroup } from "src/driverGroups/driverGroup.entity";
import { DriverGroupService } from "src/driverGroups/driverGroup.service";
import { UtilsService } from "src/utils/utils.service";

@Injectable()
export class VehicleService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Capability)
    private readonly capabilityRepository: Repository<Capability>,
    @InjectRepository(Liscense)
    private readonly liscenseRepository: Repository<Liscense>,
    private readonly documentService: DocumentService,
    private readonly capabilityService: CapabilityService,
    private readonly driverGroupService: DriverGroupService,
    private readonly utilsService: UtilsService
  ) {}

  async createVehicle(createVehicleDTO: CreateVehicleDTO): Promise<any> {
    try {
      if (createVehicleDTO?.callSign) {
        const existingVehicle = await this.vehicleRepository
          .createQueryBuilder("vehicle")
          .select()
          .where("vehicle.callSign=:callSign", {
            callSign: createVehicleDTO?.callSign,
          })
          .getOne();
        if (existingVehicle) {
          throw new ConflictException(ERROR_MESSAGE.VEHICLE_CALLSIGN);
        }

        const registration = createVehicleDTO?.registration?.toLowerCase();

        // Query the database
        const existingRegVehicle = await this.vehicleRepository
          .createQueryBuilder("vehicle")
          .select()
          .where("LOWER(vehicle.registration) = :registration", {
            registration,
          })
          .getOne();

        if (existingRegVehicle) {
          throw new ConflictException(
            ERROR_MESSAGE.VEHICLE_REGISTRATION_ALREADY_EXISTS
          );
        }
      }
      const qb = this.vehicleRepository
        .createQueryBuilder("vehicle")
        .select()
        .where("vehicle.callSign=:callSign", {
          callSign: createVehicleDTO.callSign,
        });
      if (createVehicleDTO.driverId) {
        qb.orWhere("vehicle.driverId=:driverId", {
          driverId: createVehicleDTO.driverId,
        });
      }
      if (createVehicleDTO.driverGroupId) {
        qb.orWhere("vehicle.driverGroupId=:driverGroupId", {
          driverGroupId: createVehicleDTO.driverGroupId,
        });
      }
      const existingVehicle = await qb.getOne();
      if (existingVehicle) {
        if (
          existingVehicle.driverId &&
          existingVehicle.driverId === createVehicleDTO.driverId
        ) {
          throw new ConflictException(ERROR_MESSAGE.DRIVER_ALREADY_ASSIGNED);
        }
        if (existingVehicle.callSign === createVehicleDTO.callSign) {
          throw new ConflictException(ERROR_MESSAGE.VEHICLE_CALLSIGN);
        }
      }
      let capabilities;
      let createVehicle = await this.vehicleRepository.create({
        callSign: createVehicleDTO.callSign,
        make: createVehicleDTO.make,
        model: createVehicleDTO.model,
        mdtId: createVehicleDTO.mdtId,
        colour: createVehicleDTO.colour,
        registration: createVehicleDTO.registration,
        passengers: createVehicleDTO.passengers,
        year:
          createVehicleDTO.year !== undefined ? createVehicleDTO.year : null,
        plateNumber:
          createVehicleDTO.plateNumber !== undefined
            ? createVehicleDTO.plateNumber
            : null,
        driverId:
          createVehicleDTO.driverId !== undefined
            ? createVehicleDTO.driverId
            : null,
        driverGroupId:
          createVehicleDTO.driverGroupId !== undefined
            ? createVehicleDTO.driverGroupId
            : null,
        isSuspended:
          createVehicleDTO.isSuspended !== undefined
            ? createVehicleDTO.isSuspended
            : null,
        vehicleCommentOne:
          createVehicleDTO.vehicleCommentOne !== undefined
            ? createVehicleDTO.vehicleCommentOne
            : null,
        vehicleCommentTwo:
          createVehicleDTO.vehicleCommentTwo !== undefined
            ? createVehicleDTO.vehicleCommentTwo
            : null,
        vehicleCommentThree:
          createVehicleDTO.vehicleCommentThree !== undefined
            ? createVehicleDTO.vehicleCommentThree
            : null,
        vehicleCommentFour:
          createVehicleDTO.vehicleCommentFour !== undefined
            ? createVehicleDTO.vehicleCommentFour
            : null,
        vehicleCommentFive:
          createVehicleDTO.vehicleCommentFive !== undefined
            ? createVehicleDTO.vehicleCommentFive
            : null,
        isCardEnable:
          createVehicleDTO.isCardEnable !== undefined
            ? createVehicleDTO.isCardEnable
            : null,
        cardNumber:
          createVehicleDTO.cardNumber !== undefined
            ? createVehicleDTO.cardNumber
            : null,
        machine:
          createVehicleDTO.machine !== undefined
            ? createVehicleDTO.machine
            : null,
        driverLoginMode:
          createVehicleDTO.driverLoginMode !== undefined
            ? createVehicleDTO.driverLoginMode
            : null,
        roadtaxExpires: createVehicleDTO.roadtaxExpires,
        platExpires: createVehicleDTO.platExpires,
        mdtExpires: createVehicleDTO.mdtExpires,
        insuranceExpires: createVehicleDTO.insuranceExpires,
      });
      if (createVehicleDTO?.capabilities?.length > 0) {
        capabilities = await this.capabilityService.findBulkCapabilitiesById(
          createVehicleDTO.capabilities
        );
        createVehicle.capabilities = capabilities;
      }

      // Create a new vehicle entity with the provided data
      // Check if the driverId or driverGroupId is provided in the DTO
      if (createVehicleDTO.driverId) {
        // If driverId is provided, set driverGroupId to null
        createVehicleDTO.driverGroupId = null;
        createVehicle.driverGroupId = null;
      } else if (createVehicleDTO.driverGroupId) {
        // If driverGroupId is provided, set driverId to null
        createVehicleDTO.driverId = null;
        createVehicle.driverId = null;
      }

      //   const vehicle = this.vehicleRepository.create(createVehicleDTO);

      // Save the new vehicle to the database
      let vehicleCreated;
      vehicleCreated = await this.vehicleRepository.save(createVehicle);

      // Check if there are any documents associated with the vehicle DTO
      if (
        createVehicleDTO.VehicleDocuments &&
        createVehicleDTO.VehicleDocuments.length > 0
      ) {
        // Fetch documents using DocumentService
        const documents = await Promise.all(
          createVehicleDTO.VehicleDocuments.map(async (documentId) => {
            return await this.documentService.findDocumentById(documentId);
          })
        );

        // Assign documents to the vehicle
        vehicleCreated.documents = documents;

        // Save the vehicle entity with associated documents
        vehicleCreated = await this.vehicleRepository.save(vehicleCreated);
      }

      return vehicleCreated;
    } catch (error) {
      console.error(error);
      if (
        error?.detail?.toString().includes("Key (registration)=(") &&
        error?.detail?.toString().includes(") already exists.")
      ) {
        throw new Error(ERROR_MESSAGE.VEHICLE_REGISTRATION_ALREADY_EXISTS);
      } else {
        // Log any errors that occur during the creation process
        console.error("Error creating vehicle:", error);
        throw new Error(error?.message || "Failed to create vehicle");
      }
    }
  }

  async updateVehicle(
    id: string,
    updateVehicleDTO: UpdateVehicleDTO
  ): Promise<Vehicle> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (updateVehicleDTO.callSign) {
        const existingVehicle = await this.vehicleRepository
          .createQueryBuilder("vehicle")
          .select()
          .where("vehicle.callSign=:callSign AND vehicle.id != :vehicleId", {
            callSign: updateVehicleDTO.callSign,
            vehicleId: id,
          })
          .getOne();
        if (existingVehicle) {
          throw new ConflictException(ERROR_MESSAGE.VEHICLE_CALLSIGN);
        }

        const registration = updateVehicleDTO?.registration?.toLowerCase();

        const existingRegVehicle = await this.vehicleRepository
          .createQueryBuilder("vehicle")
          .select()
          .where(
            "LOWER(vehicle.registration) = :registration AND vehicle.id != :vehicleId",
            {
              registration,
              vehicleId: id,
            }
          )
          .getOne();

        if (existingRegVehicle) {
          throw new ConflictException(
            ERROR_MESSAGE.VEHICLE_REGISTRATION_ALREADY_EXISTS
          );
        }
      }
      const oldVehicle = await this.vehicleRepository.findOne({
        where: { id },
        relations: ["documents", "capabilities"],
      });

      if (!oldVehicle) {
        throw new Error("Vehicle not found");
      }
      const vehicleDocuments = updateVehicleDTO.VehicleDocuments;
      delete updateVehicleDTO.VehicleDocuments;

      const vehicleCapabilities = updateVehicleDTO.capabilities;
      delete updateVehicleDTO.capabilities;

      let capabilities = [];
      if (vehicleCapabilities && vehicleCapabilities.length > 0) {
        capabilities = await this.capabilityService.findBulkCapabilitiesById(
          vehicleCapabilities
        );
        if (capabilities.includes(null)) {
          throw new BadRequestException("Capability does not exist");
        }
      }

      const partialUpdateObject: Partial<Vehicle> = {};
      for (const key in updateVehicleDTO) {
        if (updateVehicleDTO[key] !== undefined) {
          partialUpdateObject[key] = updateVehicleDTO[key];
        }
      }
      if (Object.entries(partialUpdateObject).length !== 0) {
        await queryRunner.manager.update(Vehicle, { id }, partialUpdateObject);
      }
      if (vehicleDocuments && vehicleDocuments.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Vehicle, "documents")
          .of(oldVehicle)
          .remove(oldVehicle.documents);

        await queryRunner.manager
          .createQueryBuilder()
          .relation(Vehicle, "documents")
          .of(oldVehicle)
          .add(vehicleDocuments);
      }
      if (oldVehicle && oldVehicle.capabilities.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Vehicle, "capabilities")
          .of(oldVehicle)
          .remove(oldVehicle.capabilities);
      }
      if (capabilities) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Vehicle, "capabilities")
          .of(oldVehicle)
          .add(capabilities);
      }
      await queryRunner.commitTransaction();

      const updatedVehicle = await this.vehicleRepository.findOne({
        where: { id },
        relations: ["documents", "capabilities"],
      });

      return updatedVehicle;
    } catch (err) {
      console.error(err);
      await queryRunner.rollbackTransaction();
      if (
        err?.detail?.toString().includes("Key (registration)=(") &&
        err?.detail?.toString().includes(") already exists.")
      ) {
        throw new Error(ERROR_MESSAGE.VEHICLE_REGISTRATION_ALREADY_EXISTS);
      } else {
        // Log any errors that occur during the creation process
        console.error("Error creating vehicle:", err);
        throw new Error(`Failed to update vehicle: ${err.message}`);
      }
    } finally {
      await queryRunner.release();
    }
  }

  async findVehicleByDriverId(driverId: string, role?, checkExpiry?: boolean) {
    let vehicle;
    if (role === DriverTypeEnum.SELF_EMPLOYED) {
      vehicle = await this.vehicleRepository.findOne({
        where: { driver: { id: driverId } },
        relations: ["driver"],
      });
      if (!vehicle) {
        throw new NotFoundException(ERROR_MESSAGE.VEHICLE_NOT_FOUND);
      }
    } else {
      let array = [];
      const driverGroup = await this.driverGroupService.findDriverGroupById(
        driverId,
        driverId
      );
      if (driverGroup) {
        vehicle = await Promise.all(
          driverGroup.map(async (driver) => {
            return await this.vehicleRepository.find({
              where: { driverGroup: { id: driver.id } },
              relations: ["driverGroup"],
            });
          })
        );

        for (let value of vehicle) {
          for (let val of value) {
            if (checkExpiry) {
              let isExpired = false;
              if (val?.insuranceExpires) {
                const date = new Date(val?.insuranceExpires);
                const insuranceExpired =
                  this.utilsService.checkExpireyDate(date);
                if (insuranceExpired) {
                  isExpired = true;
                }
              }
              if (val?.mdtExpires) {
                const date = new Date(val?.mdtExpires);
                const mdtExpired = this.utilsService.checkExpireyDate(date);
                if (mdtExpired) {
                  isExpired = true;
                }
              }
              if (val?.platExpires) {
                const date = new Date(val?.platExpires);
                const plateExpired = this.utilsService.checkExpireyDate(date);
                if (plateExpired) {
                  isExpired = true;
                }
              }
              if (val?.roadtaxExpires) {
                const date = new Date(val?.roadtaxExpires);
                const roadtaxExpired = this.utilsService.checkExpireyDate(date);
                if (roadtaxExpired) {
                  isExpired = true;
                }
              }
              if (!isExpired) {
                array.push(val);
              }
            } else {
              array.push(val);
            }
          }
        }
      }
      return array;
    }
    return vehicle;
  }

  async deleteVehicle(id: string): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();

      // Fetch the vehicle with associated documents

      const liscense = await this.liscenseRepository.findOne({
        where: { vehicle: { id } },
        relations: ["driver", "vehicle", "user"],
      });
      if (liscense) {
        throw new ConflictException(
          ERROR_MESSAGE.VEHICLE_ASSOCIATED_WITH_LISCENSE
        );
      }

      const vehiclesWithDocumentsAndCapabilities =
        await queryRunner.manager.find(Vehicle, {
          where: { id: id },
          relations: ["documents", "capabilities"],
        });
      const capabilities =
        vehiclesWithDocumentsAndCapabilities[0].capabilities.map(
          (capability) => capability.id
        );
      if (
        !vehiclesWithDocumentsAndCapabilities ||
        vehiclesWithDocumentsAndCapabilities.length === 0
      ) {
        throw new Error(`Vehicle with id ${id} not found`);
      }
      // Delete each associated document for each vehicle
      for (const vehicle of vehiclesWithDocumentsAndCapabilities) {
        for (const document of vehicle.documents) {
          await queryRunner.manager.delete(Document, document.id);
        }
      }
      if (
        vehiclesWithDocumentsAndCapabilities[0].capabilities &&
        vehiclesWithDocumentsAndCapabilities[0].capabilities.length > 0
      ) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Vehicle, "capabilities")
          .of(vehiclesWithDocumentsAndCapabilities[0])
          .remove(capabilities);
      }

      // Delete the vehicles
      const result = await queryRunner.manager.delete(Vehicle, id);
      if (result.affected === 0) {
        throw new Error(`Vehicle with id ${id} not found`);
      }

      await queryRunner.commitTransaction();
      return "success";
    } catch (error) {
      console.error(error);
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to delete vehicle: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findVehicleById(id: string): Promise<Vehicle> {
    try {
      const vehicle = await this.vehicleRepository.findOne({
        where: { id },
        relations: ["driver", "driverGroup", "documents", "capabilities"],
      });
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with id ${id} not found`);
      }
      return vehicle;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async listVehicles(options: {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
  }): Promise<{ rows: Vehicle[]; count: number }> {
    const { page, limit, search } = options;
    const skip = limit ? (page - 1) * limit : undefined;
    let where: any = {};
    let sortBy = options.sort;
    const orConditions = [];

    if (search) {
      orConditions.push(
        { callSign: ILike(`%${search}%`) },
        { model: ILike(`%${search}%`) },
        { make: ILike(`%${search}%`) },
        { registration: ILike(`%${search}%`) },
        { mdtId: ILike(`%${search}%`) }
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
      const [vehicles, total] = await this.vehicleRepository.findAndCount({
        skip,
        take: limit,
        where,
        order,
        relations: ["capabilities", "driver", "driverGroup", "documents"],
      });
      return { rows: vehicles, count: total };
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to list vehicles: ${error.message}`);
    }
  }

  async suspendVehicle(id: string, status: VehicleStatus): Promise<Vehicle> {
    try {
      let vehicle = await this.vehicleRepository.findOne({ where: { id } });
      if (!vehicle) {
        throw new Error(`Vehicle with id ${id} not found`);
      }
      vehicle.status = status;
      return await this.vehicleRepository.save(vehicle);
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to suspend vehicle: ${error.message}`);
    }
  }
}
