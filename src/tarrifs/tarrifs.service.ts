import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateTariffDTO,
  ICoordinate,
  RecommendedFareDTO,
  TemplatePriceCostDto,
  UpdateTariffDTO,
} from "./dto/tarrif.dto";
import { Tariff } from "./entities/tarrif.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, DataSource, ILike, In, Repository } from "typeorm";
import { PinoLogger } from "nestjs-pino";
import { ZoneTemplate } from "src/templates/entities/zoneTemplate.entity";
import { VariableFareTemplate } from "src/templates/entities/variableFareTemplate.entity";
import { FindAllQueryDto } from "src/utils/dto/filterBy.dto";
import { getAllTarrifs } from "./types";
import { QueryOptionsDTO } from "src/utils/dto/queryOption.dto";
import { ERROR_MESSAGE } from "src/constants/errorMessage";
import { LocationType, TariffType } from "./enum";
import { CapabilityTemplate } from "src/capabilityCharges/entity/capabilityTemplate.entity";
import axios from "axios";
import { Zone } from "src/zone/zone.entity";
import { ZoneService } from "src/zone/zone.service";
import { DistanceCost } from "src/templates/entities/distanceCost.entity";
import { STATUS } from "src/users/enums/users.enum";
import { AreaGroup } from "src/AreaGroup/areaGroup.entity";
import { decode } from "@mapbox/polyline";
import { DEFAULT_MIN_COST, DEFAULT_MIN_PRICE } from "src/constants";
import { getMinutesIntoHrs } from "./utils";

@Injectable()
export class TarrifsService {
  constructor(
    @InjectRepository(Tariff)
    private readonly tariffRepository: Repository<Tariff>,
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource,
    @InjectRepository(ZoneTemplate)
    private readonly zoneTemplateRepository: Repository<ZoneTemplate>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    private readonly zoneService: ZoneService,
    @InjectRepository(VariableFareTemplate)
    private readonly variableFareRepository: Repository<VariableFareTemplate>,
    @InjectRepository(AreaGroup)
    private readonly areaGroupRepository: Repository<AreaGroup>,
    @InjectRepository(CapabilityTemplate)
    private readonly capabilityTemplateRepository: Repository<CapabilityTemplate> // private readonly GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
  ) {}

  getEnumValue<T>(enumType: T, value: string): T[keyof T] {
    return enumType[value as keyof T];
  }

  calculateCostNumber = (
    distance: number,
    slabs: DistanceCost[],
    pickupCost: number,
    pickupPrice: number
  ) => {
    let totalCost = pickupCost || 0;
    let totalPrice = pickupPrice || 0;
    let remainingDistance = distance;

    for (const slab of slabs) {
      const fromMiles = slab.from || 0;
      const toMiles = slab.to || undefined;
      const cost = slab.cost || 0;
      const price = slab.price || 0;

      let slabDistance;
      if (!toMiles) {
        // For the last slab where toMiles is undefined
        slabDistance = remainingDistance;
      } else {
        slabDistance = Math.min(remainingDistance, toMiles - fromMiles);
      }

      if (remainingDistance > 0) {
        totalCost += slabDistance * cost;
        totalPrice += slabDistance * price;
        remainingDistance -= slabDistance;
      }
    }

    return { totalCost, totalPrice };
  };

  async getTarrifByLocation(
    tarrifList: Tariff[],
    data: RecommendedFareDTO,
    pickupZone: Zone,
    destinationZone: Zone
  ) {
    const precedenceOrder = [
      "FULL_ADDRESS",
      "POST_CODE",
      "ZONE",
      "TOWN",
      "ANY",
    ];

    // Step 3: Find the matching tariff based on pickupValue precedence
    let matchingTariffs = [];
    for (const precedence of precedenceOrder) {
      if (precedence == LocationType.FULL_ADDRESS) {
        const matchingTariff = tarrifList.filter(
          (tariff) =>
            tariff.pickupType === precedence &&
            tariff.pickupValue === data.pickupLocationAddress
        );
        matchingTariffs = matchingTariffs.concat(matchingTariff);
      } else if (
        precedence == LocationType.POST_CODE &&
        data.pickupLocationPostalAddress
      ) {
        const matchingTariff = tarrifList.filter(
          (tariff) =>
            tariff.pickupType === precedence &&
            tariff.pickupValue === data.pickupLocationPostalAddress
        );
        matchingTariffs = matchingTariffs.concat(matchingTariff);
      } else if (precedence == LocationType.ZONE) {
        const matchingTariff = tarrifList.filter(
          (tariff) =>
            tariff.pickupType === precedence &&
            tariff.pickupValue === pickupZone.id
        );
        matchingTariffs = matchingTariffs.concat(matchingTariff);
      } else if (precedence == LocationType.TOWN && data.pickupTown) {
        const matchingTariff = tarrifList.filter(
          (tariff) =>
            tariff.pickupType === precedence &&
            tariff.pickupValue === data.pickupTown
        );
        matchingTariffs = matchingTariffs.concat(matchingTariff);
      } else if (precedence == LocationType.ANY) {
        const matchingTariff = tarrifList.filter(
          (tariff) => tariff.pickupType === precedence
        );

        matchingTariffs = matchingTariffs.concat(matchingTariff);
      }
    }

    let matchingDestinationTariffs = [];
    for (const precedence of precedenceOrder) {
      if (precedence == LocationType.FULL_ADDRESS) {
        const matchingTariff = matchingTariffs.filter(
          (tariff) =>
            tariff.destinationType === precedence &&
            tariff.destinationValue === data.destinationLocationAddress
        );
        matchingDestinationTariffs =
          matchingDestinationTariffs.concat(matchingTariff);
      } else if (
        precedence == LocationType.POST_CODE &&
        data.destinationLocationPostalAddress
      ) {
        const matchingTariff = matchingTariffs.filter(
          (tariff) =>
            tariff.destinationType === precedence &&
            tariff.destinationValue === data.destinationLocationPostalAddress
        );
        matchingDestinationTariffs =
          matchingDestinationTariffs.concat(matchingTariff);
      } else if (precedence == LocationType.ZONE) {
        const matchingTariff = matchingTariffs.filter(
          (tariff) =>
            tariff.destinationType === precedence &&
            tariff.destinationValue === destinationZone.id
        );
        matchingDestinationTariffs =
          matchingDestinationTariffs.concat(matchingTariff);
      } else if (precedence == LocationType.TOWN) {
        const matchingTariff = matchingTariffs.filter(
          (tariff) =>
            tariff.destinationType === precedence &&
            tariff.destinationValue === data.destinationTown
        );
        matchingDestinationTariffs =
          matchingDestinationTariffs.concat(matchingTariff);
      } else if (precedence == LocationType.ANY) {
        const matchingTariff = matchingTariffs.filter(
          (tariff) => tariff.destinationType === precedence
        );

        matchingDestinationTariffs =
          matchingDestinationTariffs.concat(matchingTariff);
      }
    }

    return matchingDestinationTariffs;
  }

  async calculateVariableFareTemplate(
    tarrif: Tariff,
    data: { distance: number; capabilityId?: string }
  ) {
    const distanceInMiles = data.distance / 1609;
    const variableZoneTemplate = await this.variableFareRepository.findOne({
      where: { id: tarrif.variableFareTemplate?.id },
      relations: {
        capabilityCostPrice: {
          distanceCost: true,
        },
      },
    });
    if (
      variableZoneTemplate &&
      Array.isArray(variableZoneTemplate.capabilityCostPrice)
    ) {
      variableZoneTemplate.capabilityCostPrice.forEach(
        (capabilityCostPrice) => {
          if (capabilityCostPrice.distanceCost) {
            capabilityCostPrice.distanceCost.sort((a, b) => a.from - b.from);
          }
        }
      );
    }

    let capabilityRelevantCostPrice;

    if (data.capabilityId) {
      capabilityRelevantCostPrice =
        variableZoneTemplate?.capabilityCostPrice?.find(
          (el) => el.capabilityId == data.capabilityId
        );
    }

    if (!capabilityRelevantCostPrice) {
      capabilityRelevantCostPrice =
        variableZoneTemplate?.capabilityCostPrice?.find(
          (el) => el.capabilityId == null
        );
    }

    const calculatedResult = this.calculateCostNumber(
      distanceInMiles,
      capabilityRelevantCostPrice.distanceCost,
      capabilityRelevantCostPrice.pickupCost,
      capabilityRelevantCostPrice.pickupPrice
    );
    return {
      type: "Variable",
      templateId: variableZoneTemplate?.id,
      price: calculatedResult?.totalPrice,
      cost: calculatedResult?.totalCost,
      minPrice: capabilityRelevantCostPrice?.minPrice,
      minCost: capabilityRelevantCostPrice?.minCost,
    };
  }

  async getRecommendedFare(
    data: RecommendedFareDTO
  ): Promise<TemplatePriceCostDto> {
    try {
      this.logger.info("Service=>getRecommendedFare=>Input: %o", data);

      const pickupZone = await this.zoneService.findZoneContainingPoint({
        type: "Point",
        coordinates: [
          data.pickupCoordinates.longitude,
          data.pickupCoordinates.latitude,
        ],
      });

      const destinationZone = await this.zoneService.findZoneContainingPoint({
        type: "Point",
        coordinates: [
          data.destinationCoordinates.longitude,
          data.destinationCoordinates.latitude,
        ],
      });

      if (!pickupZone || !destinationZone) {
        throw new Error(ERROR_MESSAGE.DONOT_OPERATE_AREA_ERROR);
      }

      const fixedTariffs = await this.tariffRepository.find({
        where: { type: TariffType.FIXED },
        relations: ["zoneTemplate", "capabilityTemplate"],
      });

      const fixedZonesTarrifs = await this.getTarrifByLocation(
        fixedTariffs,
        data,
        pickupZone,
        destinationZone
      );

      let foundZoneTemplate: ZoneTemplate = undefined;
      let foundTarrif: Tariff = undefined;

      for (const tarrif of fixedZonesTarrifs) {
        const zoneTemplate = await this.zoneTemplateRepository
          .createQueryBuilder("zoneTemplate")
          .leftJoinAndSelect("zoneTemplate.zoneCost", "zoneCost")
          .where("zoneTemplate.id = :zoneTemplateId", {
            zoneTemplateId: tarrif?.zoneTemplate?.id,
          })
          .andWhere("zoneCost.from = :pickupValue", {
            pickupValue: pickupZone?.id,
          })
          .andWhere("zoneCost.to = :destinationValue", {
            destinationValue: destinationZone?.id,
          })
          .getOne();

        if (zoneTemplate && zoneTemplate.zoneCost.length > 0) {
          if (zoneTemplate.zoneCost[0]?.price > 0) {
            foundZoneTemplate = zoneTemplate;
            foundTarrif = tarrif;
            break;
          }
        }
      }
      let templatePriceCost = undefined;

      if (foundZoneTemplate) {
        templatePriceCost = {
          type: "Zone",
          tarrifId: foundTarrif.id,
          templateId: foundZoneTemplate.id,
          price: foundZoneTemplate.zoneCost[0]?.price,
          cost: foundZoneTemplate.zoneCost[0]?.cost,
        };
      }

      if (!templatePriceCost) {
        const variableTariffs = await this.tariffRepository.find({
          where: { type: TariffType.VARIABLE },
          relations: ["variableFareTemplate", "capabilityTemplate"],
        });

        const variableZonesTarrifs = await this.getTarrifByLocation(
          variableTariffs,
          data,
          pickupZone,
          destinationZone
        );

        if (variableZonesTarrifs.length > 0) {
          foundTarrif = variableZonesTarrifs[0];
          const tarrifResult = await this.calculateVariableFareTemplate(
            variableZonesTarrifs[0],
            data
          );
          templatePriceCost = { ...tarrifResult, tarrifId: foundTarrif.id };
        } else {
          const variableDefaultTariff = await this.tariffRepository.findOne({
            where: { type: TariffType.VARIABLE, jobType: "default" },
            relations: ["variableFareTemplate", "capabilityTemplate"],
          });
          if (variableDefaultTariff) {
            foundTarrif = variableDefaultTariff;
            const tarrifResult = await this.calculateVariableFareTemplate(
              variableDefaultTariff,
              data
            );
            templatePriceCost = { ...tarrifResult, tarrifId: foundTarrif.id };
          } else {
            throw new Error("Default Tarrif Not Found!");
          }
        }
      }

      // GETTING CAPABILITY CHARGES
      if (foundTarrif.capabilityTemplate) {
        const capabilityTemplate =
          await this.capabilityTemplateRepository.findOne({
            where: { id: foundTarrif?.capabilityTemplate?.id },
            relations: {
              capabilityCharges: true,
            },
          });

        const activeCapabilityCharges =
          capabilityTemplate.capabilityCharges.filter(
            (charge) => charge.status === STATUS.ACTIVE
          );
        const capabilityChargesCost = activeCapabilityCharges.reduce(
          (sum, charge) => sum + charge.cost,
          0
        );
        const capabilityChargesPrice = activeCapabilityCharges.reduce(
          (sum, charge) => sum + charge.price,
          0
        );

        templatePriceCost = {
          ...templatePriceCost,
          capabilityChargesPrice,
          capabilityChargesCost,
          activeCapabilityCharges,
        };
      } else {
        templatePriceCost = {
          ...templatePriceCost,
          capabilityChargesPrice: 0,
          capabilityChargesCost: 0,
          activeCapabilityCharges: [],
        };
      }

      // GETTING CHARGING ZONES CHARGES

      const allActiveChargingZonesPickup = await this.areaGroupRepository
        .createQueryBuilder("areaGroup")
        .leftJoinAndSelect("areaGroup.zones", "zone")
        .where("areaGroup.isEnabled = :isEnabled", { isEnabled: true })
        .andWhere("zone.id = :zoneId", { zoneId: pickupZone.id })
        .getMany();

      const allActiveChargingZonesDestination = await this.areaGroupRepository
        .createQueryBuilder("areaGroup")
        .leftJoinAndSelect("areaGroup.zones", "zone")
        .where("areaGroup.isEnabled = :isEnabled", { isEnabled: true })
        .andWhere("zone.id = :zoneId", { zoneId: destinationZone.id })
        .getMany();

      const allActiveChargingZones = allActiveChargingZonesPickup.concat(
        allActiveChargingZonesDestination
      );

      const chargingZonesChargesPrice = allActiveChargingZones.reduce(
        (sum, charge) => sum + charge.price,
        0
      );

      templatePriceCost = {
        ...templatePriceCost,
        chargingZonesChargesPrice,
      };

      const totalPrice =
        (templatePriceCost.price || 0) +
        (templatePriceCost.capabilityChargesPrice || 0) +
        (templatePriceCost.chargingZonesChargesPrice || 0);
      const totalCost =
        (templatePriceCost.cost || 0) +
        (templatePriceCost.capabilityChargesCost || 0);

      templatePriceCost = {
        ...templatePriceCost,
        minPrice: templatePriceCost?.minPrice || DEFAULT_MIN_PRICE,
        minCost: templatePriceCost?.minCost || DEFAULT_MIN_COST,
        totalCost,
        totalPrice,
        pickupZoneId: pickupZone?.id,
        destinationZoneId: destinationZone?.id,
      };
      this.logger.info(
        "Service=>getRecommendedFare=>Output: %o",
        templatePriceCost
      );
      return templatePriceCost;
    } catch (error) {
      this.logger.error(error);

      this.logger.error("Service=>getRecommendedFare=>Error: %o", error);
      throw new Error(error.message);
    }
  }

  // async create(data: CreateTariffDTO): Promise<Tariff> {
  //   try {
  //     if (
  //       data.pickupType === LocationType.ANY &&
  //       data.destinationType === LocationType.ANY &&
  //       data.jobType === "default"
  //     ) {
  //       const existingTariff = await this.tariffRepository.findOne({
  //         where: {
  //           pickupType: LocationType.ANY,
  //           destinationType: LocationType.ANY,
  //           jobType: "default",
  //         },
  //       });

  //       if (existingTariff) {
  //         throw new BadRequestException("Default tariff can only be once");
  //       }
  //     }
  //     const tariff = new Tariff();
  //     tariff.name = data.name;
  //     tariff.shortName = data.shortName;
  //     tariff.tariffDate = data.tariffDate;
  //     tariff.jobType = data.jobType;
  //     tariff.type = this.getEnumValue(TariffType, data.type);
  //     tariff.pickupType = this.getEnumValue(LocationType, data.pickupType);
  //     tariff.pickupValue = data.pickupValue;
  //     tariff.destinationType = this.getEnumValue(
  //       LocationType,
  //       data.destinationType
  //     );
  //     tariff.destinationValue = data.destinationValue;

  //     if (data.type == TariffType.VARIABLE && data.templateId) {
  //       const variableFareTemplate = await this.variableFareRepository.findOne({
  //         where: { id: data.templateId },
  //       });
  //       if (!variableFareTemplate) {
  //         throw new BadRequestException("Invalid variableFareTemplate ID");
  //       }
  //       tariff.variableFareTemplate = variableFareTemplate;
  //     }

  //     if (data.type == TariffType.FIXED && data.templateId) {
  //       const zoneTemplate = await this.zoneTemplateRepository.findOne({
  //         where: { id: data.templateId },
  //       });
  //       if (!zoneTemplate) {
  //         throw new BadRequestException("Invalid zoneTemplate ID");
  //       }
  //       tariff.zoneTemplate = zoneTemplate;
  //     }

  //     if (data.capabilityTemplate) {
  //       const capabilityTemplate =
  //         await this.capabilityTemplateRepository.findOne({
  //           where: { id: data.capabilityTemplate },
  //         });
  //       if (!capabilityTemplate) {
  //         throw new BadRequestException("Invalid capabilityTemplate ID");
  //       }
  //       tariff.capabilityTemplate = capabilityTemplate;
  //     }

  //     if (tariff.pickupType == LocationType.ZONE) {
  //       const zoneTemplate = await this.zoneRepository.findOne({
  //         where: { id: data.pickupValue },
  //       });
  //       if (!zoneTemplate) {
  //         throw new BadRequestException("Invalid zoneTemplate ID");
  //       }
  //       tariff.pickupZone = zoneTemplate;
  //       tariff.pickupValue = null;
  //     }

  //     if (tariff.destinationType == LocationType.ZONE) {
  //       const zoneTemplate = await this.zoneRepository.findOne({
  //         where: { id: data.destinationValue },
  //       });
  //       if (!zoneTemplate) {
  //         throw new BadRequestException("Invalid zoneTemplate ID");
  //       }
  //       tariff.destinationValue = null;
  //       tariff.destinationZone = zoneTemplate;
  //     }
  //     const savedTariff = await this.tariffRepository.save(tariff);

  //     this.logger.info("Service=>createTariff=>Output: %o", savedTariff);

  //     return savedTariff;
  //   } catch (error) {
  //     if (
  //       (error?.detail?.toString().includes("Key (name)=(") &&
  //         error?.detail?.toString().includes(") already exists.")) ||
  //       (error?.code === "23505" &&
  //         error?.detail?.includes('Key ("shortName")=(') &&
  //         error?.detail?.includes(") already exists."))
  //     ) {
  //       throw new BadRequestException(ERROR_MESSAGE.TARIFF_DUPLICATE);
  //     } else {
  //       throw new InternalServerErrorException(error);
  //     }
  //   }
  // }

  // async findAll(options: FindAllQueryDto): Promise<getAllTarrifs> {
  //   let skip: number | undefined;
  //   let take: number | undefined;

  //   // Check if page and limit are provided
  //   if (options.page && options.limit) {
  //     skip = (options.page - 1) * options.limit;
  //     take = options.limit;
  //   }

  //   const orConditions = [];
  //   let where = {};
  //   const { filter, search } = options;

  //   if (filter) {
  //     const filterArray = filter.split("&");
  //     for (const filterItem of filterArray) {
  //       const [key, val] = filterItem.split(":");
  //       where = { ...where, [key]: val };
  //     }
  //   }

  //   if (search) {
  //     orConditions.push(
  //       { name: ILike(`%${search}%`) },
  //       { shortName: ILike(`%${search}%`) },
  //       { jobType: ILike(`%${search}%`) },
  //       { pickupType: ILike(`%${search}%`) },
  //       { destinationType: ILike(`%${search}%`) }
  //     );
  //   }

  //   if (orConditions.length > 0) {
  //     where = orConditions;
  //   }

  //   let queryOptions: QueryOptionsDTO = {
  //     skip,
  //     take,
  //     where,
  //     order: { createdAt: "DESC" },
  //     relations: [
  //       "pickupZone",
  //       "destinationZone",
  //       "variableFareTemplate",
  //       "capabilityTemplate",
  //       "zoneTemplate",
  //     ],
  //   };

  //   try {
  //     const queryBuilder = this.tariffRepository.createQueryBuilder("tariff");

  //     // Apply relations
  //     if (queryOptions.relations) {
  //       queryOptions.relations.forEach((relation) => {
  //         queryBuilder.leftJoinAndSelect(`tariff.${relation}`, relation);
  //       });
  //     }

  //     // Apply filters
  //     if (queryOptions.where) {
  //       if (Array.isArray(queryOptions.where)) {
  //         queryOptions.where.forEach((condition) => {
  //           queryBuilder.orWhere(condition);
  //         });
  //       } else {
  //         Object.keys(queryOptions.where).forEach((key) => {
  //           queryBuilder.andWhere(`tariff.${key} = :${key}`, {
  //             [key]: queryOptions.where[key],
  //           });
  //         });
  //       }
  //     }

  //     // Apply pagination
  //     if (queryOptions.skip !== undefined) {
  //       queryBuilder.skip(queryOptions.skip);
  //     }
  //     if (queryOptions.take !== undefined) {
  //       queryBuilder.take(queryOptions.take);
  //     }

  //     // Apply ordering
  //     if (queryOptions.order) {
  //       Object.keys(queryOptions.order).forEach((key) => {
  //         queryBuilder.addOrderBy(`tariff.${key}`, queryOptions.order[key]);
  //       });
  //     }

  //     const [tariffs, count] = await queryBuilder.getManyAndCount();
  //     const response = {
  //       data: tariffs,
  //       count,
  //     };

  //     this.logger.info("service=>list=>Output: %o", response);
  //     return response;
  //   } catch (err) {
  //     this.logger.error("Service=>findAll=>Error: %o", err);
  //     throw new BadRequestException(err);
  //   }
  // }

  async create(data: CreateTariffDTO): Promise<Tariff> {
    try {
      if (
        data.pickupType === LocationType.ANY &&
        data.destinationType === LocationType.ANY &&
        data.jobType === "default"
      ) {
        const existingTariff = await this.tariffRepository.findOne({
          where: {
            pickupType: LocationType.ANY,
            destinationType: LocationType.ANY,
            jobType: "default",
            type: In([TariffType.FIXED, TariffType.VARIABLE]),
          },
        });

        if (existingTariff) {
          throw new BadRequestException(
            "A default tariff can only be set once. Please ensure you do not duplicate the default tariff."
          );
        }
      }

      const tariff = new Tariff();

      tariff.name = data.name;
      tariff.shortName = data.shortName;
      tariff.tariffDate = data.tariffDate;
      tariff.jobType = data.jobType;
      tariff.type = this.getEnumValue(TariffType, data.type);
      tariff.pickupType = this.getEnumValue(LocationType, data.pickupType);
      tariff.pickupValue = data.pickupValue;
      tariff.destinationType = this.getEnumValue(
        LocationType,
        data.destinationType
      );
      tariff.destinationValue = data.destinationValue;
      tariff.pickupLatitude = data.pickupLatitude || undefined;
      tariff.pickupLongitude = data.pickupLongitude || undefined;
      tariff.destinationLatitude = data.destinationLatitude || undefined;
      tariff.destinationLongitude = data.destinationLongitude || undefined;
      if (data.type == TariffType.VARIABLE && data.templateId) {
        const variableFareTemplate = await this.variableFareRepository.findOne({
          where: { id: data.templateId },
        });
        if (!variableFareTemplate) {
          throw new BadRequestException("Invalid variableFareTemplate ID");
        }
        tariff.variableFareTemplate = variableFareTemplate;
      }

      if (data.type == TariffType.FIXED && data.templateId) {
        const zoneTemplate = await this.zoneTemplateRepository.findOne({
          where: { id: data.templateId },
        });
        if (!zoneTemplate) {
          throw new BadRequestException("Invalid zoneTemplate ID");
        }
        tariff.zoneTemplate = zoneTemplate;
      }

      if (data.capabilityTemplate) {
        const capabilityTemplate =
          await this.capabilityTemplateRepository.findOne({
            where: { id: data.capabilityTemplate },
          });
        if (!capabilityTemplate) {
          throw new BadRequestException("Invalid capabilityTemplate ID");
        }
        tariff.capabilityTemplate = capabilityTemplate;
      }

      // Assign pickupZone if pickupType is ZONE
      if (tariff.pickupType === LocationType.ZONE) {
        const pickupZone = await this.zoneRepository.findOne({
          where: { id: data.pickupValue },
        });
        if (!pickupZone) {
          throw new BadRequestException("Invalid pickupZone ID");
        }
        tariff.pickupValue = pickupZone?.id; // or any property you want to store
      }

      // Assign destinationZone if destinationType is ZONE
      if (tariff.destinationType === LocationType.ZONE) {
        const destinationZone = await this.zoneRepository.findOne({
          where: { id: data.destinationValue },
        });
        if (!destinationZone) {
          throw new BadRequestException("Invalid destinationZone ID");
        }
        tariff.destinationValue = destinationZone?.id; // or any property you want to store
      }

      const savedTariff = await this.tariffRepository.save(tariff);

      this.logger.info("Service=>createTariff=>Output: %o", savedTariff);

      return savedTariff;
    } catch (error) {
      this.logger.error(error);
      if (
        (error?.detail?.toString().includes("Key (name)=(") &&
          error?.detail?.toString().includes(") already exists.")) ||
        (error?.code === "23505" &&
          error?.detail?.includes('Key ("shortName")=(') &&
          error?.detail?.includes(") already exists."))
      ) {
        throw new BadRequestException(ERROR_MESSAGE.TARIFF_DUPLICATE);
      } else {
        throw new InternalServerErrorException(error);
      }
    }
  }

  async findAll(options: FindAllQueryDto): Promise<getAllTarrifs> {
    let skip: number | undefined;
    let take: number | undefined;

    // Pagination
    if (options.page && options.limit) {
      skip = (options.page - 1) * options.limit;
      take = options.limit;
    }

    // Filters
    const orConditions = [];
    let andConditions = {};
    const { filter, search } = options;

    if (filter) {
      const filterArray = filter.split("&");
      for (const filterItem of filterArray) {
        const [key, val] = filterItem.split(":");
        andConditions = { ...andConditions, [key]: val };
      }
    }

    // Search
    if (search) {
      orConditions.push(
        { name: ILike(`%${search}%`) },
        { shortName: ILike(`%${search}%`) },
        { jobType: ILike(`%${search}%`) },
        { pickupType: ILike(`%${search}%`) },
        { destinationType: ILike(`%${search}%`) }
      );
    }

    try {
      const queryBuilder = this.tariffRepository.createQueryBuilder("tariff");

      // Apply relations
      const relations = [
        // "pickupZone",
        // "destinationZone",
        "variableFareTemplate",
        "capabilityTemplate",
        "zoneTemplate",
      ];
      relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`tariff.${relation}`, relation);
      });

      // Apply filters (AND conditions)
      Object.keys(andConditions).forEach((key) => {
        queryBuilder.andWhere(`tariff.${key} = :${key}`, {
          [key]: andConditions[key],
        });
      });

      // Apply search (OR conditions)
      if (orConditions.length > 0) {
        queryBuilder.andWhere(
          new Brackets((qb) => {
            orConditions.forEach((condition) => {
              qb.orWhere(condition);
            });
          })
        );
      }

      // Apply pagination
      if (skip !== undefined) {
        queryBuilder.skip(skip);
      }
      if (take !== undefined) {
        queryBuilder.take(take);
      }

      // Apply ordering
      const order = { createdAt: "DESC" };
      Object.keys(order).forEach((key) => {
        queryBuilder.addOrderBy(`tariff.${key}`, order[key]);
      });

      const [tariffs, count] = await queryBuilder.getManyAndCount();
      const response = {
        data: tariffs,
        count,
      };

      this.logger.info("service=>list=>Output: %o", response);
      return response;
    } catch (err) {
      this.logger.error("Service=>findAll=>Error: %o", err);
      throw new BadRequestException(err);
    }
  }

  // async findOne(id: string): Promise<Tariff> {
  //   this.logger.info("service=>findById=>Input: %o", id);
  //   try {
  //     const res = await this.tariffRepository
  //       .createQueryBuilder("tariff")
  //       .leftJoinAndSelect(
  //         "tariff.variableFareTemplate",
  //         "variableFareTemplate"
  //       )
  //       .leftJoinAndSelect("tariff.pickupZone", "pickupZone")
  //       .leftJoinAndSelect("tariff.destinationZone", "destinationZone")
  //       .leftJoinAndSelect("tariff.capabilityTemplate", "capabilityTemplate")
  //       .leftJoinAndSelect("tariff.zoneTemplate", "zoneTemplate")
  //       .where("tariff.id = :id", { id: id }) // Corrected the parameter name
  //       .orderBy("tariff.createdAt", "ASC")
  //       .getOne();
  //     if (!res) {
  //       this.logger.error(
  //         "Service=>findById=>Error: %o",
  //         ERROR_MESSAGE.NOT_FOUND
  //       );
  //       throw new NotFoundException(ERROR_MESSAGE.NOT_FOUND);
  //     }
  //     this.logger.info("service=>findById=>Output: %o", res);
  //     return res;
  //   } catch (err) {
  //     this.logger.error("Service=>findById=>Error: %o", err);
  //     throw new InternalServerErrorException(err);
  //   }
  // }

  async findOne(id: string): Promise<Tariff> {
    try {
      const res = await this.tariffRepository
        .createQueryBuilder("tariff")
        .leftJoinAndSelect(
          "tariff.variableFareTemplate",
          "variableFareTemplate"
        )
        .leftJoinAndSelect("tariff.capabilityTemplate", "capabilityTemplate")
        .leftJoinAndSelect("tariff.zoneTemplate", "zoneTemplate")
        .where("tariff.id = :id", { id })
        .orderBy("tariff.createdAt", "ASC")
        .getOne();

      if (!res) {
        throw new NotFoundException("Tariff not found");
      }

      if (res.pickupType === LocationType.ZONE) {
        const pickupZone = await this.zoneRepository.findOne({
          where: { id: res.pickupValue },
        });
        if (!pickupZone) {
          throw new NotFoundException(
            `Pickup zone with ID ${res.pickupValue} not found`
          );
        }
        res.pickupZone = pickupZone;
      } else {
        // If pickupType is not ZONE, return the pickupValue as is
        res.pickupZone = null;
      }

      if (res.destinationType === LocationType.ZONE) {
        const destinationZone = await this.zoneRepository.findOne({
          where: { id: res.destinationValue },
        });
        if (!destinationZone) {
          throw new NotFoundException(
            `Destination zone with ID ${res.destinationValue} not found`
          );
        }
        res.destinationZone = destinationZone;
      } else {
        res.destinationZone = null;
      }

      return res;
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException(err.message || err);
    }
  }
  async remove(id: string): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      // Fetch the vehicle with associated documents
      const tarrif = await queryRunner.manager.findOne(Tariff, {
        where: { id: id },
      });

      if (!tarrif) {
        throw new Error(`Tarrif with id ${id} not found`);
      }
      // Delete the Tarrif
      const result = await queryRunner.manager.delete(Tariff, id);
      if (result.affected === 0) {
        throw new Error(`Tariff with id ${id} not found`);
      }
      await queryRunner.commitTransaction();
      return "success";
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to delete Tariff: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // async update(id: string, data: UpdateTariffDTO): Promise<Tariff> {
  //   try {
  //     if (
  //       data.pickupType === LocationType.ANY &&
  //       data.destinationType === LocationType.ANY &&
  //       data.jobType === "default"
  //     ) {
  //       const existingTariff = await this.tariffRepository.findOne({
  //         where: {
  //           pickupType: LocationType.ANY,
  //           destinationType: LocationType.ANY,
  //           jobType: "default",
  //         },
  //       });

  //       if (existingTariff) {
  //         throw new BadRequestException("Default tariff can only be once");
  //       }
  //     }
  //     // Fetch the existing tariff
  //     const tariff = await this.tariffRepository.findOne({
  //       where: { id },
  //     });

  //     if (!tariff) {
  //       throw new BadRequestException(`Tariff with id ${id} not found`);
  //     }

  //     // Update tariff properties
  //     tariff.name = data.name !== undefined ? data.name : tariff.name;
  //     tariff.tariffDate =
  //       data.tariffDate !== undefined ? data.tariffDate : tariff.tariffDate;
  //     tariff.shortName =
  //       data.shortName !== undefined ? data.shortName : tariff.shortName;
  //     tariff.jobType =
  //       data.jobType !== undefined ? data.jobType : tariff.jobType;
  //     tariff.pickupType =
  //       data.pickupType !== undefined
  //         ? this.getEnumValue(LocationType, data.pickupType)
  //         : tariff.pickupType;
  //     tariff.pickupValue =
  //       data.pickupValue !== undefined ? data.pickupValue : tariff.pickupValue;
  //     tariff.destinationType =
  //       data.destinationType !== undefined
  //         ? this.getEnumValue(LocationType, data.destinationType)
  //         : tariff.destinationType;
  //     tariff.destinationValue =
  //       data.destinationValue !== undefined
  //         ? data.destinationValue
  //         : tariff.destinationValue;
  //     tariff.type =
  //       data.type !== undefined
  //         ? this.getEnumValue(TariffType, data.type)
  //         : tariff.type;

  //     // Update variableFareTemplate if provided
  //     if (data.type == TariffType.VARIABLE && data.templateId !== undefined) {
  //       const variableFareTemplate = await this.variableFareRepository.findOne({
  //         where: { id: data.templateId },
  //       });
  //       if (!variableFareTemplate) {
  //         throw new BadRequestException("Invalid variableFareTemplate ID");
  //       }
  //       tariff.variableFareTemplate = variableFareTemplate;
  //     }

  //     if (data.type == TariffType.FIXED && data.templateId !== undefined) {
  //       const zoneTemplate = await this.zoneTemplateRepository.findOne({
  //         where: { id: data.templateId },
  //       });
  //       if (!zoneTemplate) {
  //         throw new BadRequestException("Invalid zoneTemplate ID");
  //       }
  //       tariff.zoneTemplate = zoneTemplate;
  //     }

  //     if (data.capabilityTemplate !== undefined) {
  //       const capabilityTemplate =
  //         await this.capabilityTemplateRepository.findOne({
  //           where: { id: data.capabilityTemplate },
  //         });
  //       if (!capabilityTemplate) {
  //         throw new BadRequestException("Invalid capabilityTemplate ID");
  //       }
  //       tariff.capabilityTemplate = capabilityTemplate;
  //     }

  //     if (
  //       tariff.pickupType == LocationType.ZONE &&
  //       data.pickupValue !== undefined
  //     ) {
  //       const zoneTemplate = await this.zoneTemplateRepository.findOne({
  //         where: { id: data.pickupValue },
  //       });
  //       if (!zoneTemplate) {
  //         throw new BadRequestException("Invalid zoneTemplate ID");
  //       }
  //       tariff.pickupZone = zoneTemplate;
  //       tariff.pickupValue = null;
  //       // zoneTemplates.push(zoneTemplate)
  //     }

  //     if (
  //       tariff.destinationType == LocationType.ZONE &&
  //       data.destinationValue !== undefined
  //     ) {
  //       const zoneTemplate = await this.zoneTemplateRepository.findOne({
  //         where: { id: data.destinationValue },
  //       });
  //       if (!zoneTemplate) {
  //         throw new BadRequestException("Invalid zoneTemplate ID");
  //       }

  //       tariff.destinationZone = zoneTemplate;
  //       tariff.destinationValue = null;
  //     }

  //     // Save the updated tariff
  //     const updatedTariff = await this.tariffRepository.save(tariff);

  //     this.logger.info("Service=>updateTariff=>Output: %o", updatedTariff);

  //     return updatedTariff;
  //   } catch (error) {
  //     if (
  //       (error?.detail?.toString().includes("Key (name)=(") &&
  //         error?.detail?.toString().includes(") already exists.")) ||
  //       (error?.code === "23505" &&
  //         error?.detail?.includes('Key ("shortName")=(') &&
  //         error?.detail?.includes(") already exists."))
  //     ) {
  //       throw new BadRequestException(ERROR_MESSAGE.TARIFF_DUPLICATE);
  //     } else {
  //       throw new InternalServerErrorException(error);
  //     }
  //   }
  // }

  //sheharyar work

  async update(id: string, data: UpdateTariffDTO): Promise<Tariff> {
    try {
      if (
        data.pickupType === LocationType.ANY &&
        data.destinationType === LocationType.ANY &&
        data.jobType === "default"
      ) {
        const existingDefaultTariff = await this.tariffRepository.findOne({
          where: {
            pickupType: LocationType.ANY,
            destinationType: LocationType.ANY,
            jobType: "default",
            type: In([TariffType.VARIABLE, TariffType.FIXED]), // Assuming TariffType.VARIABLE and TariffType.FIXED are your enum values
          },
        });

        if (existingDefaultTariff && existingDefaultTariff.id !== id) {
          throw new BadRequestException(
            "A default tariff can only be set once. Please ensure you do not duplicate the default tariff."
          );
        }
      }

      // Fetch the existing tariff
      const tariff = await this.tariffRepository.findOne({
        where: { id },
      });

      if (!tariff) {
        throw new BadRequestException(`Tariff with id ${id} not found`);
      }

      // Update tariff properties
      tariff.name = data.name !== undefined ? data.name : tariff.name;
      tariff.tariffDate =
        data.tariffDate !== undefined ? data.tariffDate : tariff.tariffDate;
      tariff.shortName =
        data.shortName !== undefined ? data.shortName : tariff.shortName;
      tariff.jobType =
        data.jobType !== undefined ? data.jobType : tariff.jobType;
      tariff.pickupType =
        data.pickupType !== undefined
          ? this.getEnumValue(LocationType, data.pickupType)
          : tariff.pickupType;
      tariff.pickupValue =
        data.pickupValue !== undefined ? data.pickupValue : tariff.pickupValue;
      tariff.destinationType =
        data.destinationType !== undefined
          ? this.getEnumValue(LocationType, data.destinationType)
          : tariff.destinationType;
      tariff.destinationValue =
        data.destinationValue !== undefined
          ? data.destinationValue
          : tariff.destinationValue;
      tariff.type =
        data.type !== undefined
          ? this.getEnumValue(TariffType, data.type)
          : tariff.type;
      tariff.pickupLatitude = data.pickupLatitude || undefined;
      tariff.pickupLongitude = data.pickupLongitude || undefined;
      tariff.destinationLatitude = data.destinationLatitude || undefined;
      tariff.destinationLongitude = data.destinationLongitude || undefined;

      // Update variableFareTemplate if provided
      if (data.type == TariffType.VARIABLE && data.templateId !== undefined) {
        const variableFareTemplate = await this.variableFareRepository.findOne({
          where: { id: data.templateId },
        });
        if (!variableFareTemplate) {
          throw new BadRequestException("Invalid variableFareTemplate ID");
        }
        tariff.variableFareTemplate = variableFareTemplate;
      }

      if (data.type == TariffType.FIXED && data.templateId !== undefined) {
        const zoneTemplate = await this.zoneTemplateRepository.findOne({
          where: { id: data.templateId },
        });
        if (!zoneTemplate) {
          throw new BadRequestException("Invalid zoneTemplate ID");
        }
        tariff.zoneTemplate = zoneTemplate;
      }

      if (data.capabilityTemplate !== undefined) {
        const capabilityTemplate =
          await this.capabilityTemplateRepository.findOne({
            where: { id: data.capabilityTemplate },
          });
        if (!capabilityTemplate) {
          throw new BadRequestException("Invalid capabilityTemplate ID");
        }
        tariff.capabilityTemplate = capabilityTemplate;
      }

      // Handle pickupType as ZONE
      if (
        tariff.pickupType === LocationType.ZONE &&
        data.pickupValue !== undefined
      ) {
        const pickupZone = await this.zoneRepository.findOne({
          where: { id: data.pickupValue },
        });
        if (!pickupZone) {
          throw new BadRequestException("Invalid pickupZone ID");
        }
        tariff.pickupValue = pickupZone.id; // or any property you want to store
      }

      // Handle destinationType as ZONE
      if (
        tariff.destinationType === LocationType.ZONE &&
        data.destinationValue !== undefined
      ) {
        const destinationZone = await this.zoneRepository.findOne({
          where: { id: data.destinationValue },
        });
        if (!destinationZone) {
          throw new BadRequestException("Invalid destinationZone ID");
        }
        tariff.destinationValue = destinationZone.id; // or any property you want to store
      }

      // Save the updated tariff
      const updatedTariff = await this.tariffRepository.save(tariff);

      this.logger.info("Service=>updateTariff=>Output: %o", updatedTariff);

      return updatedTariff;
    } catch (error) {
      this.logger.error(error);
      if (
        (error?.detail?.toString().includes("Key (name)=(") &&
          error?.detail?.toString().includes(") already exists.")) ||
        (error?.code === "23505" &&
          error?.detail?.includes('Key ("shortName")=(') &&
          error?.detail?.includes(") already exists."))
      ) {
        throw new BadRequestException(ERROR_MESSAGE.TARIFF_DUPLICATE);
      } else {
        throw new InternalServerErrorException(error);
      }
    }
  }

  async getDistanceAndTime(origin: string, destination: string) {
    // OSRM requires 'longitude,latitude'
    const [originLat, originLng] = origin.split(','); 
    const [destinationLat, destinationLng] = destination.split(',');

    const url = `http://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destinationLng},${destinationLat}?overview=false&geometries=geojson`

    try {
      const response = await axios.get(url);
      const data = response.data;
      if (data.code !== "Ok" || data.routes.length === 0) {
        throw new HttpException(
          "Error with the OSRM API response",
          HttpStatus.BAD_REQUEST
        );
      }

      const route = data.routes[0];
      const distance = route.distance;
      const duration = route.duration;
  
      return {
        routeDistance: { text: `${(distance / 1000).toFixed(2)} km`, value: distance },
        routeDuration: { text: getMinutesIntoHrs(Math.round(duration / 60)), value: duration },
      };
      
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getDistanceAndTimeBetweenPoints(points: string[]) {
    if (points.length < 2) {
      return {
        routeDistance: {
          text: `0 km`,
          value: 0,
        },
        routeDuration: {
          text: `0 hr`,
          value: 0,
        },
      };
    }

    const formattedPoints = points.map(point => {
      const [lat, lng] = point.split(',');
      return `${lng},${lat}`; // OSRM requires 'longitude,latitude'
    }).join(';');
    
    const url = `http://router.project-osrm.org/route/v1/driving/${formattedPoints}?overview=false&geometries=geojson`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.code !== "Ok" || data.routes.length === 0) {
        throw new HttpException(
          "Error with the OSRM API response",
          HttpStatus.BAD_REQUEST
        );
      }

      const route = data.routes[0];
      const totalDistance = route.distance; // in meters
      const totalDuration = route.duration; // in seconds

      // Convert distance to kilometers and duration to minutes for readability
      const totalDistanceKm = totalDistance / 1000;
      const totalDurationMins = totalDuration / 60;

      const timeInHrs = getMinutesIntoHrs(Math.round(totalDurationMins));

      return {
        routeDistance: {
          text: `${totalDistanceKm.toFixed(2)} km`,
          value: totalDistance,
        },
        routeDuration: {
          text: `${timeInHrs}`,
          value: totalDuration,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getDirections(startLoc: string, destinationLoc: string) {
    try {
      // OSRM requires 'longitude,latitude'
      const [originLat, originLng] = startLoc.split(','); 
      const [destinationLat, destinationLng] = destinationLoc.split(',');

      const OSRM_API_URL = `http://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destinationLng},${destinationLat}?overview=full&geometries=polyline`;

      const resp = await axios.get(OSRM_API_URL)
      const respJson = await resp.data;

      const points = decode(respJson.routes[0].geometry);

      const coords = points.map((point) => {
        return [point[0], point[1]];
      });
      return coords || [];
    } catch (error) {
      this.logger.error(error);
      return error;
    }
  }
}
