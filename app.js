const Docker = require('dockerode');

const repoName = "new-repo-5";
const description = "ReactJS app with a countdown timer";
const baseImage = "node:latest";

(async function () {

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
        await container.remove();
        console.log('Container removed');
    });

})();