import {Natives} from "./tree/Natives";
import {EnumData, EnumPropertyData, StructData} from "./types";
import {Logger} from "tslog";
import StructProperty from "./StructProperty";

export class DumpParser {
  static async build(data: string): Promise<Natives> {
    const structMap: Map<string, StructData> = new Map();
    const enumMap: Map<string, EnumData> = new Map();
    const logger = new Logger({
      name: "parse",
      displayFilePath: 'hidden',
      displayFunctionName: false,
      // minLevel: "info"
    })

    let matches = data
      .match(/((struct|enum) (?:[\w\d_]+)(?:\s:\s(?:[\w\d_]+))?\n{([\s\t\w\d\n\/=,:.;<>]+)};)/gm)

    if (!matches) {
      throw new Error();
    }

    logger.info(`parsing ${matches.length} items...`)
    const entries: (StructData | EnumData)[] = [];
    for (const src of matches) {
      let lines = src.split('\n')
      const header = lines[0];
      let isEnum = false;
      let sliceLength: number;
      if (header.startsWith('struct')) {
        sliceLength = 7;
      } else if (header.startsWith('enum')) {
        sliceLength = 5;
        isEnum = true;
      } else {
        throw new Error();
      }
      const [unparsedType, parentType] = header
        .replace(/\s+/m, ' ').trim()
        .split(':').map(s => s.trim())
      const [kind, type] = unparsedType.split(' ').map(s => s.trim())

      logger.debug(`parsing '${type}'...`)
      const properties: { [name: string]: StructProperty | EnumPropertyData } = {};
      const attributeLines = lines
        .slice(2).slice(0, lines.length - 3)
        .map(line => line.replace(/(\s{2,})/g, ' '))
        .map(line => line.replace(/\t/m, ''))

      if (kind === 'struct') {
        attributeLines.forEach(line => {
          const attributeMatches = /([\w,<> ]+)\s+(\w+);\s+\/\/\s([\w:.]+)/g.exec(line)
          if (!attributeMatches || attributeMatches.length < 4) {
            throw new Error("Failed parsing line:\n" + line)
          }
          const [, type, name, comment] = attributeMatches!;
          properties[name] = new StructProperty({
            name,
            typeRaw: type,
            type: StructProperty.getTypeAsEnum(type),
            comment: comment,
          })
        })
        const struct = {
          name: type,
          parent: parentType,
          fields: properties,
        } as StructData;
        structMap.set(type, struct)
        entries.push(struct)
      } else if (kind === 'enum') {
        // parse enum
        attributeLines.forEach(line => {
          let [key, value] = line.split(' = ');
          properties[key] = {
            name: key,
            value: +(value.slice(0, value.length - 2))
          } as EnumPropertyData;
        })
        const enumData = {
          name: type,
          ...properties,
        } as EnumData;
        enumMap.set(type, enumData)
        entries.push(enumData)
      } else {
        throw new Error("Unknown type: " + kind)
      }
    }

    logger.info(`calculating dependencies...`)
    const loadedStructs: string[] = [];
    let unprocessedStructs: (StructData | EnumData)[] = [...entries]

    let i = 0;
    do {
      unprocessedStructs = unprocessedStructs.map<StructData | EnumData | undefined>((unsafeStruct) => {
        if (loadedStructs.includes(unsafeStruct.name)) return;
        if (!unsafeStruct.parent) {
          loadedStructs.push(unsafeStruct.name)
        } else {
          if (typeof unsafeStruct.parent !== 'string') {
            return;
          }
          // if it has a parent, but literally is not in the dump, mark it as resolved
          if (!structMap.has(unsafeStruct.parent)) {
            loadedStructs.push(unsafeStruct.name)
          }
          // if it has a parent, make sure it's loaded
          if (!loadedStructs.includes(unsafeStruct.parent)) {
            // not loaded, wait for it to be
            return unsafeStruct;
          } else {
            // update the properties
            const parentStruct = structMap.get(unsafeStruct.parent)
            const struct = structMap.get(unsafeStruct.name)
            if (!struct || !parentStruct) return unsafeStruct;
            Object.assign(struct.fields, {
              ...struct.fields,
              ...parentStruct.fields,
            })
            logger.silly(`merging ${parentStruct.name} => ${unsafeStruct.name}`)
            structMap.set(unsafeStruct.name, struct);
            loadedStructs.push(unsafeStruct.name)
            return undefined;
          }
        }
        return unsafeStruct;
      }).filter(v => typeof v !== 'undefined') as StructData[]
      i++;
      logger.info(`finished loop ${i} (${unprocessedStructs.length} left)`)
    } while (unprocessedStructs.length > 0 && i < 10)

    if (unprocessedStructs.length > 0) {
      logger.error(`Failed to resolve all dependencies within 10 loops, please report this as a bug.`)
    }
    logger.info(`compiled list of ${structMap.size} GTAV natives`)

    return {
      structs: structMap,
      enums: enumMap,
    };
  }
}