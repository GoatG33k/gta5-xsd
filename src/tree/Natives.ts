import {EnumData, StructData} from "../types";

export interface Natives {
  structs: Map<string, StructData>;
  enums: Map<string, EnumData>;
}