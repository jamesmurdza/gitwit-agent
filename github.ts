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
    const number = parseInt(match[1]!);
    return name.replace(regex, `-${number + 1}`);
  } else {
    return `${name}-1`;
  }
}

interface GitHubRepoOptions {
  token: string;
  name: string;
  description: string;
  org?: string;
  template?: { repository: string, owner: string }
  attempts?: number;
}

async function createGitHubRepo({ token, name, description, org, template, attempts = 10 }: GitHubRepoOptions) {
  let failedAttempts = 0;
  let currentName = name;
  let result: any = {};

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
        description: description.replace(/\n/g, "").trim().slice(0, 350),
        private: true,
        // If generating from a template and owner is an organization, specify the owner.
        ...(template && org && { owner: org })
      })
    };

    // Create the repo at username/repo or org/repo.
    const response = template
      // Generate from a template repository:
      ? await fetch(`https://api.github.com/repos/${template.owner}/${template.repository}/generate`, requestOptions)
      // Create a new repository:
      : org
        ? await fetch(`https://api.github.com/orgs/${org}/repos`, requestOptions)
        : await fetch('https://api.github.com/user/repos', requestOptions);
    result = await response.json() ?? {};

    // If the repo already exists, add a number to the end of the name.
    const alreadyExists = (errors: any) => errors
      && errors[0].field === "name" // When creating a new repository.
      || errors[0].includes("already exists") // When generating from a template.
    if (result.errors && alreadyExists(result.errors)) {
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
    console.log(result)
    throw new Error("Failed to create repository: " + message)
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
  if (response.status === 204) { // TODO Does this work? Stumbled in the past upon systems that were returning simply a 200 for creation, instead of 204. Myabe better to check for general success of 2xx?
    return true;
  } else {
    const result = await response.json();
    // Print errors if there are any.
    const message = errorMessage(result);
    if (message) {
      console.log(result);
      throw new Error("Failed to add collaborator: " + message)
    }
    return result;
  }
}

async function getGitHubBranches(token: string, repository: string): Promise<any[]> {
  // Add collaborator to the repo.
  // Note: Repo name is in the format of "org/repo".
  const requestOptions = {
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await fetch(`https://api.github.com/repos/${repository}/branches`, requestOptions);
  if (response.status === 204) {
    return [];
  } else {
    const result = await response.json();
    // Print errors if there are any.
    const message = errorMessage(result);
    if (message) {
      console.log(result)
      throw new Error("Failed to get branches: " + message)
    }
    return <any[]>result;
  }
}

async function correctBranchName(token: string, sourceRepository: string, branchName: string) {
  const branches = await getGitHubBranches(process.env.GITHUB_TOKEN!, sourceRepository)
  const branchNames = branches.map((branch) => branch.name)
  var correctedName = branchName
  while (branchNames.includes(correctedName)) {
    correctedName = incrementName(correctedName)
  }
  return correctedName;
}

export { createGitHubRepo, addGitHubCollaborator, getGitHubBranches, correctBranchName }
