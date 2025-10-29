import axios from 'axios';
import {logger} from '@appium/support';

const log = logger.getLogger('Contributions');

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_ORG = 'appium';
const MAX_PAGE_LIMIT = 20;
const ITEMS_PER_PAGE = 100;
const MAX_TITLE_LENGTH = 120;

/**
 * Extract date part from ISO string (removes time component)
 * @param {string} isoString - ISO date string
 * @returns {string} Date part only (YYYY-MM-DD)
 */
function extractDatePart(isoString) {
  return isoString.split('T')[0];
}

// Internal exclusion list - usernames to exclude from reports
const INTERNAL_EXCLUSION_LIST = [
  'dependabot',
  'dependabot[bot]',
  'renovate',
  'renovate[bot]',
  'appium-ci',
  'appium-bot',
  'github-actions[bot]',
  'pre-commit-ci[bot]',
  'codecov[bot]',
  'sonarcloud[bot]',
  'sonarcloud[bot]',
  'greenkeeper[bot]',
  'mergify[bot]',
  'cla-bot',
  'claassistant[bot]',
  'semantic-release-bot',
  'semantic-release[bot]',
  'allcontributors[bot]',
  'imgbot[bot]',
  'imgbot',
  'stale[bot]',
  'stale',
  'welcome[bot]',
  'welcome',
  'invalid-email-address',
  'invalid-email',
  'noreply',
  'noreply@github.com',
  'jlipps',
  'mykola-mokhnach',
  'kazucocoa',
  'saikrishna321',
  'srinivasantarget',
  'eglitise',
];

/**
 * Get the date range for the last calendar month
 * @returns {{from: string, to: string}}
 */
function getLastMonthDateRange() {
  const now = new Date();
  // First day of last month at 00:00:00 UTC
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
  // Last day of last month at 23:59:59 UTC
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

/**
 * Make request to GitHub API (authenticated or unauthenticated)
 * @param {string} endpoint - API endpoint
 * @param {string|null} token - GitHub token (optional)
 * @returns {Promise<{data: any, headers: any}>}
 */
async function makeGitHubRequest(endpoint, token) {
  const url = `${GITHUB_API_BASE}${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'appium-contrib-stats',
  };

  // Add authorization header only if token is provided
  if (token) {
    headers.Authorization = `token ${token}`;
  }

    const response = await axios({
      method: 'GET',
      url,
      headers,
    });

    return {data: response.data, headers: response.headers};
}

/**
 * Get merged pull requests from the Appium organization for the specified date range using GitHub search API
 * @param {Object} dateRange - Date range object with from and to properties
 * @param {string} dateRange.from - Start date in ISO format
 * @param {string} dateRange.to - End date in ISO format
 * @param {string|null} [token] - GitHub token (optional)
 * @returns {Promise<GitHubPullRequest[]>} Array of pull request objects
 */
async function getMergedPullRequestsFromSearch(dateRange, token) {
  /** @type {GitHubPullRequest[]} */
  const pullRequests = [];
  let page = 1;
  const perPage = ITEMS_PER_PAGE;

  // Convert ISO dates to GitHub's expected format (YYYY-MM-DD)
  const fromDate = extractDatePart(dateRange.from);
  const toDate = extractDatePart(dateRange.to);

  // Build search query for merged pull requests in the appium organization
  // Using GitHub's search syntax: https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests
  const excludedAuthors = INTERNAL_EXCLUSION_LIST.map((author) => `-author:${author}`).join(' ');
  const searchQuery = `org:${GITHUB_ORG} is:pr is:merged merged:${fromDate}..${toDate} ${excludedAuthors}`;
  while (true) {
    const endpoint = `/search/issues?q=${encodeURIComponent(searchQuery)}&page=${page}&per_page=${perPage}&sort=created&order=asc`;
    const {data} = await makeGitHubRequest(endpoint, token);
    if (!data.items?.length) {
      break;
    }

    // Process the search results (pull requests)
    pullRequests.push(...data.items.map((pr) => ({
      sha: pr.merge_commit_sha,
      author: pr.user,
      created_at: pr.created_at,
      merged_at: pr.merged_at || pr.closed_at, // Use closed_at as fallback if merged_at is null
      commit: {
        message: pr.title, // Use PR title as the commit message
      },
      html_url: pr.html_url,
      repository: pr.repository_url.split('/').pop(), // Extract repo name from URL
    })));

    page++;
    // Safety check
    if (page > MAX_PAGE_LIMIT) {
      log.warn(`Reached maximum page limit (${MAX_PAGE_LIMIT}) for PR search`);
      break;
    }
  }

  return pullRequests;
}


/**
 * Format GitHub pull request data as Slack message blocks
 * @param {GitHubPullRequest[]} pullRequests - Array of pull request objects
 * @param {string} from - Start date in ISO 8601 format
 * @param {string} to - End date in ISO 8601 format
 * @param {string} generatedAt - Generation timestamp in ISO 8601 format
 * @returns {object} Slack message payload with blocks
 */
function formatSlackMessage(pullRequests, from, to, generatedAt) {
  const monthName = new Date(from).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const fromDate = extractDatePart(from);
  const toDate = extractDatePart(to);

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🚀 GitHub Contribution Report for ${monthName}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Organization:* @${GITHUB_ORG}\n*Period:* ${fromDate} to ${toDate}\n*Total Merged Pull Requests:* ${pullRequests.length}`,
      },
    },
    {
      type: 'divider',
    },
  ];

  if (pullRequests.length === 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '❌ No merged pull requests found for this period.',
      },
    });
  } else {
    // Create table header
    const tableHeader = '| # | Created | Merged | Author | Repository | Title | Complexity |\n|---|---------|--------|--------|------------|-------|------------|';
    // Create table rows
    const tableRowLines = pullRequests.map((pr, index) => {
      // Format created date (when PR was created)
      const createdDate = new Date(pr.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      // Format merged date (when PR was merged)
      const mergedDate = new Date(pr.merged_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      const authorName = pr.author?.login || 'Unknown';
      const authorUrl = pr.author?.html_url || `https://github.com/${authorName}`;
      // Use pull request title directly
      let prTitle = pr.commit.message; // This is the PR title from our data mapping
      if (prTitle.length > MAX_TITLE_LENGTH) {
        prTitle = prTitle.substring(0, MAX_TITLE_LENGTH - 1) + '…';
      }

      return `| ${index + 1} | ${createdDate} | ${mergedDate} | [${authorName}](${authorUrl}) | ${pr.repository} | [${prTitle}](${pr.html_url}) | |`;
    });

    // Slack section text has a 3000 character limit. Keep under ~2900 to be safe.
    const MAX_SECTION_CHARS = 2900;
    let currentLines = [];
    let currentLen = tableHeader.length + 6; // include code fence/newlines overhead

    const flushSection = () => {
      if (currentLines.length === 0) {
        return;
      }
      const content = `\`\`\`\n${tableHeader}\n${currentLines.join('\n')}\n\`\`\``;
      blocks.push({
        type: 'section',
        text: {type: 'mrkdwn', text: content},
      });
      currentLines = [];
      currentLen = tableHeader.length + 6;
    };

    for (const line of tableRowLines) {
      const addLen = line.length + 1; // plus newline
      if (currentLen + addLen > MAX_SECTION_CHARS) {
        flushSection();
      }
      currentLines.push(line);
      currentLen += addLen;
    }
    flushSection();
  }

  blocks.push(
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Generated on ${extractDatePart(generatedAt)} | <https://github.com/${GITHUB_ORG}|View Organization>`,
        },
      ],
    },
  );

  return {blocks};
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    log.warn('GITHUB_TOKEN not provided - using unauthenticated requests');
  }

  const dateRange = getLastMonthDateRange();
  log.info(`Collecting GitHub contribution statistics for ${dateRange.from} to ${dateRange.to}`);

  // Get merged pull requests using GitHub search API
  log.info('Fetching merged pull requests using GitHub search API...');
  const allPullRequests = await getMergedPullRequestsFromSearch(dateRange, token);
  log.info(`Found ${allPullRequests.length} merged pull requests across all repositories`);

  const generatedAt = new Date().toISOString();

  // Output Slack-formatted message to stdout
  const slackMessage = formatSlackMessage(
    allPullRequests,
    dateRange.from,
    dateRange.to,
    generatedAt
  );

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(slackMessage, null, 2));
  log.info('All done!');
}

(async () => await main())();

// Type definitions

/**
 * @typedef {Object} GitHubUser
 * @property {string} login - Username
 * @property {number} id - User ID
 * @property {string} html_url - Profile URL
 * @property {string} avatar_url - Avatar URL
 */

/**
 * @typedef {Object} GitHubCommitAuthor
 * @property {string} name - Author name
 * @property {string} email - Author email
 * @property {string} date - Commit date
 */

/**
 * @typedef {Object} GitHubPullRequest
 * @property {string} sha - Merge commit SHA
 * @property {GitHubUser} author - Author user object
 * @property {GitHubUser} committer - Committer user object
 * @property {Object} commit - Commit details
 * @property {GitHubCommitAuthor} commit.author - Commit author details
 * @property {GitHubCommitAuthor} commit.committer - Commit committer details
 * @property {string} commit.message - Pull request title
 * @property {string} html_url - Pull request URL
 * @property {string} repository - Repository name
 */