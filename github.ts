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

async function createGitHubRepo(token: string, name: string, description: string, org?: string) {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name,
      description: description,
      private: true
    })
  };
  const response = org
    ? await fetch(`https://api.github.com/orgs/${org}/repos`, requestOptions)
    : await fetch('https://api.github.com/user/repos', requestOptions);
  const result = await response.json();

  // Print errors if there are any.
  const message = errorMessage(result);
  if (message) {
    throw new Error(message)
    return false;
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
