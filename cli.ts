import * as readline from "readline"
import * as fs from "fs"
import { Build } from "./lib/build"
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

export async function cli(): Promise<void> {
  if (!fs.existsSync("./build")) {
    fs.mkdirSync("./build")
  }

  const again = process.argv.includes("--again") // Use user input from the last run.
  const offline = process.argv.includes("--offline") // Use build script from the last run.
  const debug = process.argv.includes("--debug") // Leave the container running to debug.
  const branch = process.argv.includes("--branch")

  let userInput, suggestedName, sourceGitURL

  // Detect metadata from a previous run.
  if (offline || again) {
    ({ userInput, suggestedName, sourceGitURL } = JSON.parse(
      (await readFile("./build/info.json")).toString()
    ))
  }

  if (!userInput || !suggestedName) {
    if (branch) {
      sourceGitURL = await askQuestion("Source repository URL: ")
    } else {
      console.log("Let's cook up a new project!")
    }
    userInput = await askQuestion("What would you like to make? ")
    suggestedName = await askQuestion(branch ? "New branch name:" : "Repository name: ")
    await writeFile("./build/info.json", JSON.stringify({ userInput, suggestedName, sourceGitURL }))
  }

  let project = await Build.create({
    buildType: branch ? "BRANCH" : "REPOSITORY",
    suggestedName,
    userInput,
    creator: process.env.GITHUB_USERNAME!,
    sourceGitURL
  });

  if (offline) {
    const completionFile = await readFile("./build/completion.json");
    const infoFile = await readFile("./build/info.json");
    const text = completionFile.toString()
    const { id, model } = JSON.parse(infoFile.toString())
    project.completion = { text, id, model }
  }

  await project.buildAndPush({ debug })

  if (!offline) {
    let { text } = project.completion
    await writeFile("./build/completion.json", text!)
  }
}

// (async () => {
//   if (!fs.existsSync("./build")) {
//     fs.mkdirSync("./build")
//   }

//   const again = process.argv.includes("--again") // Use user input from the last run.
//   const offline = process.argv.includes("--offline") // Use build script from the last run.
//   const debug = process.argv.includes("--debug") // Leave the container running to debug.
//   const branch = process.argv.includes("--branch")

//   let userInput, suggestedName, sourceGitURL

//   // Detect metadata from a previous run.
//   if (offline || again) {
//     ({ userInput, suggestedName, sourceGitURL } = JSON.parse(
//       (await readFile("./build/info.json")).toString()
//     ))
//   }

//   if (!userInput || !suggestedName) {
//     if (branch) {
//       sourceGitURL = await askQuestion("Source repository URL: ")
//     } else {
//       console.log("Let's cook up a new project!")
//     }
//     userInput = await askQuestion("What would you like to make? ")
//     suggestedName = await askQuestion(branch ? "New branch name:" : "Repository name: ")
//     await writeFile("./build/info.json", JSON.stringify({ userInput, suggestedName, sourceGitURL }))
//   }

//   let project = await Build.create({
//     buildType: branch ? "BRANCH" : "REPOSITORY",
//     suggestedName,
//     userInput,
//     creator: process.env.GITHUB_USERNAME!,
//     sourceGitURL
//   });

//   if (offline) {
//     const completionFile = await readFile("./build/completion.json");
//     const infoFile = await readFile("./build/info.json");
//     const text = completionFile.toString()
//     const { id, model } = JSON.parse(infoFile.toString())
//     project.completion = { text, id, model }
//   }

//   await project.buildAndPush({ debug })

//   if (!offline) {
//     let { text } = project.completion
//     await writeFile("./build/completion.json", text!)
//   }
// })().catch((err) => {
//   console.error(err)
//   process.exit(1)
// })
