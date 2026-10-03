import { VariableFareTemplate } from "./entities/variableFareTemplate.entity";
import { ZoneTemplate } from "./entities/zoneTemplate.entity";

export interface getAllVariableFareTemplates {
    data:VariableFareTemplate[],
    count:number
  };
  
  export interface getAllZoneTemplates {
    data:ZoneTemplate[],
    count:number
  };