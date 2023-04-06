import fetch from "node-fetch"

function errorMessage(result: any) {
  if (result.message) {
    let message = `${result.message}`;
    if (result.errors) {
      for (const error of result.errors) {
        message += ` ${error.resource} ${error.message}.`;
      }
    }
    return message;
  }
  return undefined;
}

function incrementName(name: string) {
  const regex = /\-(\d+)$/;
  const match = name.match(regex);
  if (match) {
    const number = parseInt(match[1]);
    return name.replace(regex, `-${number + 1}`);
  } else {
    return `${name}-1`;
  }
}

async function createGitHubRepo(token: string, name: string, description: string, org?: string, attempts: number = 10) {
  let failedAttempts = 0;
  let currentName = name;
  let result = null;

  // Try new names until we find one that doesn't exist, or we run out of attempts.
  while (failedAttempts < attempts) {

    // Request to the GitHub API.
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: currentName,
        description: description,
        private: true
      })
    };

    // Create the repo at username/repo or org/repo.
    const response = org
      ? await fetch(`https://api.github.com/orgs/${org}/repos`, requestOptions)
      : await fetch('https://api.github.com/user/repos', requestOptions);
    result = await response.json();

    // If the repo already exists, add a number to the end of the name.
    if (result.errors && result.errors[0].field === "name") {
      console.log(`Repository name already exists. Trying ${currentName}.`)
      failedAttempts++
      currentName = incrementName(currentName);
    } else {
      break;
    }
  }

  // Throw an error if repository creation failed.
  const message = errorMessage(result);
  if (message) {
    throw new Error(message)
  }

  return result;
}

async function addGitHubCollaborator(token: string, repoName: string, collaborator: string) {
  // Add collaborator to the repo.
  // Note: Repo name is in the format of "org/repo".
  const requestOptions = {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      permission: 'push'
    })
  };

  const response = await fetch(`https://api.github.com/repos/${repoName}/collaborators/${collaborator}`, requestOptions);
  if (response.status === 204) {
    return true;
  } else {
    const result = await response.json();
    // Print errors if there are any.
    const message = errorMessage(result);
    if (message) {
      throw new Error(message)
      return false;
    }
    return result;
  }
}

export { createGitHubRepo, addGitHubCollaborator }
