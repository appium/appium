import {log, performApiRequest} from './crowdin-common.mjs';
import {net, fs, tempDir} from '@appium/support';
import {waitForCondition} from 'asyncbox';

const REPORT_TIMEOUT_MS = 1000 * 60 * 5; // 5 minutes
const REPORT_STATUS = {
  finished: 'finished',
  created: 'created',
  inProgress: 'in_progress',
};

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
    from: from.toISOString(), // Full ISO 8601 format with UTC: YYYY-MM-DDTHH:mm:ss.sssZ
    to: to.toISOString(),
  };
}

/**
 * Generate a translation activity report
 * @param {string} from - Start date in ISO 8601 format (e.g., 2025-09-01T00:00:00.000Z)
 * @param {string} to - End date in ISO 8601 format (e.g., 2025-09-30T23:59:59.000Z)
 * @returns {Promise<string>} Report ID
 */
async function generateReport(from, to) {
  log.info(`Generating translation report for ${from} to ${to}`);

  const {data: reportData} = await performApiRequest('/reports', {
    method: 'POST',
    payload: {
      name: 'top-members',
      schema: {
        unit: 'strings',
        format: 'json',
        dateFrom: from,
        dateTo: to,
      },
    },
  });

  return reportData.identifier;
}

/**
 * Check report generation status
 * @param {string} reportId
 * @returns {Promise<{status: string, progress: number}>}
 */
async function checkReportStatus(reportId) {
  const {data: statusData} = await performApiRequest(`/reports/${reportId}`);
  return {
    status: statusData.status,
    progress: statusData.progress,
  };
}

/**
 * Wait for report to be ready and download it
 * @param {string} reportId - The unique identifier of the generated report
 * @returns {Promise<CrowdinReportData>} Parsed report data from Crowdin
 */
async function downloadReport(reportId) {
  log.info(`Waiting up to ${REPORT_TIMEOUT_MS / 1000}s for report ${reportId} to finish`);

  await waitForCondition(
    async () => {
      const {status, progress} = await checkReportStatus(reportId);
      log.debug(`Report status: ${status}, progress: ${progress}%`);

      switch (status) {
        case REPORT_STATUS.finished:
          return true;
        case REPORT_STATUS.inProgress:
        case REPORT_STATUS.created:
          return false;
        default:
          throw new Error(`Report generation failed with status '${status}'`);
      }
    },
    {
      waitMs: REPORT_TIMEOUT_MS,
      intervalMs: 2000,
    },
  );

  const {data: downloadData} = await performApiRequest(`/reports/${reportId}/download`);
  log.info('Downloading report data');

  // Download the report file
  const tmpFile = await tempDir.path({prefix: 'crowdin-report', suffix: '.json'});
  try {
    await net.downloadFile(downloadData.url, tmpFile, {isMetered: false});
    const content = await fs.readFile(tmpFile, 'utf8');
    return JSON.parse(content);
  } finally {
    await fs.rimraf(tmpFile);
  }
}

/**
 * Process report data and group by language and translator
 * @param {CrowdinReportData} reportData - Raw report data from Crowdin API
 * @returns {ProcessedStats} Grouped statistics by language and user
 */
function processReportData(reportData) {
  const stats = {};

  if (reportData.data && Array.isArray(reportData.data)) {
    for (const record of reportData.data) {
      const user = record.user?.username || record.user?.fullName || 'Unknown';
      const translated = record.translated || 0;
      const approved = record.approved || 0;

      // Each record has a languages array
      const languages = record.languages || [];
      if (languages.length === 0) {
        // If no languages specified, use "Unknown"
        languages.push({name: 'Unknown'});
      }

      // Add this user's stats to each language they contributed to
      for (const lang of languages) {
        const languageName = lang.name || 'Unknown';

        if (!stats[languageName]) {
          stats[languageName] = {};
        }
        if (!stats[languageName][user]) {
          stats[languageName][user] = {translated: 0, approved: 0};
        }
        stats[languageName][user].translated += translated;
        stats[languageName][user].approved += approved;
      }
    }
  }

  return stats;
}

/**
 * Get project details
 * @returns {Promise<{name: string, id: number}>}
 */
async function getProjectInfo() {
  const {data: projectData} = await performApiRequest('', {
    method: 'GET',
  });
  return {
    name: projectData.name,
    id: projectData.id,
  };
}

/**
 * Format statistics as Slack message blocks
 * @param {ProcessedStats} stats - Grouped statistics by language and user
 * @param {string} projectName - Project name
 * @param {string} from - Start date in ISO 8601 format
 * @param {string} to - End date in ISO 8601 format
 * @param {string} generatedAt - Generation timestamp in ISO 8601 format
 * @returns {object} Slack message payload with blocks
 */
function formatSlackMessage(stats, projectName, from, to, generatedAt) {
  const monthName = new Date(from).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  // Format dates as YYYY-MM-DD for display
  const fromDate = from.split('T')[0];
  const toDate = to.split('T')[0];

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 Crowdin Translation Stats for ${monthName}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Project:* ${projectName}\n*Period:* ${fromDate} to ${toDate}`,
      },
    },
    {
      type: 'divider',
    },
  ];

  if (Object.keys(stats).length === 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '❌ No translation activity found for this period.',
      },
    });
  } else {
    for (const [language, users] of Object.entries(stats)) {
      const userEntries = Object.entries(users)
        .filter(([, counts]) => counts.translated > 0 || counts.approved > 0)
        .sort(([, a], [, b]) => (b.translated + b.approved) - (a.translated + a.approved));

      // Skip this language if no users have activity
      if (userEntries.length === 0) {
        continue;
      }

      const userLines = userEntries
        .map(([user, counts]) =>
          `• *${user}*: ${counts.translated} translated, ${counts.approved} approved`
        )
        .join('\n');

      const totalTranslated = userEntries.reduce((sum, [, u]) => sum + u.translated, 0);
      const totalApproved = userEntries.reduce((sum, [, u]) => sum + u.approved, 0);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${language}* (Total: ${totalTranslated} translated, ${totalApproved} approved)\n${userLines}`,
        },
      });
    }
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
          text: `Generated on ${generatedAt.split('T')[0]} | <https://crowdin.com|View on Crowdin>`,
        },
      ],
    },
  );

  return {blocks};
}

async function main() {
  const dateRange = getLastMonthDateRange();
  log.info(`Collecting translation statistics for ${dateRange.from} to ${dateRange.to}`);

  // Get project info
  const projectInfo = await getProjectInfo();
  log.info(`Project: ${projectInfo.name} (ID: ${projectInfo.id})`);

  // Generate and download report
  const reportId = await generateReport(dateRange.from, dateRange.to);
  const reportData = await downloadReport(reportId);

  // Process the data
  const stats = processReportData(reportData);
  const generatedAt = new Date().toISOString();

  // Output Slack-formatted message to stdout
  const slackMessage = formatSlackMessage(
    stats,
    projectInfo.name,
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
 * @typedef {Object} CrowdinUser
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {string} fullName - Full name
 * @property {string} avatarUrl - Avatar URL
 * @property {string} joined - Join date
 */

/**
 * @typedef {Object} CrowdinLanguage
 * @property {string} id - Language ID (e.g., "zh-CN")
 * @property {string} name - Language name (e.g., "Chinese Simplified")
 */

/**
 * @typedef {Object} CrowdinReportRecord
 * @property {CrowdinUser} user - User information
 * @property {CrowdinLanguage[]} languages - Languages the user contributed to
 * @property {number} translated - Number of strings translated
 * @property {number} approved - Number of strings approved
 * @property {number} voted - Number of votes cast
 * @property {number} positiveVotes - Number of positive votes received
 * @property {number} negativeVotes - Number of negative votes received
 * @property {number} winning - Number of winning translations
 */

/**
 * @typedef {Object} CrowdinReportData
 * @property {CrowdinReportRecord[]} data - Array of report records
 */

/**
 * @typedef {Object} UserStats
 * @property {number} translated - Number of strings translated
 * @property {number} approved - Number of strings approved
 */

/**
 * @typedef {Record<string, Record<string, UserStats>>} ProcessedStats
 * Language name mapped to username mapped to stats
 */
