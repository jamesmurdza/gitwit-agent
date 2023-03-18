const template = `
Help me to make: 
- {DESCRIPTION}

The project name is: {REPOSITORY_NAME}

Give me instructions to do this, but use only shell commands. No need to give further explanation. All of your output should be given as a single bash script.

For example, when want to edit a file, use the command \`echo "file contents" > filename.ext\`.

At the beginning of the script, create a git repo before running any other commands. Then, create a .gitignore file.

Assume all commands will be run on a clean \`{BASE_IMAGE}\` system with no packages installed. If you need to install a package, use the appropriate command such as \`apt-get install\`, \`npm install\`, etc.

Follow each command in the instructions with a git commit command including a detailed commit message. Follow each file change in the instructions with a git commit command including a detailed commit message.

Do not include any commands to run or start the app. Do not include any commands to test the app.

Do not use an exit command at the end of the script.
`;
module.exports = template;