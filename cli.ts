import * as readline from "readline"
import * as fs from "fs"
import { Project } from "./index"
import { writeFile, readFile } from "fs/promises"

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    })
  )
}

(async () => {
  if (!fs.existsSync("./build")) {
    fs.mkdirSync("./build")
  }

  let again = process.argv.includes("--again") // Use user input from the last run.
  let offline = process.argv.includes("--offline") // Use build script from the last run.
  let debug = process.argv.includes("--debug") // Leave the container running to debug.

  let description, repositoryName

  // Detect metadata from a previous run.
  if (offline || again) {
    ({ description, repositoryName } = JSON.parse(
      (await readFile("./build/info.json")).toString()
    ))
  }

  if (!description || !repositoryName) {
    console.log("Let's cook up a new project!")
    description = await askQuestion("What would you like to make? ")
    repositoryName = await askQuestion("Repository name: ")
    await writeFile("./build/info.json", JSON.stringify({ description, repositoryName }))
  }

  let project = new Project(repositoryName, description)

  if (offline) {
    const completionFile = await readFile("./build/completion.json");
    const infoFile = await readFile("./build/info.json");
    const text = completionFile.toString()
    const { id, model } = JSON.parse(infoFile.toString())
    project.completion = { text, id, model }
  } else {
    let { text } = await project.getCompletion()
    await writeFile("./build/completion.json", text!)
  }

  let { buildScript, buildLog, repositoryURL } = await project.buildAndPush(undefined, debug)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
