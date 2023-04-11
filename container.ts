import * as path from 'path';
import * as tar from 'tar';
import * as Docker from 'dockerode';

async function createContainer(docker: Docker, tag: string, environment?: string[]): Promise<Docker.Container> {
  // create a new container from the image
  return await docker.createContainer({
    Image: tag, // specify the image to use
    Env: environment ?? [],
    Tty: true,
    Cmd: ['/bin/sh'],
    OpenStdin: true,
  });
}

async function startContainer(container: Docker.Container) {
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

async function waitForStreamEnd(stream: NodeJS.ReadableStream): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      stream.on('end', async () => {
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function runCommandInContainer(container: Docker.Container, command: string[], silent: boolean = false): Promise<string> {
  const exec = await container.exec({
    Cmd: command,
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ hijack: true, stdin: true });
  let output = "";
  stream.on('data', (data) => {
    output += data;
  });
  await waitForStreamEnd(stream);
  if (!silent) console.log(output);
  return output;
}

async function runScriptInContainer(container: Docker.Container, script: string, parameters: { [key: string]: string }, silent: boolean = false) {
  // Substitutes values in the template string.
  const replaceParameters = (templateString: string, parameters: { [key: string]: string }): string => {
    return Object.keys(parameters).reduce(
      (acc, key) => acc.replaceAll(`{${key}}`, parameters[key] ?? ""),
      templateString
    );
  };

  // Run the given script as a bash script.
  const result = await runCommandInContainer(container, ["bash", "-c", replaceParameters(script, parameters)], silent)
  return result;
}

async function copyFileToContainer(container: Docker.Container, localFilePath: string, containerFilePath: string) {
  const baseDir = path.dirname(localFilePath);
  const archive = tar.create({ gzip: false, portable: true, cwd: baseDir }, [path.basename(localFilePath)]);
  await container.putArchive(archive, { path: containerFilePath });
}

export { createContainer, startContainer, runCommandInContainer, runScriptInContainer, copyFileToContainer }
