import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import Docker from 'dockerode'
import * as dotenv from "dotenv"

import {
  createContainer,
  startContainer,
  runCommandInContainer,
  copyFileToContainer,
} from "./container"
import { simpleOpenAIRequest } from "./openai"
import { applyCorrections } from "./corrections"
import { template } from "./prompt"
import { createGitHubRepo } from "./github"
import { gitScript } from "./git"

dotenv.config()

// Container constants:
const baseImage = "node:latest"
const containerHome = "/app/"

// OpenAI constants:
const gptModel = "gpt-3.5-turbo"

// Reading and writing files:
async function writeFile(path: string, contents: string): Promise<void> {
  await fs.promises.writeFile(path, contents)
  console.log(`Wrote ${path}.`)
}

// Project generation
export class Project {
  name: string
  description: string
  user?: string
  environment: string[]
  projectInfo: any
  completion: string | null
  buildScript: string | null

  constructor(name: string, description: string, user?: string) {
    this.name = name
    this.user = user
    this.description = description

    // Create the environment variables for the build script.
    this.environment = [
      `REPO_NAME=${name}`,
      `REPO_DESCRIPTION=${description}`,
      `GIT_AUTHOR_EMAIL=${process.env.GIT_AUTHOR_EMAIL}`,
      `GIT_AUTHOR_NAME=${process.env.GIT_AUTHOR_NAME}`,
      `GITHUB_USERNAME=${process.env.GITHUB_USERNAME}`,
      `GITHUB_ORGNAME=${process.env.GITHUB_ORGNAME || process.env.GITHUB_USERNAME}`,
      `GITHUB_TOKEN=${process.env.GITHUB_TOKEN}`,
      `GITWIT_VERSION=${process.env.npm_package_version}`,
    ]
    this.projectInfo = {
      name: this.name,
      description: this.description,
      generatorVersion: process.env.npm_package_version,
      gptModel: gptModel,
    }

    this.completion = null
    this.buildScript = null
  }

  getCompletion = async () => {
    // Generate the build script using ChatGPT.
    const prompt = template
      .replace("{DESCRIPTION}", this.description)
      .replace("{REPOSITORY_NAME}", this.name)
      .replace("{BASE_IMAGE}", baseImage)

    console.log("Calling on the great machine god...")
    this.completion = await simpleOpenAIRequest(prompt, {
      model: gptModel,
      user: this.user
    })
    console.log("Prayers were answered.")
    return { completion: this.completion }
  }

  buildAndPush = async (username?: string, debug: boolean = false) => {
    const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gitwit-")) + "/"
    console.log(`Created temporary directory: ${buildDirectory}`)

    // Intermediate build products.
    const buildScriptPath = buildDirectory + "build.sh"
    const environmentFilePath = buildDirectory + "build.env"
    const projectFilePath = buildDirectory + "build.json"

    // The environment file is only used for debugging.
    await writeFile(environmentFilePath, this.environment.join("\n"))

    // Generate the project metadata file.
    await writeFile(projectFilePath, JSON.stringify(this.projectInfo))

    // Generate the build script from the OpenAI completion.
    this.buildScript = applyCorrections(this.completion!.trim())
    await writeFile(buildScriptPath, this.buildScript)

    // Connect to Docker...
    console.log(
      "Connecting to Docker on "
      + (process.env.DOCKER_HOST ?? "localhost")
      + (process.env.DOCKER_PORT ? `:${process.env.DOCKER_PORT}` : "")
    );
    const docker = new Docker({
      host: process.env.DOCKER_HOST,
      port: process.env.DOCKER_PORT,
      ca: process.env.DOCKER_CA,
      cert: process.env.DOCKER_CERT,
      key: process.env.DOCKER_KEY,
      protocol: process.env.DOCKER_KEY ? 'https' : undefined,
    })

    // Create a new docker container.
    const container = await createContainer(docker, baseImage, this.environment)
    console.log(`Container ${container.id} created.`)

    // Create the GitHub repository.
    const result: any = await createGitHubRepo(
      process.env.GITHUB_TOKEN!,
      this.name,
      this.description,
      process.env.GITHUB_ORGNAME
    )
    if (result.html_url) {
      console.log(`Created repository: ${result.html_url}`)
    }

    // Start the container.
    await startContainer(container)
    console.log(`Container ${container.id} started.`)

    // Move the build scripts to the container.
    await runCommandInContainer(container, ["mkdir", containerHome])
    await copyFileToContainer(container, buildScriptPath, containerHome)
    await writeFile(buildDirectory + "gitwit.sh", gitScript)
    await copyFileToContainer(container, buildDirectory + "gitwit.sh", containerHome)

    if (debug) {
      // This is how we can debug the build script interactively.
      console.log("The container is still running!")
      console.log("To debug, run:")
      console.log("-----")
      console.log(`docker exec --env-file ${buildDirectory}build.env -it ${container.id} bash`)
      console.log(`source /app/gitwit.sh`)
      console.log("-----")

      process.exit()
    } else {
      // Move the build script in the container.
      await runCommandInContainer(container, ["bash", containerHome + "gitwit.sh"])

      // Stop and remove the container.
      await container.stop()
      console.log(`Container ${container.id} stopped.`)
      await container.remove()
      console.log(`Container ${container.id} removed.`)
    }

    return {
      buildScript: this.buildScript,
      buildLog: "",
      repositoryURL: result.html_url,
    }
  }
}
