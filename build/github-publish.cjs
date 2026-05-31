const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJson = require('../package.json');

const RELEASE_TAG = `v${packageJson.version}`;
const RELEASE_NAME = `Tabular ${RELEASE_TAG}`;
const RELEASE_NOTES_PATH = path.join(__dirname, `../docs/releases/${packageJson.version}.md`);
const RELEASE_ASSET_PATH = path.join(__dirname, `../build/tabular-extension-v${packageJson.version}.zip`);

const ABOUT = {
  description: 'Drag-select any area of a web page to copy text in reading order and turn table-like content into structured data.',
  homepage: `https://github.com/Nxys/tabular-extension/releases/tag/${RELEASE_TAG}`,
  topics: [
    'chrome-extension',
    'manifest-v3',
    'typescript',
    'clipboard',
    'table-extraction',
    'productivity',
    'web-scraping'
  ]
};

function getToken() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN or GH_TOKEN');
  }
  return token;
}

function getRepoInfo() {
  const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  const sshMatch = remote.match(/github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  const httpsMatch = remote.match(/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
  const match = sshMatch || httpsMatch;

  if (!match) {
    throw new Error(`Unsupported GitHub remote: ${remote}`);
  }

  return {
    owner: match[1],
    repo: match[2]
  };
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function updateRepoAbout(owner, repo, token) {
  await githubRequest(`https://api.github.com/repos/${owner}/${repo}`, token, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: ABOUT.description,
      homepage: ABOUT.homepage
    })
  });

  await githubRequest(`https://api.github.com/repos/${owner}/${repo}/topics`, token, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({
      names: ABOUT.topics
    })
  });
}

async function getOrCreateRelease(owner, repo, token) {
  try {
    return await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${RELEASE_TAG}`, token);
  } catch (error) {
    if (!String(error.message).includes('404')) {
      throw error;
    }
  }

  const body = fs.readFileSync(RELEASE_NOTES_PATH, 'utf8');
  return githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tag_name: RELEASE_TAG,
      name: RELEASE_NAME,
      body,
      draft: false,
      prerelease: false
    })
  });
}

async function uploadAsset(owner, repo, release, token) {
  const assetName = path.basename(RELEASE_ASSET_PATH);
  const assets = release.assets || [];
  const existing = assets.find((asset) => asset.name === assetName);

  if (existing) {
    await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existing.id}`, token, {
      method: 'DELETE'
    });
  }

  const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(assetName)}`);
  const fileBuffer = fs.readFileSync(RELEASE_ASSET_PATH);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/zip',
      'Content-Length': String(fileBuffer.length),
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: fileBuffer
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub upload ${response.status}: ${text}`);
  }

  return response.json();
}

async function main() {
  if (!fs.existsSync(RELEASE_NOTES_PATH)) {
    throw new Error(`Release notes not found: ${RELEASE_NOTES_PATH}`);
  }

  if (!fs.existsSync(RELEASE_ASSET_PATH)) {
    throw new Error(`Release asset not found: ${RELEASE_ASSET_PATH}`);
  }

  const token = getToken();
  const { owner, repo } = getRepoInfo();

  console.log(`Updating GitHub About for ${owner}/${repo}...`);
  await updateRepoAbout(owner, repo, token);
  console.log('About updated.');

  console.log(`Creating or updating release ${RELEASE_TAG}...`);
  const release = await getOrCreateRelease(owner, repo, token);
  console.log(`Release ready: ${release.html_url}`);

  console.log(`Uploading asset ${path.basename(RELEASE_ASSET_PATH)}...`);
  await uploadAsset(owner, repo, release, token);
  console.log('Asset uploaded.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
