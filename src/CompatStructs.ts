import {XMLBuilder} from "xmlbuilder2/lib/interfaces";

class CompatStructs {
  public static inject(dom:XMLBuilder): XMLBuilder {
    // <rockstar>
    dom = dom.ele('xs:element', {name:'rockstar'})
      .ele('xs:complexType')
      .ele('xs:sequence')
      .ele('xs:element', {name: 'name', type:'xs:string'}).up()
      .ele('xs:element', {name:'id', type:'xs:nonNegativeInteger'}).up()
      .ele('xs:element', {name:'BodyBuoyancyMultiplier', type:'xs:decimal'}).up()
      .ele('xs:element', {name:'DragMultiplier', type:'xs:decimal'}).up()
      .ele('xs:element', {name:'WeightBeltMultiplier', type:'xs:decimal'}).up()
      .up() // </xs:sequence>
      .ele('xs:attribute', {name:'master_version', type:'xs:nonNegativeInteger'}).up()
      .ele('xs:attribute', {name:'representation_version', type:'xs:nonNegativeInteger'}).up()
      .up() // </xs:complexType>
      .up() // </xs:element>
    // </rockstar>
      
    return dom
  }
}

export default CompatStructs;