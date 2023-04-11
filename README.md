# GitWit

This is the GitWit code generator.

<img src="./images/architecture.png" alt="Project architecture" height="350px"/>

## Setup

This project requires NodeJS and Docker to be installed.

To install dependencies run `npm install`.

Before running, copy .env.example to .env and add missing information.

## Usage

Generate a new GitHub repository:

`npm run start`

Generate a repository with the same name and description as the last run:

`npm run start -- --again`

Generate a repository with the same name, description, and build script as the last run:

`npm run start -- --offline`

Debug the build script from the last run:

`npm run start -- --offline --debug`

Generate a new branch on an existing repository:

`npm run start -- --branch`

Generate a new branch with the same name and description as the last run:

`npm run start -- --branch --again`
