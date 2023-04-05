import fetch from "node-fetch"

function errorMessage(result: any) {
  if (result.errors) {
    let message = `${result.message}`;
    for (const error of result.errors) {
      message += ` ${error.resource} ${error.message}.`;
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
    console.log(message)
    return false;
  }

  return result;
}

export { createGitHubRepo }
