const fs = require('fs');
const readline = require('readline');

const Docker = require('dockerode');

const { createContainer, startContainer, runCommandInContainer, copyFileToContainer } = require('./container.js');
const { simpleOpenAIRequest } = require('./openai.js');
const { applyCorrections } = require('./corrections.js');
const template = require('./prompt.js')

require('dotenv').config();

const baseImage = "node:latest";
const gptModel = "gpt-3.5-turbo";
const buildDirectory = "./build/";
const containerHome = "/app/";

// Intermediate build products.
const buildScriptPath = buildDirectory + "build.sh";
const environmentFilePath = buildDirectory + "build.env";
const projectFilePath = buildDirectory + "build.json";

// User input:

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

// Reading and writing files:

function createBuildDirectory() {
    if (!fs.existsSync(buildDirectory)) {
        fs.mkdirSync(buildDirectory);
    }
}

async function writeFile(path, contents) {
    await fs.promises.writeFile(path, contents);
    console.log(`Wrote ${path}.`);
}

async function readProjectFile() {
    const data = await fs.promises.readFile(buildDirectory + "build.json");
    return JSON.parse(data)
}

// Main script:

(async function () {

    let again = process.argv.includes('--again'); // Load metadata from a previous run.
    let offline = process.argv.includes('--offline'); // Skip OpenAI requests.
    let dryRun = process.argv.includes('--debug'); // Skip running the container.

    let description;
    let name;

    createBuildDirectory();

    // Detect metadata from a previous run.
    if (offline || again) {
        ({ description, name } = await readProjectFile());
    }

    if (!description || !name) {
        console.log("Let's cook up a new project!")
        description = await askQuestion("What would you like to make? ");
        name = await askQuestion("Repository name: ");
    }

    // Create the environment variables for the build script.
    const environment = [
        `REPO_NAME=${name}`,
        `REPO_DESCRIPTION=${description}`,
        `GIT_AUTHOR_EMAIL=${process.env.GIT_AUTHOR_EMAIL}`,
        `GIT_AUTHOR_NAME=${process.env.GIT_AUTHOR_NAME}`,
        `GITHUB_USERNAME=${process.env.GITHUB_USERNAME}`,
        `GITHUB_TOKEN=${process.env.GITHUB_TOKEN}`,
        `GITWIT_VERSION=${process.env.npm_package_version}`
    ];
    // The environment file is only used for debugging.
    await writeFile(environmentFilePath, environment.join("\n"));

    // Generate the project metadata file.
    const projectInfo = {
        name: name,
        description: description,
        generatorVersion: process.env.npm_package_version,
        gptModel: gptModel
    };
    await writeFile(projectFilePath, JSON.stringify(projectInfo))

    // Generate the build script using ChatGPT.
    if (!offline) {
        const prompt = template
            .replace("{DESCRIPTION}", description)
            .replace("{REPOSITORY_NAME}", name)
            .replace("{BASE_IMAGE}", baseImage);

        console.log("Calling on the great machine god...")
        let buildScript = await simpleOpenAIRequest(prompt, {
            model: gptModel
        })
        console.log("Prayers were answered.")

        buildScript = applyCorrections(buildScript.trim());
        await writeFile(buildScriptPath, buildScript)
    }

    // Create a new docker container.
    const docker = new Docker();
    const container = await createContainer(docker, baseImage, environment);
    console.log(`Container ${container.id} created.`);

    if (dryRun) {

        // This is how we can debug the build script interactively.
        console.log("Dry run, not starting container. To debug, run:");
        console.log("-----")
        console.log(`docker run --rm -it --env-file ${buildDirectory}build.env --entrypoint bash ${dockerTag}`)
        console.log(`source /app/create_github_repo.sh`)
        console.log("-----")

    } else {

        // Start the container, run the build scripts, and remove the container.

        await startContainer(container);
        console.log(`Container ${container.id} started.`);

        // Run the build scripts in the container.
        await runCommandInContainer(container, ["mkdir", containerHome])
        await copyFileToContainer(container, buildScriptPath, containerHome)
        await copyFileToContainer(container, "./create_github_repo.sh", containerHome)
        await runCommandInContainer(container, ["bash", containerHome + "create_github_repo.sh"])

        await container.stop();
        console.log(`Container ${container.id} stopped.`);

        await container.remove()
        console.log(`Container ${container.id} removed.`);
    }

})();