import { create } from "xmlbuilder2"
import { XMLBuilder } from "xmlbuilder2/lib/interfaces"
import { Natives, NativeTypeEnum } from "./types"
import StructProperty from "./types/StructProperty"
import CompatStructs from "./CompatStructs"

class XSDGenerator {
  public static nativeToXSDType(type: NativeTypeEnum): string {
    switch (type) {
      case NativeTypeEnum.CHAR:
        return "xs:positiveInteger"

      case NativeTypeEnum.STRING:
      case NativeTypeEnum.ENUM:
        return "xs:string"

      case NativeTypeEnum.BOOL:
        return "xs:boolean"

      case NativeTypeEnum.INT:
      case NativeTypeEnum.INT64:
        return "xs:integer"

      case NativeTypeEnum.SHORT:
      case NativeTypeEnum.UINT:
      case NativeTypeEnum.UINT64:
        return "xs:nonNegativeInteger"

      case NativeTypeEnum.FLOAT:
        return "RAGEFloatValue"

      case NativeTypeEnum.UCHAR:
      case NativeTypeEnum.USHORT:
        return "RAGEHexAddress"

      default:
        throw new Error("Unknown basic XSD type for " + type)
    }
  }

  public static generateRageElements(dom: XMLBuilder): XMLBuilder {
    const simpleContentValue = (name: string, contentValue: string) => {
      dom = dom
        .ele("xs:complexType", { name })
        .ele("xs:simpleContent")
        .ele("xs:extension", { base: "xs:string" })
        .ele("xs:attribute", { name: "content" })
        .ele("xs:simpleType")
        .ele("xs:restriction", { base: "xs:string" })
        .ele("xs:pattern", { value: contentValue })
        .up()
        .up()
        .up()
        .up()
        .up()
        .up()
        .up()
    }

    simpleContentValue("RAGEFloatArray", "float_array")
    simpleContentValue("RAGEVec2Array", "vector2_array")
    simpleContentValue("RAGEVec2VArray", "vec2v_array")
    simpleContentValue("RAGEVec3Array", "vector3_array")
    simpleContentValue("RAGEVec3VArray", "vec3v_array")
    simpleContentValue("RAGEVec4Array", "vector4_array")
    simpleContentValue("RAGEVec4VArray", "vec4v_array")
    simpleContentValue("RAGEIntArray", "int_array")
    simpleContentValue("RAGEUCharArray", "char_array")

    // RAGEBooleanArray
    dom = dom
      .ele("xs:complexType", { name: "RAGEBooleanArray" })
      .ele("xs:sequence")
      .ele("xs:element", { name: "Item", minOccurs: 0, maxOccurs: "unbounded" })
      .ele("xs:complexType")
      .ele("xs:attribute", { name: "value" })
      .up()
      .up() // </xs:complexType>
      .up() // </xs:element>
      .up() // </xs:sequence>
      .up() // </xs:complexType>

    // RAGEBitset
    dom = dom
      .ele("xs:complexType", { name: "RAGEBitset" })
      .ele("xs:simpleContent")
      .ele("xs:extension", { base: "xs:string" })
      .ele("xs:attribute", { name: "bits", type: "xs:nonNegativeInteger" })
      .up()
      .ele("xs:attribute", { name: "content" })
      .ele("xs:simpleType")
      .ele("xs:restriction", { base: "xs:string" })
      .ele("xs:pattern", { value: "int_array" })
      .up()
      .up() // </xs:restriction>
      .up() // </xs:simpleType>
      .up() // </xs:attribute>
      .up() // </xs:extension>
      .up() // </xs:simpleContent>
      .up() // </xs:complexType>

    // RAGEMixedDecimal
    dom = dom
      .ele("xs:simpleType", { name: "RAGEMixedDecimal" })
      .ele("xs:restriction", { base: "xs:string" })
      .ele("xs:pattern", {
        value: "(0x[0-9a-fA-F]+|-?[0-9]+(\\.-?[0-9]+((f|e-?[0-9]+))?)?)"
      })
      .up()
      .up()
      .up()

    // RAGEHexAddress
    dom = dom
      .ele("xs:simpleType", { name: "RAGEHexAddress" })
      .ele("xs:restriction", { base: "xs:string" })
      .ele("xs:pattern", { value: "([0-9]+|0x[0-9a-fA-F]{1,16})" })
      .up()
      .up()
      .up()

    // RAGEVoidValue
    dom = dom
      .ele("xs:complexType", { name: "RAGEVoidValue" })
      .ele("xs:attribute", { name: "ref", type: "xs:string" })
      .up()
      .up()

    // RAGEUnsignedValue
    dom = dom
      .ele("xs:simpleType", { name: "RAGEUnsignedValue" })
      .ele("xs:restriction", { base: "xs:string" })
      .ele('xs:pattern', {value: '(-1|[0-9]+)'})
      .up()
      .up()
      .up()
    return dom
  }

  public static generateElement(
    natives: Natives,
    dom: XMLBuilder,
    field: StructProperty
  ): XMLBuilder {
    let braceMatches: string[] =
      /^(\w+)<([\w\d_ ,]+(?:<?([\w\d_ ,]+)>)?(?:[, \d]+)?)>$/g.exec(
        field.typeRaw
      )!
    if (!braceMatches) {
      braceMatches = ["", field.typeRaw]
    } else if (braceMatches[0]) {
      braceMatches = braceMatches.filter(s => !!s)
      braceMatches = [
        braceMatches[1].replace(/(, \d+)+/, ""),
        ...braceMatches.slice(2).map(s => s.replace(/(, \d+)+/, ""))
      ]
        .filter(s => !!s)
        .filter(s => !+s)
        .reduce((all, s) => {
          all.push(...s.split(", "))
          return all
        }, <string[]>[])
    }

    const [mappingType, type, max] = braceMatches
    if (mappingType === NativeTypeEnum.ARRAY) {
      // Handle arrays
      let targetType: string | null
      const baseType = type.split(" ")[0]
      switch (<NativeTypeEnum>baseType) {
        case NativeTypeEnum.FLOAT:
          targetType = "RAGEFloatArray"
          break
        case NativeTypeEnum.UCHAR:
          targetType = "RAGEUCharArray"
          break
        case NativeTypeEnum.UINT:
        case NativeTypeEnum.INT:
          targetType = "RAGEIntArray"
          break
        case NativeTypeEnum.VEC2:
          targetType = "RAGEVec2Array"
          break
        case NativeTypeEnum.VEC2V:
          targetType = "RAGEVec2VArray"
          break
        case NativeTypeEnum.VEC3:
          targetType = "RAGEVec3Array"
          break
        case NativeTypeEnum.VEC3V:
          targetType = "RAGEVec3VArray"
          break
        case NativeTypeEnum.VEC4:
          targetType = "RAGEVec4Array"
          break
        case NativeTypeEnum.VEC4V:
          targetType = "RAGEVec4VArray"
          break
        case NativeTypeEnum.MATRIX34:
        case NativeTypeEnum.MATRIX34V:
          // TODO: figure out how to type these
          return dom
        case NativeTypeEnum.BOOL:
          targetType = "RAGEBooleanArray"
          break
        case NativeTypeEnum.INT64:
        case NativeTypeEnum.UINT64:
          throw new Error("what?")
        default:
          targetType = null
      }

      if (targetType) {
        dom = dom
          .ele("xs:element", {
            name: field.name,
            type: targetType,
            minOccurs: 0,
            maxOccurs: "unbounded"
          })
          .up()
      } else if (type === "struct void") {
        // array<struct void>
        dom = dom
          .ele("xs:element", { name: field.name })
          .ele("xs:complexType")
          .ele("xs:sequence")
          .ele("xs:element", {
            name: "Item",
            minOccurs: 0,
            maxOccurs: "unbounded",
            type: "RAGEVoidValue"
          })
          .up() // </xs:element>
          .up() // </xs:sequence>
          .up() // </xs:complexType>
          .up() // </xs:element>
      } else if (baseType === NativeTypeEnum.STRUCT) {
        dom = dom
          .ele("xs:element", { name: field.name })
          .ele("xs:complexType", { mixed: true })
          .ele("xs:sequence")

        const structName = type.split(" ")[1]

        // annoying fix because RAGE is silly
        const itemName = structName.startsWith("rage__") ? "item" : "Item"
        dom = dom
          .ele("xs:element", {
            name: itemName,
            minOccurs: 0,
            maxOccurs: "unbounded"
          })
          .ele("xs:complexType")
          .ele("xs:complexContent")
          .ele("xs:extension", { base: structName })
          .ele("xs:attribute", { name: "type", type: "xs:string" })
          .up()
          .up() // </xs:extension>
          .up() // </xs:complexContent>
          .up() // </xs:complexType>
          .up() // </xs:element>

        dom = dom.up().up().up()
      } else {
        dom = dom
          .ele("xs:element", { name: field.name })
          .ele("xs:complexType", { mixed: true })
          .ele("xs:choice", { minOccurs: 0, maxOccurs: "unbounded" })

        // if it is a basic array type that's not already covered, let's just use xs:string
        if (Object.values(NativeTypeEnum).includes(<NativeTypeEnum>type)) {
          ;["item", "Item"].forEach(name => {
            dom = dom
              .ele("xs:element", {
                name,
                type: this.nativeToXSDType(<NativeTypeEnum>type)
              })
              .up()
          })
        } else {
          // nested array (array<array<struct Abc>>)
          const nestedStruct = /^array<(?:(?:struct|enum)\s)?([\w\d_]+)>$/.exec(
            type
          )
          if (type.startsWith(NativeTypeEnum.ARRAY) && nestedStruct) {
            const structField: StructProperty = {
              name: "Item",
              type: Object.values(NativeTypeEnum).filter(s =>
                type.startsWith(s)
              )[0]!,
              typeRaw: type,
              comment: ""
            }
            dom = this.generateElement(natives, dom, structField)
          } else if (type.startsWith(NativeTypeEnum.ENUM)) {
            dom = dom
              .ele("xs:element", {
                name: "Item",
                type: "xs:string",
                minOccurs: 0,
                maxOccurs: "unbounded"
              })
              .up()
          } else if (type.startsWith(NativeTypeEnum.BITSET)) {
            dom = dom
              .ele("xs:element", {
                name: "Item",
                type: "RAGEBitset",
                minOccurs: 0,
                maxOccurs: "unbounded"
              })
              .up()
          } else {
            if (!type) {
              throw new Error("Invalid struct name")
            }

            const struct = natives.structs.get(type) || natives.enums.get(type)
            if (!struct) {
              throw new Error("Cannot find struct: " + type)
            }
            const fields = Object.values(struct.fields)
            for (let field of fields) {
              dom = this.generateElement(natives, dom, field)
            }
          }
        }
        dom = dom
          .up() // </xs:choice>
          .up() // </xs:complexType>
          .up() // </xs:element>
      }
      // === END ARRAY
    } else if (mappingType === NativeTypeEnum.BITSET) {
      // BITSET<>
      dom = dom.ele("xs:element", { name: field.name, type: "RAGEBitset" }).up()
    } else if (mappingType === NativeTypeEnum.MAP) {
      // MAP<>
      const [, iterType] = braceMatches[2].split(" ")
      let isSimple = !iterType

      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType", { mixed: !isSimple })
        .ele("xs:choice", { minOccurs: 0, maxOccurs: "unbounded" })
        .ele("xs:element", { name: "Item" })
        .ele("xs:complexType")

      if (!isSimple) {
        dom = dom
          .ele("xs:complexContent")
          .ele("xs:extension", { base: iterType })
      }

      dom = dom
        .ele("xs:attribute", { name: "type", type: "xs:string" })
        .up()
        .ele("xs:attribute", { name: "key", type: "xs:string" })
        .up()

      if (!isSimple) {
        dom = dom
          .up() // </xs:extension>
          .up() // </xs:complexContent>
      }

      dom = dom
        .up() // </xs:complexType>
        .up() // </xs:element>
        .up() // </xs:sequence>
        .up() // </xs:complexType>
        .up() // </xs:element>
    } else if (
      type.startsWith(NativeTypeEnum.STRUCT) &&
      type !== "struct void"
    ) {
      // STRUCT<>
      const structName = type.split(" ")[1]
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:complexContent")
        .ele("xs:extension", { base: structName })
        .ele("xs:attribute", { name: "type", type: "xs:string" })
        .up()
        .up()
        .up()
        .up()
        .up()
    } else if (mappingType === NativeTypeEnum.ENUM) {
      // ENUM
      dom = dom.ele("xs:element", { name: field.name, type: "xs:string" }).up()
    } else if (
      [NativeTypeEnum.VEC2, NativeTypeEnum.VEC2V].includes(<NativeTypeEnum>type)
    ) {
      // VEC2(V)
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "x", type: "RAGEMixedDecimal" })
        .up()
        .ele("xs:attribute", { name: "y", type: "RAGEMixedDecimal" })
        .up()
        .up()
        .up()
    } else if (
      [NativeTypeEnum.VEC3, NativeTypeEnum.VEC3V].includes(<NativeTypeEnum>type)
    ) {
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "x", type: "RAGEMixedDecimal" })
        .up()
        .ele("xs:attribute", { name: "y", type: "RAGEMixedDecimal" })
        .up()
        .ele("xs:attribute", { name: "z", type: "RAGEMixedDecimal" })
        .up()
        .up()
        .up()
    } else if (
      [NativeTypeEnum.VEC4, NativeTypeEnum.VEC4V].includes(<NativeTypeEnum>type)
    ) {
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "x", type: "RAGEMixedDecimal" })
        .up()
        .ele("xs:attribute", { name: "y", type: "RAGEMixedDecimal" })
        .up()
        .ele("xs:attribute", { name: "z", type: "RAGEMixedDecimal" })
        .up()
        .ele("xs:attribute", { name: "w", type: "RAGEMixedDecimal" })
        .up()
        .up()
        .up()
    } else if (
      [NativeTypeEnum.FLOAT, NativeTypeEnum.FLOAT16].includes(
        <NativeTypeEnum>type
      )
    ) {
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "value", type: "RAGEMixedDecimal" })
        .up()
        .up()
        .up()
    } else if ([NativeTypeEnum.BOOL].includes(<NativeTypeEnum>type)) {
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "value", type: "xs:boolean" })
        .up()
        .up()
        .up()
    } else if (
      [NativeTypeEnum.INT, NativeTypeEnum.SHORT].includes(<NativeTypeEnum>type)
    ) {
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "value", type: "xs:integer" })
        .up()
        .up()
        .up()
    } else if (
      [NativeTypeEnum.UINT, NativeTypeEnum.UINT64].includes(
        <NativeTypeEnum>type
      )
    ) {
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "value", type: "RAGEHexAddress" })
        .up()
        .up()
        .up()
    } else if (type === `struct void`) {
      dom = dom
        .ele("xs:element", { name: field.name, type: "RAGEVoidValue" })
        .up()
    } else if (
      [NativeTypeEnum.UCHAR, NativeTypeEnum.USHORT].includes(
        <NativeTypeEnum>type
      )
    ) {
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "value", type: "RAGEUnsignedValue" })
        .up()
        .up()
        .up()
    } else if (
      [NativeTypeEnum.MATRIX34, NativeTypeEnum.MATRIX34V].includes(
        <NativeTypeEnum>type
      )
    ) {
      // TODO: matrix34
    } else if ([NativeTypeEnum.CHAR].includes(<NativeTypeEnum>type)) {
      dom = dom
        .ele("xs:element", { name: field.name })
        .ele("xs:complexType")
        .ele("xs:attribute", { name: "value", type: "xs:nonNegativeInteger" })
        .up()
        .up()
        .up()
    } else {
      const xsdType = field.type
        ? this.nativeToXSDType(field.type)
        : "xs:nonNegativeInteger" // enum values
      dom = dom.ele("xs:element", { name: field.name, type: xsdType }).up()
    }

    return dom
  }

  public static compile(natives: Natives, tick: () => any): XMLBuilder {
    let dom = create({ version: "1.0" }).ele("xs:schema", {
      "xmlns:xs": "http://www.w3.org/2001/XMLSchema"
    })

    dom = CompatStructs.inject(dom)
    dom = this.generateRageElements(dom)

    natives.structs.forEach(struct => {
      tick()
      /* generate reusable type */

      // determine whether we can trust the order of the struct properties
      const isMergedType = !!struct.parent

      dom = dom.ele("xs:complexType", { name: struct.name, mixed: true })
      const fieldCount = Object.keys(struct.fields).length
      dom = dom.ele("xs:choice", {
        minOccurs: 0,
        maxOccurs: fieldCount ? fieldCount : undefined
      })
      Object.values(struct.fields).forEach(
        f => (dom = this.generateElement(natives, dom, f))
      )

      dom = dom
        .up() // </xs:choice> or </xs:sequence>
        .up() // </xs:complexType>

      // generate element
      dom = dom
        .ele("xs:element", { name: struct.name })
        .ele("xs:complexType")
        .ele("xs:complexContent")
        .ele("xs:extension", { base: struct.name })
        .up()
        .up()
        .up()
        .up()
    })

    natives.enums.forEach(enumData => {
      tick()
      dom = dom
        .ele("xs:complexType", { name: enumData.name })
        .ele("xs:choice", { minOccurs: 0, maxOccurs: "unbounded" })
      Object.keys(enumData).forEach(k => {
        if (k.match(/^\d+/)) return // these are invalid XSD names
        dom = dom
          .ele("xs:element", { name: k, type: "xs:positiveInteger" })
          .up()
      })
      dom = dom.up().up()
    })

    dom = dom.up()
    tick()
    return dom
  }
}

export default XSDGenerator
