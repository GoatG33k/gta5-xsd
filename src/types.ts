/** Base Types **/
import StructProperty from "./StructProperty";

export type StructData = {
  name: string;
  parent?: string;
  fields: { [property: string]: StructProperty };
}

export interface EnumPropertyData {
  name: string;
  value: number;
}

export interface StructPropertyData {
  type: NativeTypeEnum;
  typeRaw: string;
  name: string;
  comment: string;
}

export type EnumData = { [key: string]: EnumPropertyData } & { name: string; }

export type NativeVec2 = { x: number; y: number; }
export type NativeVec3 = { x: number; y: number; z: number; };
export type NativeVec4 = { x: number; y: number; z: number; h: number; };
// https://github.com/NVIDIAGameWorks/PhysX-3.4/blob/5e42a5f112351a223c19c17bb331e6c55037b8eb/PxShared/src/foundation/include/PsVecMathAoSScalar.h#L77
export type NativeVec3V = { x: number; y: number; z: number; pad: number; };
// https://github.com/NVIDIAGameWorks/PhysX-3.4/blob/5e42a5f112351a223c19c17bb331e6c55037b8eb/PxShared/src/foundation/include/PsVecMathAoSScalar.h#L65
export type NativeVec4V = { x: number; y: number; z: number; w: number; };

export type NativeArray<T> = T[] | never[];

export type NativeUChar = number;
export type NativeUFloat = number;

export type NativeType = number | string |
  NativeUFloat | NativeUChar |
  NativeVec2 | NativeVec3 | NativeVec4 |
  NativeVec4V | NativeVec3V |
  NativeArray<any>;

export enum NativeTypeEnum {
  // lists / structs
  ENUM = 'enum',
  STRUCT = 'struct',
  ARRAY = 'array',
  MAP = 'map',
  BITSET = 'bitset',

  // matrix
  MATRIX34 = 'matrix34',
  MATRIX34V = 'matrix34V',

  // vec
  VEC2 = 'vec2',
  VEC2V = 'vec2V',
  VEC3 = 'vec3',
  VEC3V = 'vec3V',
  VEC4 = 'vec4',
  VEC4V = 'vec4V',

  // simple types
  BOOL = 'bool',
  STRING = 'string',
  FLOAT = 'float',
  FLOAT16 = 'float16',
  UCHAR = 'uchar',
  CHAR = 'char',
  UINT = 'uint',
  UINT64 = 'uint64',
  INT = 'int',
  INT64 = 'int64',
  USHORT = 'ushort',
  SHORT = 'short',
  
  // rdr2 types
  QUATV = 'quatV',
  
  // void
  VOID = 'void',
}