# GitWit

This is the GitWit code generator.

<img src="./images/architecture.png" alt="Project architecture" height="350px"/>

## Setup

This project requires NodeJS and Docker to be installed.

To install dependencies run `npm install`.

Before running, copy .env.example to .env and add missing information.

## Usage

Start:

`npm run start`

Start with the same parameters as the last run:

`npm run start -- --again`

Start with the same parameters as the last run, and the same build script:

`npm run start -- --offline`

Debug mode, enables entering the container to look for problems:

`npm run start -- --debug`

If an issue occurs, it's possible to run again in debug mode with the same build script:

`npm run start -- --offline --debug`

## Notes

Some notes:
- Using JavaScript—ideally would use TypeScript.
- Copies a shell script into the container to configure git and pushing the repository, but it might be better to run the commands using `runCommandInContainer() `instead.
- The `GITHUB_TOKEN` environment variable is set when running arbitrary code, which is a vulnerability.