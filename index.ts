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
import { newProjectPrompt, changeProjectPrompt } from "./prompt"
import { createGitHubRepo, addGitHubCollaborator, correctBranchName } from "./github"
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
  branchName: string
  description: string
  user?: string
  repositoryURL?: string
  completion: any | null = null
  buildScript: string | null = null
  gitHistory: string | null = null

  constructor({ name, branchName, user, description }: {
    name: string,
    branchName: string,
    user?: string,
    description: string
  }) {
    this.name = name
    this.branchName = branchName
    this.user = user
    this.description = description
  }

  private getCompletion = async (isBranch: boolean): Promise<Completion> => {
    // Generate the build script using ChatGPT.
    const prompt = (isBranch ? changeProjectPrompt : newProjectPrompt)
      .replace("{DESCRIPTION}", this.description)
      .replace("{REPOSITORY_NAME}", this.name)
      .replace("{BASE_IMAGE}", baseImage)
      .replace("{GIT_HISTORY}", this.gitHistory ?? "")

    console.log("Calling on the great machine god...")
    this.completion = await simpleOpenAIRequest(prompt, {
      model: gptModel,
      user: this.user
    })
    console.log("Prayers were answered.")
    return this.completion
  }

  buildAndPush = async (debug: boolean = false) => {

    const isBranch = this.branchName !== undefined
    const account = process.env.GITHUB_ORGNAME || process.env.GITHUB_USERNAME

    // Build directory
    const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gitwit-")) + "/"
    console.log(`Created temporary directory: ${buildDirectory}`)

    // Intermediate build products.
    const buildScriptPath = buildDirectory + "build.sh"
    const projectFilePath = buildDirectory + "info.json"

    const writeProjectFile = async () => {
      // Generate the project metadata file.
      const projectInfo = {
        repositoryName: this.name,
        description: this.description,
        generator: "GitWit",
        generatorVersion: packageInfo.version,
        gptModel: this.completion.model,
        completionId: this.completion.id,
        repositoryURL: this.repositoryURL,
        dateCreated: new Date().toISOString(),
      }
      await writeFile(projectFilePath, JSON.stringify(projectInfo, null, "\t"))
    };

    // If we're creating a new repository, call the OpenAI API already.
    if (!isBranch && !this.completion) {
      await this.getCompletion(isBranch)
    }

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

    if (isBranch) {
      this.repositoryURL = `https://github.com/${account}/${this.name}.git`
      console.log(`Using repository: ${this.repositoryURL}`)
    } else {
      // Create the GitHub repository.
      const repo: any = await createGitHubRepo(
        process.env.GITHUB_TOKEN!,
        this.name,
        this.description,
        process.env.GITHUB_ORGNAME
      )
      console.log(`Created repository: ${repo.html_url}`)
      // Add the user as a collaborator on the GitHub repository.
      if (repo.full_name && this.user) {
        const result = this.user ? await addGitHubCollaborator(
          process.env.GITHUB_TOKEN!,
          repo.full_name,
          this.user!
        ) : null
        console.log(`Added ${this.user} to ${repo.full_name}.`)
      }
      this.repositoryURL = repo.clone_url
    }

    const branchName = isBranch ? await correctBranchName(
      process.env.GITHUB_TOKEN!,
      `${account}/${this.name}`,
      this.branchName
    ) : "main"

    // Define the parameters used by the scripts.
    const parameters = {
      REPO_NAME: this.name,
      REPO_DESCRIPTION: this.description,
      REPO_URL: this.repositoryURL!,
      GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL!,
      GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME!,
      GITHUB_USERNAME: process.env.GITHUB_USERNAME!,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
      GITWIT_VERSION: packageInfo.version,
      BRANCH_NAME: branchName,
      GITHUB_ACCOUNT: account!,
      GIT_HISTORY: this.gitHistory ?? "",
    }

    // Create a new docker container.
    const container = await createContainer(docker, baseImage)
    console.log(`Container ${container.id} created.`)

    // Start the container.
    await startContainer(container)
    console.log(`Container ${container.id} started.`)

    // Copy the metadata file to the container.
    await runCommandInContainer(container, ["mkdir", containerHome])

    // These scripts are appended together to maintain the current directory.
    if (isBranch) {
      await runScriptInContainer(container,
        scripts.SETUP_GIT_CONFIG +  // Setup the git commit author
        scripts.CLONE_PROJECT_REPO,
        parameters);
      this.gitHistory = await runScriptInContainer(container,
        scripts.GET_GIT_HISTORY,
        parameters, true);

      // Now take the git history results and pass it to ChatGPT to get the buid script.
      await this.getCompletion(isBranch)
    }

    await writeProjectFile()
    await copyFileToContainer(container, projectFilePath, containerHome)

    // Generate the build script from the OpenAI completion.
    this.buildScript = applyCorrections(this.completion.text.trim())
    await writeFile(buildScriptPath, this.buildScript)
    await copyFileToContainer(container, buildScriptPath, containerHome)

    if (isBranch) {
      // Run the build script on a new branch, and push it to GitHub.
      await runScriptInContainer(container,
        scripts.CREATE_NEW_BRANCH +
        scripts.RUN_BUILD_SCRIPT +
        scripts.CD_GIT_ROOT +
        scripts.ADD_BUILD_LOGS +
        scripts.SETUP_GIT_CREDENTIALS +
        scripts.PUSH_BRANCH,
        parameters)
    } else {
      await runScriptInContainer(container,
        // Run the build script in an empty directory, and push the results to GitHub.
        scripts.SETUP_GIT_CONFIG +
        scripts.MAKE_PROJECT_DIR +
        scripts.RUN_BUILD_SCRIPT +
        scripts.CD_GIT_ROOT +
        scripts.ADD_BUILD_LOGS +
        scripts.SETUP_GIT_CREDENTIALS +
        scripts.PUSH_TO_REPO,
        parameters)
    }

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

    const githubURL = this.repositoryURL?.replace(/\.git$/, "")
    return {
      buildScript: this.buildScript,
      buildLog: "",
      repositoryURL: githubURL,
      branchURL: `${githubURL}/tree/${branchName}`,
    }
  }
}
