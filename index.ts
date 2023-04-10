import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import Docker from 'dockerode'
import * as dotenv from "dotenv"
import packageInfo from './package.json';

import {
  createContainer,
  startContainer,
  runCommandInContainer,
  runScriptInContainer,
  copyFileToContainer,
} from "./container"
import { simpleOpenAIRequest, Completion } from "./openai"
import { applyCorrections } from "./corrections"
import { template } from "./prompt"
import { createGitHubRepo, addGitHubCollaborator } from "./github"
import * as scripts from "./scripts"

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
  completion: any | null = null
  buildScript: string | null = null

  constructor(name: string, description: string, user?: string) {
    this.name = name
    this.user = user
    this.description = description
  }

  getCompletion = async (): Promise<Completion> => {
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
    return this.completion
  }

  buildAndPush = async (username?: string, debug: boolean = false) => {
    const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gitwit-")) + "/"
    console.log(`Created temporary directory: ${buildDirectory}`)

    // Intermediate build products.
    const buildScriptPath = buildDirectory + "build.sh"
    const projectFilePath = buildDirectory + "info.json"

    // Generate the build script from the OpenAI completion.
    this.buildScript = applyCorrections(this.completion.text.trim())
    await writeFile(buildScriptPath, this.buildScript)

    // Connect to Docker...
    console.log(
      "Connecting to Docker on "
      + (process.env.DOCKER_API_HOST ?? "localhost")
      + (process.env.DOCKER_API_PORT ? `:${process.env.DOCKER_API_PORT}` : "")
    );
    const docker = new Docker({
      host: process.env.DOCKER_API_HOST,
      port: process.env.DOCKER_API_PORT,
      // Flightcontrol doesn't support environment variables with newlines.
      ca: process.env.DOCKER_API_CA?.replace(/\\n/g, "\n"),
      cert: process.env.DOCKER_API_CERT?.replace(/\\n/g, "\n"),
      key: process.env.DOCKER_API_KEY?.replace(/\\n/g, "\n"),
      // We use HTTPS when there is an SSL key.
      protocol: process.env.DOCKER_API_KEY ? 'https' : undefined,
    })

    // Create the GitHub repository.
    const repo: any = await createGitHubRepo(
      process.env.GITHUB_TOKEN!,
      this.name,
      this.description,
      process.env.GITHUB_ORGNAME
    )
    console.log(`Created repository: ${repo.html_url}`)

    // Generate the project metadata file.
    const projectInfo = {
      repositoryName: this.name,
      description: this.description,
      generator: "GitWit",
      generatorVersion: packageInfo.version,
      gptModel: this.completion.model,
      completionId: this.completion.id,
      repositoryURL: repo.clone_url,
      dateCreated: new Date().toISOString(),
    }
    await writeFile(projectFilePath, JSON.stringify(projectInfo, null, "\t"))

    // Create a new docker container.
    const container = await createContainer(docker, baseImage)
    console.log(`Container ${container.id} created.`)

    // Add the user as a collaborator on the GitHub repository.
    if (repo.full_name && username) {
      const result = username ? await addGitHubCollaborator(
        process.env.GITHUB_TOKEN!,
        repo.full_name,
        username!
      ) : null
      console.log(`Added ${username} to ${repo.full_name}.`)
    }

    // Start the container.
    await startContainer(container)
    console.log(`Container ${container.id} started.`)

    // Move the build script to the container.
    await runCommandInContainer(container, ["mkdir", containerHome])
    await copyFileToContainer(container, buildScriptPath, containerHome)
    await copyFileToContainer(container, projectFilePath, containerHome)

    // Define the parameters used by the scripts.
    const parameters = {
      REPO_NAME: this.name,
      REPO_DESCRIPTION: this.description,
      REPO_URL: repo.clone_url,
      GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL!,
      GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME!,
      GITHUB_USERNAME: process.env.GITHUB_USERNAME!,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
      GITWIT_VERSION: packageInfo.version,
    }

    // These scripts are run together to maintain the current directory.
    await runScriptInContainer(container,
      scripts.SETUP_GIT_CONFIG +  // Setup the git commit author
      scripts.MAKE_PROJECT_DIR +  // Create an empty project directory.
      scripts.RUN_BUILD_SCRIPT +  // Run the build script.
      scripts.CD_GIT_ROOT +
      scripts.ADD_BUILD_LOGS +    // Add build log and push to GitHub.
      scripts.SETUP_GIT_CREDENTIALS +
      scripts.PUSH_TO_REPO,
      parameters)

    if (debug) {
      // This is how we can debug the build script interactively.
      console.log("The container is still running!")
      console.log("To debug, run:")
      console.log("-----")
      console.log(`docker exec -it ${container.id} bash`)
      console.log("-----")

      // If we don't this, the process won't end because the container is running.
      process.exit()
    } else {
      // Stop and remove the container.
      await container.stop()
      console.log(`Container ${container.id} stopped.`)
      await container.remove()
      console.log(`Container ${container.id} removed.`)
    }

    return {
      buildScript: this.buildScript,
      buildLog: "",
      repositoryURL: repo.html_url,
    }
  }
}
