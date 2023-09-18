# GitWit

This is the GitWit code generator.



## Setup

This project requires NodeJS and Docker to be installed.

To install dependencies run `npm install`.

Before running, copy .env.example to .env and add missing information.

## Examples

<details>
  <summary>Example 1: New repository 📼</summary>

  https://github.com/gitwitdev/gitwitdev.github.io/assets/33395784/55537249-c301-4e13-84e5-0cdb06174071
</details>
<details>
  <summary>Example 2: New branch 📼</summary>

  https://github.com/gitwitdev/gitwitdev.github.io/assets/33395784/9315a17c-fc72-431a-a648-16ba42938faa
</details>

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
