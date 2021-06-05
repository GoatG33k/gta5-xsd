import * as tslog from "tslog";
import {DumpParser} from "./DumpParser";
import * as path from "path";
import * as fs from "fs";
import XSDGenerator from "./XSDGenerator";

export const LOGGER = new tslog.Logger({
  displayFilePath: 'hidden',
  displayFunctionName: false,
  name: 'gta5-xsd'
})

const dumpsDir = path.resolve(__dirname, '..', 'dumps');

async function main(): Promise<void> {
  await Promise.all(
    [
      ["gta5.txt", "GTA5.xsd"],
      // ["rdr2.txt", "RDR2.xsd"]
    ].map(async ([filename, outFilename]) => {
      const dumpPath = path.resolve(dumpsDir, filename)
      const dumpData = fs.readFileSync(dumpPath, 'utf-8')
      
      DumpParser.build(dumpData).then(tree => {
        LOGGER.info(`generating XSD template for ${filename}...`)
        const xsd = XSDGenerator.generate(tree)
        LOGGER.info(`completed ${outFilename}!`)
        fs.writeFileSync(path.resolve(__dirname, '..', outFilename), xsd.toString())
      })
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    LOGGER.error(e)
    process.exit(1)
  })