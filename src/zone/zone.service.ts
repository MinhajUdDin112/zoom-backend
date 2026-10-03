import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Zone } from "./zone.entity";
import { Point } from "geojson";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class ZoneService {
  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
    private readonly logger: PinoLogger
  ) {}

  async saveZone(zoneData: Partial<Zone>): Promise<Zone> {
    this.logger.info("Service=>saveZone=>Input: %o", zoneData);
    const zone = this.zoneRepository.create(zoneData);
    this.logger.info("Service=>saveZone=>Output: %o", zone);
    return this.zoneRepository.save(zone);
  }

  async findZoneContainingPoint(point: Point): Promise<Zone | null> {
    this.logger.info("Service=>findZoneContainingPoint=>Input: %o", point);
    const zone = await this.zoneRepository
      .createQueryBuilder("zone")
      .where(
        "ST_Contains(zone.geometry, ST_SetSRID(ST_GeomFromGeoJSON(:point), 4326))",
        { point: JSON.stringify(point) }
      )
      .getOne();
    this.logger.info("Service=>findZoneContainingPoint=>Output: %o", zone);
    return zone;
  }

  async findAll(): Promise<Zone[]> {
    this.logger.info("Service=>findAll=>Input: %o");
    const result = await this.zoneRepository.find({
      order: {
        name: "ASC",
      },
    });
    this.logger.info("Service=>findAll=>Output: %o", result?.length);
    return result;
  }
  async findAllWithPagination(skip, take) {
    this.logger.info("Service=>findAll=>Input: %o");
    const result = await this.zoneRepository.findAndCount({
      skip,
      take,
      order: {
        name: "ASC",
      },
    });
    this.logger.info("Service=>findAll=>Output: %o", result?.length);
    return result;
  }
  async findOne(id: string) {
    try {
      const zone = await this.zoneRepository.findOne({ where: { id } });
      if (!zone) {
        throw new NotFoundException();
      }
      return zone;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async findNearestZones(data: {
    lat: number;
    lng: number;
    limit: number;
    offset: number;
  }) {
    const point = `POINT(${data?.lng} ${data?.lat})`; // Note: lng comes first in PostGIS

    const count = await this.zoneRepository.count();

    const rows = await this.zoneRepository
      .createQueryBuilder("zone")
      .select(["zone.id", "zone.name"])
      .addSelect(
        `ST_DistanceSphere(
        ST_Centroid(zone.geometry),
        ST_SetSRID(ST_GeomFromText(:point), 4326)
      )`,
        "distance"
      )
      .setParameter("point", point)
      .orderBy("distance", "ASC")
      .limit(data?.limit)
      .offset(data?.offset)
      .getRawMany();

    return { rows, count };
  }
}
