import * as readline from "readline"
import * as fs from "fs"
import { Project } from "./index"
import { writeFile, readFile } from "fs/promises"
import * as dotenv from "dotenv"

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

  const again = process.argv.includes("--again") // Use user input from the last run.
  const offline = process.argv.includes("--offline") // Use build script from the last run.
  const debug = process.argv.includes("--debug") // Leave the container running to debug.
  const branch = process.argv.includes("--branch")

  let description, repositoryName, branchName

  // Detect metadata from a previous run.
  if (offline || again) {
    ({ description, repositoryName, branchName } = JSON.parse(
      (await readFile("./build/info.json")).toString()
    ))
  }

  if (!description || !repositoryName) {
    console.log("Let's cook up a new project!")
    description = await askQuestion("What would you like to make? ")
    repositoryName = await askQuestion("Repository name: ")
    if (branch) {
      branchName = await askQuestion("New branch name: ")
    }
    await writeFile("./build/info.json", JSON.stringify({ description, repositoryName, branchName }))
  }

  let project = new Project(repositoryName, description)

  if (offline) {
    const completionFile = await readFile("./build/completion.json");
    const infoFile = await readFile("./build/info.json");
    const text = completionFile.toString()
    const { id, model } = JSON.parse(infoFile.toString())
    project.completion = { text, id, model }
  }

  await project.buildAndPush(branch, debug)

  if (!offline) {
    let { text } = project.completion
    await writeFile("./build/completion.json", text!)
  }
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
