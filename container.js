const tar = require('tar');
const path = require('path');

async function createContainer(docker, tag, environment) {
    // create a new container from the image
    return await docker.createContainer({
        Image: tag, // specify the image to use
        Env: environment,
        Tty: true,
        Cmd: ['/bin/sh'],
        OpenStdin: true,
    });
}

async function startContainer(container) {
    process.on('SIGINT', async function () {
        console.log("Caught interrupt signal");
        await container.stop({ force: true });
    });
    await container.start();
    const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true
    });
    stream.on('data', chunk => console.log(chunk.toString()));
    return stream;
}

async function waitForStreamEnd(stream) {
    return new Promise(async (resolve, reject) => {
        try {
            stream.on('end', async () => {
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    });
}

async function runCommandInContainer(container, command) {
    const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
    });
    const stream = await exec.start({ hijack: true, stdin: true });
    stream.on('data', (data) => {
        console.log(`Command output: ${data}`);
    });
    await waitForStreamEnd(stream);
}

async function copyFileToContainer(container, localFilePath, containerFilePath) {
    const baseDir = path.dirname(localFilePath);
    const archive = tar.create({ gzip: false, portable: true, cwd: baseDir }, [path.basename(localFilePath)]);
    await container.putArchive(archive, { path: containerFilePath });
}

module.exports = {
    createContainer,
    startContainer,
    runCommandInContainer,
    copyFileToContainer
}