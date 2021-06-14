import { create } from "xmlbuilder2"
import { XMLBuilder } from "xmlbuilder2/lib/interfaces"
import { Natives, NativeTypeEnum } from "./types"
import StructProperty from "./types/StructProperty"
import { LOGGER } from "./index"

class XSDGenerator {
  public static enumTypeToXML(type: NativeTypeEnum): string | null {
    switch (type) {
      case NativeTypeEnum.STRING:
        return "xs:string"
      case NativeTypeEnum.VOID:
        return "xs:anyType"
      default:
        return null
    }
  }

  protected static extensionElement(
    dom: XMLBuilder,
    struct: string,
    innerTypeParam = false
  ): XMLBuilder {
    if (Object.values(NativeTypeEnum).includes(<NativeTypeEnum>struct)) {
      LOGGER.error(new Error("Invalid extension: " + struct))
      process.exit(1)
    }
    // Fix weird structs defined by 'type'
    struct =
      {
        CBaseSubHandlingData: "CCarHandlingData"
      }[struct] || struct
    dom = dom.ele("xs:extension", { base: struct })
    if (innerTypeParam) {
      dom.ele("xs:attribute", { name: "type" }).up()
    }
    dom = dom.up()
    return dom
  }

  protected static booleanElement(dom: XMLBuilder, name = "Item"): XMLBuilder {
    return dom
      .ele("xs:element", { name })
      .ele("xs:complexType")
      .ele("xs:attribute", { name: "value", type: "xs:boolean" })
      .up()
      .up()
      .up()
  }

  protected static vector4Element(
    dom: XMLBuilder,
    name: string = "Item"
  ): XMLBuilder {
    return dom
      .ele("xs:element", { name })
      .ele("xs:complexType")
      .ele("xs:attribute", { name: "x", type: "xs:decimal" })
      .up()
      .ele("xs:attribute", { name: "y", type: "xs:decimal" })
      .up()
      .ele("xs:attribute", { name: "z", type: "xs:decimal" })
      .up()
      .ele("xs:attribute", { name: "w", type: "xs:decimal" })
      .up()
      .up()
      .up()
  }

  protected static vector3Element(
    dom: XMLBuilder,
    name: string = "Item"
  ): XMLBuilder {
    return dom
      .ele("xs:element", { name })
      .ele("xs:complexType")
      .ele("xs:attribute", { name: "x", type: "xs:decimal" })
      .up()
      .ele("xs:attribute", { name: "y", type: "xs:decimal" })
      .up()
      .ele("xs:attribute", { name: "z", type: "xs:decimal" })
      .up()
      .up()
      .up()
  }

  protected static vector2Element(
    dom: XMLBuilder,
    name: string = "Item"
  ): XMLBuilder {
    return dom
      .ele("xs:element", { name })
      .ele("xs:complexType")
      .ele("xs:attribute", { name: "x", type: "xs:decimal" })
      .up()
      .ele("xs:attribute", { name: "y", type: "xs:decimal" })
      .up()
      .up()
      .up()
  }

  protected static hexElement(
    dom: XMLBuilder,
    name: string = "Item",
    attrName = "value"
  ): XMLBuilder {
    dom = dom.ele("xs:element", { name }).ele("xs:complexType")

    dom = dom
      .ele("xs:attribute", { name: attrName })
      .ele("xs:simpleType")
      .ele("xs:restriction", { base: "xs:string" })
      .ele("xs:pattern", { value: "0x[0-9A-Fa-f]+|[0-9]+" })
      .up()
      .up()
      .up()
      .up()

    dom = dom.up().up()
    return dom
  }

  protected static floatElement(
    dom: XMLBuilder,
    name: string = "Item",
    base: string = "xs:string",
    attrName = "content",
    type?: string
  ): XMLBuilder {
    dom = dom.ele("xs:element", { name }).ele("xs:complexType", { mixed: true })
    if (type) {
      dom = dom.ele("xs:simpleContent").ele("xs:extension", { base: type })
    }
    dom = dom.ele("xs:attribute", { name: attrName, type: base }).up()
    if (type) {
      dom = dom.up().up()
    }
    dom = dom.up().up()
    return dom
  }

  public static generate(natives: Natives, tick: () => any): XMLBuilder {
    let dom = create({ version: "1.0" }).ele("xs:schema", {
      "xmlns:xs": "http://www.w3.org/2001/XMLSchema"
    })

    const generateFieldElement = (
      dom: XMLBuilder,
      field: StructProperty
    ): XMLBuilder => {
      const xmlType = XSDGenerator.enumTypeToXML(field.type)
      if (xmlType) {
        dom = dom.ele("xs:element", { name: field.name, type: xmlType }).up()
      } else {
        let isBraced = false

        switch (field.type) {
          case NativeTypeEnum.ARRAY:
            isBraced = true
        }

        let braceMatches: string[] = /(\w+)<([_\d\w, ]+)>/g.exec(field.typeRaw)!
        if (!braceMatches) {
          braceMatches = ["", ...field.typeRaw.split(" ")]
        }
        const [, braceType, braceArgsRaw] = braceMatches
        const braceArgs = braceArgsRaw?.split(",").map(s => s.trim())

        if (field.type === NativeTypeEnum.ENUM) {
          if (!field.name.match(/^\d+/)) {
            dom = dom
              .ele("xs:element", { name: field.name, type: "xs:string" })
              .up()
          }
        } else if (field.type == NativeTypeEnum.STRUCT) {
          const name = braceArgs[0]
          if (field.comment === "type:STRUCT.POINTER") {
            dom = dom
              .ele("xs:element", { name: field.name })
              .ele("xs:complexType")
              .ele("xs:attribute", { name: "type", type: "xs:string" })
              .up()
              .up()
              .up()
          } else if (
            [NativeTypeEnum.VEC4, NativeTypeEnum.VEC4V].includes(
              <NativeTypeEnum>name
            )
          ) {
            dom = this.vector4Element(dom, field.name)
          } else if (
            [NativeTypeEnum.VEC3, NativeTypeEnum.VEC3V].includes(
              <NativeTypeEnum>name
            )
          ) {
            dom = this.vector3Element(dom, field.name)
          } else if (name === NativeTypeEnum.VOID) {
            dom = dom
              .ele("xs:element", { name: field.name })
              .ele("xs:complexType")
              .ele("xs:attribute", { name: "ref", type: "xs:string" })
              .up()
              .up()
              .up()
          } else {
            dom = dom
              .ele("xs:element", { name: field.name })
              .ele("xs:complexType")
              .ele("xs:complexContent")
            dom = XSDGenerator.extensionElement(dom, name)
            dom = dom.up().up().up()
          }
        } else if (field.type == NativeTypeEnum.BITSET) {
          // const name = braceArgs[0].split(" ")[1]
          dom = dom
            .ele("xs:element", { name: field.name, type: "xs:string" })
            .up()
        } else if (isBraced) {
          if (field.type === NativeTypeEnum.ARRAY) {
            const simpleTypes = [
              NativeTypeEnum.VOID,
              NativeTypeEnum.BOOL,
              NativeTypeEnum.UCHAR,
              NativeTypeEnum.CHAR,
              NativeTypeEnum.SHORT,
              NativeTypeEnum.USHORT,
              NativeTypeEnum.STRING,
              NativeTypeEnum.FLOAT,
              NativeTypeEnum.FLOAT16,
              NativeTypeEnum.INT,
              NativeTypeEnum.UINT
            ]
            if (simpleTypes.includes(<NativeTypeEnum>braceArgs[0])) {
              if (braceArgs[0] == NativeTypeEnum.FLOAT) {
                dom = XSDGenerator.floatElement(dom, field.name, "xs:string")
              } else if (
                [NativeTypeEnum.UCHAR, NativeTypeEnum.USHORT].includes(
                  <NativeTypeEnum>braceArgs[0]
                )
              ) {
                dom = XSDGenerator.floatElement(
                  dom,
                  field.name,
                  "xs:string",
                  "content",
                  "xs:string"
                )
              } else if (braceArgs[0] === NativeTypeEnum.BOOL) {
                dom = XSDGenerator.booleanElement(dom, field.name)
              } else if (braceArgs[0] === NativeTypeEnum.VEC3) {
                dom = XSDGenerator.vector3Element(dom, "Item")
              } else {
                dom = dom
                  .ele("xs:element", { name: field.name })
                  .ele("xs:complexType", { mixed: true })
                  .ele("xs:choice", { minOccurs: 0, maxOccurs: "unbounded" })
                  .ele("xs:element", {
                    name: "Item",
                    type: XSDGenerator.enumTypeToXML(
                      <NativeTypeEnum>braceArgs[0]
                    )
                  })
                  .up()
                  .up()
                  .up()
                  .up()
              }
            } else {
              const childStructParts = [...braceArgs[0]?.split(" ")]
              const childStructName = childStructParts[1] || childStructParts[0]

              dom = dom
                .ele("xs:element", { name: field.name })
                .ele("xs:complexType", { mixed: true })
                .ele("xs:choice", { minOccurs: 0, maxOccurs: "unbounded" })

              if (childStructParts[0] === "enum") {
                dom = dom
                  .ele("xs:element", { name: "Item", type: "xs:string" })
                  .up()
              } else if (childStructName === "void") {
                dom = dom
                  .ele("xs:element", { name: "Item", maxOccurs: "unbounded" })
                  .ele("xs:complexType")
                  .ele("xs:attribute", { name: "ref", type: "xs:string" })
                  .up()
                  .up()
                  .up()
              } else if (
                [NativeTypeEnum.VEC2, NativeTypeEnum.VEC2V].includes(
                  <NativeTypeEnum>childStructName
                )
              ) {
                dom = XSDGenerator.vector2Element(dom)
              } else if (
                [NativeTypeEnum.VEC3, NativeTypeEnum.VEC3V].includes(
                  <NativeTypeEnum>childStructName
                )
              ) {
                dom = XSDGenerator.vector3Element(dom)
              } else if (
                [NativeTypeEnum.VEC4, NativeTypeEnum.VEC4V].includes(
                  <NativeTypeEnum>childStructName
                )
              ) {
                dom = XSDGenerator.vector4Element(dom)
              } else if (childStructName === NativeTypeEnum.USHORT) {
                dom = XSDGenerator.floatElement(dom, "Item", childStructName)
              } else if (
                [NativeTypeEnum.MATRIX34, NativeTypeEnum.MATRIX34V].includes(
                  <NativeTypeEnum>childStructName
                )
              ) {
                // FIXME: not supported yet
              } else {
                dom = dom
                  .ele("xs:element", { name: "Item" })
                  .ele("xs:complexType")
                  .ele("xs:complexContent")
                dom = XSDGenerator.extensionElement(dom, childStructName, true)
                dom = dom.up().up().up()
              }

              dom = dom.up().up().up()
            }
          }
        } else if (
          field.type === NativeTypeEnum.FLOAT ||
          field.type === NativeTypeEnum.FLOAT16
        ) {
          dom = dom
            .ele("xs:element", { name: field.name })
            .ele("xs:complexType")
            .ele("xs:attribute", { name: "value", type: "xs:decimal" })
            .up()
            .up()
            .up()
        } else if (
          [NativeTypeEnum.VEC4, NativeTypeEnum.VEC4V].includes(field.type)
        ) {
          dom = this.vector4Element(dom, field.name)
        } else if (
          [NativeTypeEnum.VEC3, NativeTypeEnum.VEC3V].includes(field.type)
        ) {
          dom = this.vector3Element(dom, field.name)
        } else if ([NativeTypeEnum.VEC2].includes(field.type)) {
          dom = this.vector2Element(dom, field.name)
        } else if (
          [NativeTypeEnum.UCHAR, NativeTypeEnum.USHORT].includes(field.type)
        ) {
          dom = dom
            .ele("xs:element", { name: field.name })
            .ele("xs:complexType")
            .ele("xs:attribute", { name: "value", type: "xs:integer" })
            .up()
            .up()
            .up()
        } else if (
          [NativeTypeEnum.UINT, NativeTypeEnum.UINT64].includes(field.type)
        ) {
          dom = this.hexElement(dom, field.name)
        } else if (
          [
            NativeTypeEnum.INT,
            NativeTypeEnum.INT64,
            NativeTypeEnum.CHAR,
            NativeTypeEnum.SHORT
          ].includes(field.type)
        ) {
          dom = this.floatElement(dom, field.name, "xs:integer", "value")
        } else if (field.type === NativeTypeEnum.BOOL) {
          dom = dom
            .ele("xs:element", { name: field.name })
            .ele("xs:complexType")
            .ele("xs:attribute", { name: "value", type: "xs:boolean" })
            .up()
            .up()
            .up()
        } else if (field.type === NativeTypeEnum.STRING) {
          dom = dom.ele("xs:element", {
            name: field.name,
            type: XSDGenerator.enumTypeToXML(field.type)
          })
        } else if (
          ![
            NativeTypeEnum.MAP,
            NativeTypeEnum.MATRIX34,
            NativeTypeEnum.MATRIX34V
          ].includes(field.type)
        ) {
          // FIXME - These are not implemented yet
          console.dir(field)
          process.exit(1)
        }
      }
      return dom
    }

    natives.structs.forEach(struct => {
      tick()
      // generate reusable type
      dom = dom
        .ele("xs:complexType", { name: struct.name })
        .ele("xs:choice", { minOccurs: 0, maxOccurs: "unbounded" })
      Object.values(struct.fields).forEach(
        f => (dom = generateFieldElement(dom, f))
      )
      dom = dom.up().up()
      // generate element
      dom = dom
        .ele("xs:element", { name: struct.name })
        .ele("xs:complexType")
        .ele("xs:complexContent")
      dom = XSDGenerator.extensionElement(dom, struct.name)
      dom = dom.up().up().up()
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
