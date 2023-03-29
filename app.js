const fs = require('fs');
const readline = require('readline');
const { Configuration, OpenAIApi } = require('openai')
const Docker = require('dockerode');

const template = require('./prompt.js')
require('dotenv').config();

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

const baseImage = "node:latest";
const gptModel = "gpt-3.5-turbo";
const buildDirectory = "./build/";
const dockerTag = "gitwit:latest";

(async function () {

    let offline = process.argv.includes('--again');
    let dryRun = process.argv.includes('--debug');

    console.log("Let's cook up a new project!")

    let repoDescription;
    let repoName;

    if (offline) {
        const data = await fs.promises.readFile(buildDirectory + "build.json");
        const jsonData = JSON.parse(data)
        repoDescription = jsonData.description;
        repoName = jsonData.name;
    }
    if (!offline) {
        repoDescription = await askQuestion("What would you like to make? ");
        repoName = await askQuestion("Repository name: ");

        console.log("Calling on the great machine god...")

        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        })
        const openai = new OpenAIApi(configuration)

        const prompt = template
            .replace("{DESCRIPTION}", repoDescription)
            .replace("{REPOSITORY_NAME}", repoName)
            .replace("{BASE_IMAGE}", baseImage);

        const completion = await openai
            .createChatCompletion({
                model: gptModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            })
        console.log("Prayers were answered.")

        if (!fs.existsSync(buildDirectory)) {
            fs.mkdirSync(buildDirectory);
        }

        // What a hack! But small corrections like this will necessary for a while.
        let buildScript = completion.data.choices[0].message.content.trim();
        buildScript = buildScript
            .replaceAll(/^npx /mg, 'npx --yes ')
            .replaceAll(/^echo /mg, 'echo -e ')
            .replaceAll(/^git push .*$/mg, '')
            .replaceAll(/^git remote .*$/mg, '')
            .replaceAll(/^git commit -m "(.*)$/mg, 'git commit -m "👷🏼 $1')
            .replaceAll(/^git commit (.*)$/mg, 'git commit -a $1');

        fs.writeFile('build/build.sh', buildScript, (err) => {
            if (err) throw err;
            console.log('Wrote build.sh');
        });

    }

    // create a new docker client instance
    const docker = new Docker();

    console.log("Bulding Docker image...");

    // build a new image from the Dockerfile
    const buildStream = await docker.buildImage({
        context: '.',
        src: ['Dockerfile', 'create_github_repo.sh', buildDirectory + '/build.sh'],
    }, {
        t: dockerTag, // specify the tag for the image
        buildargs: {
            BASE_IMAGE: baseImage,
        }
    });

    await new Promise((resolve, reject) => {
        buildStream.on('data', (data) => {
            const stream = data.toString().trim().split("\r\n");
            stream.forEach(element => {
                const parsed = JSON.parse(element);
                if (parsed.stream) {
                    console.log(parsed.stream)
                }
                else if (parsed.error) {
                    console.log(parsed.error)
                    reject(parsed.error);
                }
            });
        });

        buildStream.on('end', () => {
            console.log('Build complete!');
            resolve();
        });
    });

    const environment = [
        `REPO_NAME=${repoName}`,
        `REPO_DESCRIPTION=${repoDescription}`,
        `GIT_AUTHOR_EMAIL=${process.env.GIT_AUTHOR_EMAIL}`,
        `GIT_AUTHOR_NAME=${process.env.GIT_AUTHOR_NAME}`,
        `GITHUB_USERNAME=${process.env.GITHUB_USERNAME}`,
        `GITHUB_TOKEN=${process.env.GITHUB_TOKEN}`,
        `GITWIT_VERSION=${process.env.npm_package_version}`
    ];

    // create a new container from the image
    const container = await docker.createContainer({
        Image: dockerTag, // specify the image to use
        Env: environment,
        Tty: true,
    });

    process.on('SIGINT', async function () {
        console.log("Caught interrupt signal");
        await container.stop({ force: true });
    });

    fs.writeFile(buildDirectory + '/build.env', environment.join("\n"), (err) => {
        if (err) throw err;
        console.log('Wrote build.env.');
    });

    const projectInfo = JSON.stringify({
        name: repoName,
        description: repoDescription,
        generatorVersion: process.env.npm_package_version,
        gptModel: gptModel
    });
    fs.writeFile(buildDirectory + '/build.json', projectInfo, (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });

    if (dryRun) {
        console.log("Dry run, not starting container");
        console.log(`docker run --rm -it --env-file ${buildDirectory} build.env --entrypoint bash ${dockerTag}`)
    }

    // start the container
    if (!dryRun) {
        await container.start();

        // wait for the container to finish running
        const stream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true
        });

        stream.on('data', chunk => console.log(chunk.toString()));

        stream.on('end', async () => {
            console.log('Container has stopped running');
            // cleanup the container when it's done
            await container.remove()
            console.log('Container removed');
            docker.getImage(dockerTag).remove((err, data) => {
                if (err) throw err;
                console.log("Image removed");
            });
        });
    }

})();