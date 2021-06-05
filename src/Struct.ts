import {StructData, StructPropertyData} from "./types";
import StructProperty from "./StructProperty";

class Struct implements StructData {
  public readonly name: string;
  public readonly parent?: string;
  public readonly fields: { [key: string]: StructProperty };

  constructor(data: StructData) {
    this.name = data.name
    this.parent = data.parent
    this.fields = data.fields
  }
}

export default Struct;