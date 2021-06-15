import * as fs from "fs"
import * as path from "path"
import * as tslog from "tslog"
import * as ProgressBar from "progress"

import XSDGenerator from "./XSDGenerator"
import { DumpParser, ProgressState } from "./DumpParser"

export const LOGGER = new tslog.Logger({
  displayFilePath: "hidden",
  displayFunctionName: false,
  name: "gta5-xsd"
})

const dumpsDir = path.resolve(__dirname, "..", "dumps")

async function main(): Promise<void> {
  await Promise.all(
    [
      ["gta5.txt", "GTA5.xsd"]
      // ["rdr2.txt", "RDR2.xsd"]
    ].map(async ([filename, outFilename]) => {
      const dumpPath = path.resolve(dumpsDir, filename)
      const dumpData = fs.readFileSync(dumpPath, "utf-8")

      let progressBar = new ProgressBar(":step [:bar] (:current/:total)", {
        total: 0,
        complete: "=",
        incomplete: " ",
        width: 30
      })
      const stepNames = <{ [K in ProgressState]: string }>{
        [ProgressState.PARSE]: "Parsing Dump".padEnd(15),
        [ProgressState.RESOLVE]: "Load Structs".padEnd(15)
      }
      let stepName: string
      const natives = await DumpParser.build(
        dumpData,
        async (state, curr, total) => {
          stepName = stepNames[state]
          progressBar.total = total
          progressBar.curr = curr
          progressBar.tick({ step: stepName })
        }
      )

      progressBar.render({ step: stepName! })
      const totalElements = natives.enums.size + natives.structs.size + 1 // +1 for full DOM element
      progressBar.curr = 0
      progressBar.total = totalElements
      progressBar.render({ step: "Generate XSD".padEnd(15) })
      const xsd = XSDGenerator.compile(natives, () => {
        progressBar.tick()
      })
      fs.writeFileSync(
        path.resolve(__dirname, "..", outFilename),
        xsd.end({prettyPrint:true})
      )
      progressBar.terminate()
    })
  )
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    LOGGER.error(e)
    process.exit(1)
  })
