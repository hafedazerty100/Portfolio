/**
 * GitHubAPI — Client-side REST API wrapper for updating data/config.json directly on GitHub Pages
 */

export class StaleCommitConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StaleCommitConflictError';
  }
}

/**
 * Fetches current metadata (including current blob SHA) of data/config.json from GitHub
 */
export async function getFileMetadata(owner, repo, path = 'data/config.json', branch = 'main', patToken) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Cache-Control': 'no-cache'
  };

  if (patToken) {
    headers['Authorization'] = `Bearer ${patToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository file '${path}' not found at ${owner}/${repo} (Branch: ${branch}). Check repo settings & PAT permissions.`);
    }
    if (response.status === 401) {
      throw new Error(`Unauthorized (401): Personal Access Token is invalid or expired.`);
    }
    throw new Error(`GitHub API Error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  return { sha: data.sha, download_url: data.download_url };
}

/**
 * Encodes Unicode string safely to Base64
 */
function utf8ToBase64(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode('0x' + p1);
  }));
}

/**
 * Commits updated config JSON file to GitHub repository via Contents API
 */
export async function publishConfigToGitHub({ owner, repo, path = 'data/config.json', branch = 'main', patToken, configData, currentSha }) {
  if (!patToken) {
    throw new Error('Personal Access Token (PAT) is required to publish changes.');
  }
  if (!owner || !repo) {
    throw new Error('Repository Owner and Repository Name must be configured.');
  }

  let shaToUse = currentSha;

  // If SHA was not provided, fetch current metadata first
  if (!shaToUse) {
    const meta = await getFileMetadata(owner, repo, path, branch, patToken);
    shaToUse = meta.sha;
  }

  const jsonString = JSON.stringify(configData, null, 2);
  const contentBase64 = utf8ToBase64(jsonString);

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const bodyData = {
    message: `Admin update site configuration [${new Date().toISOString()}]`,
    content: contentBase64,
    sha: shaToUse,
    branch: branch
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${patToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyData)
  });

  if (response.status === 409) {
    throw new StaleCommitConflictError(
      'Someone published a newer version of the configuration since you loaded this session. Remote SHA does not match.'
    );
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || response.statusText;
    } catch (e) {
      errorDetail = response.statusText;
    }
    throw new Error(`Publish failed (${response.status}): ${errorDetail}`);
  }

  const responseData = await response.json();
  return {
    success: true,
    newSha: responseData.content ? responseData.content.sha : null,
    commitUrl: responseData.commit ? responseData.commit.html_url : null
  };
}
