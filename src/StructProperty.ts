import {NativeTypeEnum, StructPropertyData} from "./types";
import {Logger} from "tslog";

class StructProperty implements StructPropertyData {
  public readonly type: NativeTypeEnum;
  public readonly typeRaw: string;
  public readonly name: string;
  public readonly comment: string;

  constructor(data: StructPropertyData) {
    this.type = data.type
    this.typeRaw = data.typeRaw;
    this.name = data.name
    this.comment = data.comment
  }

  static getTypeAsEnum(type: string): NativeTypeEnum {
    if (type.startsWith('enum')) {
      return NativeTypeEnum.ENUM;
    } else if (type.startsWith('struct')) {
      return NativeTypeEnum.STRUCT;
    } else if (type.startsWith('array')) {
      return NativeTypeEnum.ARRAY;
    } else if (type.startsWith('bitset')) {
      return NativeTypeEnum.BITSET;
    } else if (type.startsWith('map')) {
      return NativeTypeEnum.MAP;
    }

    switch (type) {
      case NativeTypeEnum.VEC2:
        return NativeTypeEnum.VEC2;
      case NativeTypeEnum.VEC3:
        return NativeTypeEnum.VEC3;
      case NativeTypeEnum.VEC3V:
        return NativeTypeEnum.VEC3V;
      case NativeTypeEnum.VEC4:
        return NativeTypeEnum.VEC4;
      case NativeTypeEnum.VEC4V:
        return NativeTypeEnum.VEC4V;
      case NativeTypeEnum.MATRIX34:
        return NativeTypeEnum.MATRIX34;
      case NativeTypeEnum.MATRIX34V:
        return NativeTypeEnum.MATRIX34V;

      case NativeTypeEnum.BOOL:
        return NativeTypeEnum.BOOL;
      case NativeTypeEnum.STRING:
        return NativeTypeEnum.STRING;
      case NativeTypeEnum.FLOAT:
        return NativeTypeEnum.FLOAT;
      case NativeTypeEnum.FLOAT16:
        return NativeTypeEnum.FLOAT16;

      case NativeTypeEnum.UCHAR:
        return NativeTypeEnum.UCHAR;
      case NativeTypeEnum.CHAR:
        return NativeTypeEnum.CHAR;
      case NativeTypeEnum.UINT:
        return NativeTypeEnum.UINT;
      case NativeTypeEnum.UINT64:
        return NativeTypeEnum.UINT64;
      case NativeTypeEnum.INT:
        return NativeTypeEnum.INT;
      case NativeTypeEnum.INT64:
        return NativeTypeEnum.INT64;
      case NativeTypeEnum.USHORT:
        return NativeTypeEnum.USHORT;
      case NativeTypeEnum.SHORT:
        return NativeTypeEnum.SHORT;
      default:
        (new Logger()).trace("Unknown type " + type)
        process.exit(1)
    }
  }
}

export default StructProperty;