const { Configuration, OpenAIApi } = require('openai')
const template = require('./prompt.js')
require('dotenv').config();
const fs = require('fs');
const Docker = require('dockerode');
const readline = require('readline');

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

(async function () {

    console.log("Let's cook up a new project!")
    const description = await askQuestion("What would you like to make? ");
    const repoName = await askQuestion("Repository name: ");
    const baseImage = "node:latest";

    console.log("Calling on the great machine god...")

    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)

    const prompt = template
        .replace("{DESCRIPTION}", description)
        .replace("{REPOSITORY_NAME}", repoName)
        .replace("{BASE_IMAGE}", baseImage);

    const completion = await openai
        .createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        })
    console.log("Prayers were answered.")

    // What a hack! But small corrections like this will necessary for a while.
    let buildScript = completion.data.choices[0].message.content.trim();
    buildScript = buildScript
        .replaceAll(/^npx /mg, 'npx --yes ')
        .replaceAll(/^echo /mg, 'echo -e ')
        .replaceAll(/^git push .*$/mg, '')
        .replaceAll(/^git commit -m "(.*)$/mg, 'git commit -m "👷🏼 $1')
        .replaceAll(/^git commit (.*)$/mg, 'git commit -a $1');

    fs.writeFile('build.sh', buildScript, (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });

    // create a new docker client instance
    const docker = new Docker();

    console.log("Bulding Docker image...");

    // build a new image from the Dockerfile
    const buildStream = await docker.buildImage({
        context: '.',
        src: ['Dockerfile', 'create_github_repo.sh', 'build.sh', '.env'],
    }, {
        t: 'clonegpt:latest', // specify the tag for the image
        buildargs: {
            BASE_IMAGE: baseImage,
        }
    });

    let imageId = '';

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

    // create a new container from the image
    const container = await docker.createContainer({
        Image: 'clonegpt:latest', // specify the image to use
        Env: [
            `REPO_NAME=${repoName}`,
            `REPO_DESCRIPTION=${description}`,
        ],
        Tty: true,
    });

    process.on('SIGINT', async function () {
        console.log("Caught interrupt signal");
        await container.stop({ force: true });
    });

    // start the container
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
        docker.getImage('clonegpt:latest').remove((err, data) => {
            if (err) throw err;
            console.log("Image removed");
        });
    });

})();