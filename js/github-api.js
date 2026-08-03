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
  const cleanToken = patToken ? patToken.trim() : '';
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}&t=${Date.now()}`;
  const headers = {
    'Accept': 'application/vnd.github+json'
  };

  if (cleanToken) {
    headers['Authorization'] = `Bearer ${cleanToken}`;
  }

  let response;
  try {
    response = await fetch(url, { headers });
  } catch (err) {
    console.error('GitHub API connection error raw object:', err);
    throw new Error(`Connection to GitHub failed: ${err.message}. Please check your internet connection, ensure api.github.com is not blocked by your firewall/VPN/adblocker, and that your browser is not blocking the request.`);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository file '${path}' not found at ${owner}/${repo} (Branch: ${branch}). Check repository settings & PAT permissions.`);
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
  const cleanToken = patToken ? patToken.trim() : '';
  if (!cleanToken) {
    throw new Error('Personal Access Token (PAT) is required to publish changes.');
  }
  if (!owner || !repo) {
    throw new Error('Repository Owner and Repository Name must be configured.');
  }

  let shaToUse = currentSha;

  // If SHA was not provided, fetch current metadata first
  if (!shaToUse) {
    const meta = await getFileMetadata(owner, repo, path, branch, cleanToken);
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

  let response;
  try {
    response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });
  } catch (err) {
    console.error('GitHub API publish connection error raw object:', err);
    throw new Error(`Connection to GitHub failed: ${err.message}. Please check your internet connection, ensure api.github.com is not blocked by your firewall/VPN/adblocker, and that your browser is not blocking the request.`);
  }

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
