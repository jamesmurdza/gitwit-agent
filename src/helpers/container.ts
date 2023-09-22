import * as path from 'path';
import * as tar from 'tar';
import * as Docker from 'dockerode';

const cleanOutput = (textInput: string) => {
  return textInput
    .replace(/[^\x00-\x7F]+/g, "") // Remove non-ASCII characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, "") // Remove ASCII control characters
}

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
  return cleanOutput(output);
}

async function runScriptInContainer(container: Docker.Container, script: string, parameters: { [key: string]: string }, silent: boolean = false) {
  // Substitutes values in the template string.
  const replaceParameters = (templateString: string, parameters: { [key: string]: string }): string => {
    return Object.keys(parameters).reduce(
      (acc, key) => acc.replace(new RegExp(`{${key}}`, "g"), parameters[key] ?? ""),
      templateString
    );
  };

  // Run the given script as a bash script.
  const result = await runCommandInContainer(container, ["bash", "-c", replaceParameters(script, parameters)], silent)
  return result;
}

async function readFileFromContainer(container: Docker.Container, path: string) {
  return await runCommandInContainer(container, ["cat", path], true)
}

async function copyFileToContainer(container: Docker.Container, localFilePath: string, containerFilePath: string) {
  const baseDir = path.dirname(localFilePath);
  const archive = tar.create({ gzip: false, portable: true, cwd: baseDir }, [path.basename(localFilePath)]);
  await container.putArchive(archive, { path: containerFilePath });
}

export { createContainer, startContainer, runCommandInContainer, runScriptInContainer, copyFileToContainer, readFileFromContainer }
