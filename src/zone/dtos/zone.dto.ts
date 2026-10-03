import { ApiProperty } from "@nestjs/swagger";
import { MultiPolygon, Polygon } from "geojson";

export class CreateZoneDto {
  @ApiProperty({ description: "The name of the zone" })
  name: string;

  @ApiProperty({ description: "The properties of the zone", required: false })
  properties?: object;

  @ApiProperty({
    description: "The geometry of the zone",
    type: "object",
    example: {
      type: "Polygon",
      coordinates: [
        [
          [73.1380067468861, 33.62418102404702],
          [73.1343959644482, 33.62462692494172],
          // ...other coordinates
          [73.1380067468861, 33.62418102404702],
        ],
      ],
    },
  })
  geometry: Polygon;
  // {
  //   type: string;
  //   coordinates: number[][][];
  // };
}
