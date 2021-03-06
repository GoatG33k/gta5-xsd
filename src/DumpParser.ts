import { EnumData, EnumPropertyData, Natives, StructData } from "./types"
import { Logger } from "tslog"
import StructProperty from "./types/StructProperty"

export enum ProgressState {
  PARSE,
  RESOLVE
}

export class DumpParser {
  static async build(
    data: string,
    tickFn: (state: ProgressState, curr: number, total: number) => any
  ): Promise<Natives> {
    const structMap: Map<string, StructData> = new Map()
    const enumMap: Map<string, EnumData> = new Map()
    const logger = new Logger({
      name: "parse",
      displayFilePath: "hidden",
      displayFunctionName: false
      // minLevel: "info"
    })

    let matches = data.match(
      /((struct|enum) (?:[\w\d_]+)(?:\s:\s(?:[\w\d_]+))?\n{([\s\t\w\d\n\/=,:.;<>]+)};)/gm
    )

    if (!matches) {
      throw new Error()
    }

    const entries: (StructData | EnumData)[] = []
    await tickFn(ProgressState.PARSE, 0, matches.length)
    let matchIndex = 0
    for (const src of matches) {
      matchIndex++
      await tickFn(ProgressState.PARSE, matchIndex - 1, matches.length)

      let lines = src.split("\n")
      const header = lines[0]
      let isEnum = false
      let sliceLength: number

      if (header.startsWith("struct")) {
        sliceLength = 7
      } else if (header.startsWith("enum")) {
        sliceLength = 5
        isEnum = true
      } else {
        throw new Error()
      }
      const [unparsedType, parentType] = header
        .replace(/\s+/m, " ")
        .trim()
        .split(":")
        .map(s => s.trim())
      const [kind, type] = unparsedType.split(" ").map(s => s.trim())

      const properties: { [name: string]: StructProperty | EnumPropertyData } =
        {}
      const attributeLines = lines
        .slice(2)
        .slice(0, lines.length - 3)
        .map(line => line.replace(/(\s{2,})/g, " "))
        .map(line => line.replace(/\t/m, ""))

      if (kind === "struct") {
        attributeLines.forEach(line => {
          const attributeMatches =
            /([\w,<> ]+)\s+(\w+);\s+\/\/\s([\w:.]+)/g.exec(line)
          if (!attributeMatches || attributeMatches.length < 4) {
            throw new Error("Failed parsing line:\n" + line)
          }
          const [, type, name, comment] = attributeMatches!
          properties[name] = new StructProperty({
            name,
            typeRaw: type,
            type: StructProperty.getTypeAsEnum(type),
            comment: comment
          })
        })
        const struct: StructData = {
          name: type,
          parent: parentType,
          fields: properties as { [key: string]: StructProperty },
          children: []
        }
        structMap.set(type, struct)
        entries.push(struct)
      } else if (kind === "enum") {
        // parse enum
        attributeLines.forEach(line => {
          let [key, value] = line.split(" = ")
          properties[key] = <EnumPropertyData>{
            name: key,
            value: +value.slice(0, value.length - 2)
          }
        })
        const enumData: EnumData = {
          name: type,
          fields: properties as { [key: string]: EnumPropertyData }
        }
        enumMap.set(type, enumData)
        entries.push(enumData)
      } else {
        throw new Error("Unknown type: " + kind)
      }
    }

    const loadedStructs: string[] = []
    const totalStructs = entries.length
    let unprocessedStructs: (StructData | EnumData)[] = [...entries]

    let i = 0
    do {
      unprocessedStructs = (
        await Promise.all(
          unprocessedStructs.map<StructData | EnumData | undefined>(
            unsafeStruct => {
              return tickFn(
                ProgressState.RESOLVE,
                totalStructs - unprocessedStructs.length,
                totalStructs
              )
                .then(() => void 0)
                .then(() => {
                  if (loadedStructs.includes(unsafeStruct.name)) return
                  if (!unsafeStruct.parent) {
                    loadedStructs.push(unsafeStruct.name)
                  } else {
                    const { name, parent } = unsafeStruct
                    // if it has a parent, but literally is not in the dump, mark it as resolved
                    if (!structMap.has(parent)) loadedStructs.push(name)
                    // if it has a parent, make sure it and its parents are loaded
                    if (!loadedStructs.includes(parent)) {
                      // not loaded, wait for it to be
                      return unsafeStruct
                    } else {
                      // make sure all parents are loaded
                      const { name } = unsafeStruct
                      let extendsTree = [name]
                      let currentStruct = unsafeStruct
                      let parent
                      do {
                        if (!currentStruct.parent) {
                          parent = undefined
                          continue
                        }
                        parent = structMap.get(currentStruct.parent!)
                        if (!parent) return unsafeStruct // not loaded
                        currentStruct = parent
                        extendsTree.push(currentStruct.name)
                      } while (parent)

                      // reverse the dependency tree to be parent -> child
                      extendsTree = extendsTree.reverse()

                      // recursively apply the properties from the top-most parent struct
                      unsafeStruct.fields = extendsTree
                        .map(n => structMap.get(n)!)
                        .reduce((fields, struct) => {
                          fields = Object.assign(
                            {},
                            {
                              ...fields,
                              ...struct.fields
                            }
                          )
                          return fields
                        }, {})

                      structMap.set(name, unsafeStruct)
                      loadedStructs.push(name)
                      return undefined
                    }
                  }
                  return unsafeStruct
                })
            }
          )
        )
      ).filter(v => typeof v !== "undefined") as StructData[]
      i++
      await tickFn(
        ProgressState.RESOLVE,
        totalStructs - unprocessedStructs.length - 1,
        totalStructs
      )
    } while (unprocessedStructs.length > 0 && i < 10)

    if (unprocessedStructs.length > 0) {
      logger.error(
        `Failed to resolve all dependencies within 10 loops, please report this as a bug.`
      )
    }

    // pass #2 - calculate children
    for (let baseStructName of structMap.keys()) {
      // build list of all children
      const foundChildren = []
      let resolveQueue = [baseStructName]
      do {
        const oldResolveQueue = [...resolveQueue]
        const newResolveQueue = []
        for (let resolveQueueName of oldResolveQueue) {
          // find all elements with resolveQueueName as a parent, and add them to newResolveQueue
          for (let deepStructName of structMap.keys()) {
            const deepStruct = structMap.get(deepStructName)!
            if (deepStruct.parent !== resolveQueueName) continue
            newResolveQueue.push(deepStructName)
            foundChildren.push(deepStructName)
          }
        }
        resolveQueue = newResolveQueue
      } while (resolveQueue.length)

      // load from data
      const struct = structMap.get(baseStructName)!
      struct.children = foundChildren
      structMap.set(baseStructName, struct)
    }

    return {
      structs: structMap,
      enums: enumMap
    }
  }
}
