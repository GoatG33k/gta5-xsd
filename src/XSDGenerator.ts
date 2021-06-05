import {Natives} from "./tree/Natives";
import {create} from "xmlbuilder2";
import {XMLBuilder} from "xmlbuilder2/lib/interfaces";
import {NativeTypeEnum} from "./types";
import StructProperty from "./StructProperty";

class XSDGenerator {
  public static enumTypeToXML(type: NativeTypeEnum): string | null {
    switch (type) {
      case NativeTypeEnum.STRING:
        return 'xs:string';
      case NativeTypeEnum.SHORT:
        return 'xs:integer';
      case NativeTypeEnum.VOID:
        return 'xs:anyType';
      default:
        return null;
    }
  }

  protected static extensionElement(dom: XMLBuilder, struct: string): XMLBuilder {
    if (['vec2', 'vec2V', 'vec3', 'vec4', 'vec4V', 'ushort',
      // 'matrix34V'
      // ???????????
    ].includes(struct)) {
      throw new Error("Invalid extension: " + struct)
    }
    return dom.ele('xs:extension', {base: struct}).up()
  }

  protected static booleanElement(dom: XMLBuilder): XMLBuilder {
    return dom.ele('xs:element', {name: 'Item'})
      .ele('xs:complexType')
      .ele('xs:complexContent')
      .ele('xs:restriction', {base: 'xs:boolean'})
      .ele('xs:attribute', {name: 'value'})
      .up()
      .up()
      .up()
      .up()
      .up()
  }

  protected static vector4Element(dom: XMLBuilder, name: string = "Item"): XMLBuilder {
    return dom.ele('xs:element', {name})
      .ele('xs:complexType')
      .ele('xs:complexContent')
      .ele('xs:restriction', {base: 'xs:decimal'})
      .ele('xs:attribute', {name: 'x'}).up()
      .ele('xs:attribute', {name: 'y'}).up()
      .ele('xs:attribute', {name: 'z'}).up()
      .ele('xs:attribute', {name: 'w'}).up()
      .up()
      .up()
      .up()
      .up()
  }

  protected static vector3Element(dom: XMLBuilder, name: string = "Item"): XMLBuilder {
    return dom.ele('xs:element', {name})
      .ele('xs:complexType')
      .ele('xs:complexContent')
      .ele('xs:restriction', {base: 'xs:decimal'})
      .ele('xs:attribute', {name: 'x'}).up()
      .ele('xs:attribute', {name: 'y'}).up()
      .ele('xs:attribute', {name: 'z'}).up()
      .up()
      .up()
      .up()
      .up()
  }

  protected static vector2Element(dom: XMLBuilder, name: string = "Item"): XMLBuilder {
    return dom.ele('xs:element', {name})
      .ele('xs:complexType')
      .ele('xs:complexContent')
      .ele('xs:restriction', {base: 'xs:decimal'})
      .ele('xs:attribute', {name: 'x'}).up()
      .ele('xs:attribute', {name: 'y'}).up()
      .up()
      .up()
      .up()
      .up()
  }

  protected static floatElement(dom: XMLBuilder, name: string = 'Item', base: string = 'xs:string', attrName = 'content'): XMLBuilder {
    return dom
      .ele('xs:element', {name})
      .ele('xs:complexType')
      .ele('xs:complexContent')
      .ele('xs:restriction', {base})
      .ele('xs:attribute', {name: attrName})
      .up()
      .up()
      .up()
      .up()
      .up()
  }

  public static generate(natives: Natives): XMLBuilder {
    let dom = create({version: '1.0'})
      .ele('xs:schema', {'xmlns:xs': 'http://www.w3.org/2001/XMLSchema'})

    const generateFieldElement = (dom: XMLBuilder, field: StructProperty): XMLBuilder => {
      const xmlType = XSDGenerator.enumTypeToXML(field.type)
      if (xmlType) {
        dom = dom.ele('xs:element', {name: field.name, type: xmlType})
          .up()
      } else {
        let isBraced = false;

        switch (field.type) {
          case NativeTypeEnum.ARRAY:
            isBraced = true;
        }

        let braceMatches: string[] = /(\w+)<([_\d\w, ]+)>/g.exec(field.typeRaw)!;
        if (!braceMatches) {
          braceMatches = ['', ...field.typeRaw.split(' ')]
        }
        const [, braceType, braceArgsRaw] = braceMatches;
        const braceArgs = braceArgsRaw?.split(',').map(s => s.trim())

        if (field.type === NativeTypeEnum.ENUM) {
          dom = dom.ele('xs:element', {name: field.name, type: 'xs:string'}).up()
        } else if (field.type == NativeTypeEnum.STRUCT) {
          const name = braceArgs[0]
          if (field.comment === "type:STRUCT.POINTER") {
            dom = dom.ele('xs:element', {name: field.name})
              .ele('xs:complexType')
              .ele('xs:complexContent')
              .ele('xs:restriction', {base: 'xs:string'})
              .ele('xs:attribute', {name: 'type'})
              .up()
              .up()
              .up()
              .up()
              .up()
          } else if ([NativeTypeEnum.VEC4, NativeTypeEnum.VEC4V].includes(<NativeTypeEnum>name)) {
            dom = this.vector4Element(dom, field.name)
          } else if ([NativeTypeEnum.VEC3, NativeTypeEnum.VEC3V].includes(<NativeTypeEnum>name)) {
            dom = this.vector3Element(dom, field.name)
          } else if (name === NativeTypeEnum.VOID) {
            dom = dom.ele('xs:element', {name: field.name})
              .ele('xs:complexType')
              .ele('xs:complexContent')
              .ele('xs:restriction', {base: 'xs:string'})
              .ele('xs:attribute', {name: 'ref'})
              .up()
              .up()
              .up()
              .up()
              .up()
          } else {
            dom = dom.ele('xs:element', {name: field.name})
              .ele('xs:complexType')
              .ele('xs:complexContent')
            dom = XSDGenerator.extensionElement(dom, name)
              .up().up().up()
          }
        } else if (field.type == NativeTypeEnum.BITSET) {
          const name = braceArgs[0].split(' ')[1]
          dom = dom.ele('xs:element', {name: field.name})
            .ele('xs:complexType')
            .ele('xs:sequence')
            .ele('xs:element', {name: 'Item'})
            .ele('xs:complexType')
            .ele('xs:sequence')
          dom = XSDGenerator.extensionElement(dom, name)
            .up().up().up()
            .up().up().up()
        } else if (isBraced) {
          if (field.type === NativeTypeEnum.ARRAY) {
            const simpleTypes = [
              NativeTypeEnum.VOID,
              NativeTypeEnum.BOOL,
              NativeTypeEnum.UCHAR, NativeTypeEnum.CHAR,
              NativeTypeEnum.SHORT,
              NativeTypeEnum.STRING,
              NativeTypeEnum.FLOAT, NativeTypeEnum.FLOAT16,
              NativeTypeEnum.INT, NativeTypeEnum.UINT,
            ]
            if (simpleTypes.includes(<NativeTypeEnum>braceArgs[0])) {
              if (braceArgs[0] == NativeTypeEnum.FLOAT) {
                dom = XSDGenerator.floatElement(dom, field.name, 'xs:decimal')
              } else if (braceArgs[0] === NativeTypeEnum.UCHAR) {
                dom = XSDGenerator.floatElement(dom, field.name, 'xs:positiveInteger')
              } else if (braceArgs[0] === NativeTypeEnum.BOOL) {
                dom = XSDGenerator.booleanElement(dom)
              } else if (braceArgs[0] === NativeTypeEnum.VEC3) {
                dom = XSDGenerator.vector3Element(dom, 'Item')
              } else {
                dom = dom
                  .ele('xs:element', {name: field.name})
                  .ele('xs:complexType')
                  .ele('xs:sequence')
                  .ele('xs:element', {
                    name: 'Item',
                    type: XSDGenerator.enumTypeToXML(<NativeTypeEnum>braceArgs[0])
                  })
                  .up().up().up().up()
              }
            } else {
              const childStructParts = [...braceArgs[0]?.split(' ')]
              const childStructName = childStructParts[1] || childStructParts[0]

              dom = dom.ele('xs:element', {name: field.name})
                .ele('xs:complexType')
                .ele('xs:complexContent')

              if (childStructName === 'void') {
                dom = dom
                  .ele('xs:element', {name: 'Item'})
                  .ele('xs:complexType')
                  .ele('xs:complexContent')
                  .ele('xs:attribute', {name: 'ref', type: 'xs:string'}).up()
                  .up()
                  .up()
                  .up()
              } else if ([NativeTypeEnum.VEC2, NativeTypeEnum.VEC2V].includes(<NativeTypeEnum>childStructName)) {
                dom = XSDGenerator.vector2Element(dom)
              } else if ([NativeTypeEnum.VEC3, NativeTypeEnum.VEC3V].includes(<NativeTypeEnum>childStructName)) {
                dom = XSDGenerator.vector3Element(dom)
              } else if ([NativeTypeEnum.VEC4, NativeTypeEnum.VEC4V].includes(<NativeTypeEnum>childStructName)) {
                dom = XSDGenerator.vector4Element(dom)
              } else if (childStructName === NativeTypeEnum.USHORT) {
                dom = XSDGenerator.floatElement(dom, 'Item', childStructName)
              } else {
                dom = dom.ele('xs:element', {name: 'Item'})
                  .ele('xs:complexType')
                  .ele('xs:complexContent')
                dom = XSDGenerator.extensionElement(dom, childStructName)
                dom = dom.up().up().up()
              }

              dom = dom.ele('xs:restriction', {base: 'xs:string'})
                .ele('xs:attribute', {name: 'type'}).up()
                .up()
                .up().up().up()
            }
          }
        } else if (field.type === NativeTypeEnum.FLOAT || field.type === NativeTypeEnum.FLOAT16) {
          dom = dom.ele('xs:element', {name: field.name})
            .ele('xs:complexType')
            .ele('xs:complexContent')
            .ele('xs:restriction', {base: 'xs:decimal'})
            .ele('xs:attribute', {name: 'value'})
            .up()
            .up().up().up().up()
        } else if ([NativeTypeEnum.VEC4, NativeTypeEnum.VEC4V].includes(field.type)) {
          dom = this.vector4Element(dom, field.name)
        } else if ([NativeTypeEnum.VEC3, NativeTypeEnum.VEC3V].includes(field.type)) {
          dom = this.vector3Element(dom, field.name)
        } else if ([NativeTypeEnum.VEC2].includes(field.type)) {
          dom = this.vector2Element(dom, field.name)
        } else if ([NativeTypeEnum.UCHAR, NativeTypeEnum.USHORT].includes(field.type)) {
          dom = dom.ele('xs:element', {name: field.name})
            .ele('xs:complexType')
            .ele('xs:complexContent')
            .ele('xs:attribute', {name: 'value', type: 'xs:positiveInteger'}).up()
            .up().up().up()
        } else if ([NativeTypeEnum.UINT, NativeTypeEnum.UINT64].includes(field.type)) {
          dom = this.floatElement(dom, field.name, 'xs:hexBinary', 'value')
        } else if ([NativeTypeEnum.INT, NativeTypeEnum.INT64, NativeTypeEnum.CHAR].includes(field.type)) {
          dom = this.floatElement(dom, field.name, 'xs:integer', 'value')
        } else if (field.type === NativeTypeEnum.BOOL) {
          dom = dom.ele('xs:element', {name: field.name})
            .ele('xs:complexType')
            .ele('xs:complexContent')
            .ele('xs:attribute', {name: 'value', type: 'xs:boolean'}).up()
            .up().up().up()
        } else if (field.type === NativeTypeEnum.STRING) {
          dom = dom.ele('xs:element', {name: field.name, type: XSDGenerator.enumTypeToXML(field.type)})
        } else if (![NativeTypeEnum.MAP, NativeTypeEnum.MATRIX34, NativeTypeEnum.MATRIX34V].includes(field.type)) {
          // FIXME - These are not implemented yet
          console.dir(field)
          process.exit(1)
        }
      }
      return dom
    }

    natives.structs.forEach(struct => {
      // generate reusable type
      dom = dom.ele('xs:complexType', {name: struct.name})
        .ele('xs:sequence')
      Object.values(struct.fields).forEach((f) => dom = generateFieldElement(dom, f))
      dom = dom.up().up()
      // generate element
      dom = dom.ele('xs:element', {name: struct.name})
        .ele('xs:complexType')
        .ele('xs:complexContent')
      dom = XSDGenerator.extensionElement(dom, struct.name)
        .up().up().up();
    })

    natives.enums.forEach(enumData => {
      dom = dom.ele('xs:complexType', {name: enumData.name})
        .ele('xs:sequence')
      Object.keys(enumData).forEach((k) => {
        dom = dom.ele('xs:element', {name: k, type: "xs:positiveInteger"}).up()
      })
      dom = dom.up().up();
    })

    dom = dom.up()
    return dom;
  }
}

export default XSDGenerator;