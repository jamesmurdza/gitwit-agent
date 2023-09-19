# GitWit Agent
<img src="https://github.com/jamesmurdza/gitwit-agent/assets/33395784/9d8d39b4-9471-4a87-8434-ac794dfd86fb" align="right" width="500" />

GitWit is a container-based agent specialized in making useful commits to git repositories. Given a description such as "implement dark mode" it either creates a repository or a branch on an existing repository (as requested) to make this feature.

Given there exist [a few agents](https://github.com/jamesmurdza/awesome-ai-devtools#pr-agents) with a similar purpose—**why is GitWit different?** GitWit interacts with the filesystem via shell and thus can run any command. It _writes code that writes code_. This makes it very flexible and repurposable for a number of interesting use cases.

This agent is also live for testing at [app.gitwit.dev](https://app.gitwit.dev) and has generated over 1000 repositories!

## How to run it

Before you start:
1. You need NodeJS (v18).
2. You need Docker.
3. The agent will access to your GitHub account via [personal access token](https://github.com/settings/tokens).
4. You need an [OpenAI API key](https://platform.openai.com/account/api-keys).

Setup:
1. `git clone https://github.com/jamesmurdza/gitwit && cd gitwit` to clone this repository.
2. `cp .env.example .env` to create a .env file. Update **GITHUB_USERNAME**, **GITHUB_TOKEN** and **OPENAI_API_KEY** with your values.
3. Start Docker! (GitWit creates a temporary Docker container for each run.) The easiest way to do this locally is with Docker Desktop. See here to connect to a remote docker server.
4. `docker pull node:latest` to download the base Docker image.
5. `run npm install` to install dependencies.

You are ready to go!

## Usage

The agent has two modes:
- Create new **repository**: Given a prompt and a repository name, spawn the repository
  
  https://github.com/gitwitdev/gitwitdev.github.io/assets/33395784/55537249-c301-4e13-84e5-0cdb06174071

- Create new **branch**: Given a prompt, an existing repository and a branch name, spawn the new branch

  https://github.com/gitwitdev/gitwitdev.github.io/assets/33395784/9315a17c-fc72-431a-a648-16ba42938faa

### Commands

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

## How it works

<img src="https://github.com/jamesmurdza/gitwit-agent/assets/33395784/c446337b-16bc-43ac-bc5d-483e6d92b048" alt="GitWit Architecture" width="400" />
<p><em>Overview of the system and its parts</em></p>

<img src="https://github.com/jamesmurdza/gitwit-agent/assets/33395784/800ffd71-27ed-40b2-8667-57ced6db39c6" alt="GitWit Agent" width="550" />
<p><em>Overview of the agentic process</em></p>
