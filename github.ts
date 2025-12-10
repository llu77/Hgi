import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * GitHub Integration Helper
 * Uses GitHub CLI (gh) for repository operations
 */

const BACKUP_DIR = '/tmp/financial-backups';
const REPO_NAME = 'financial-management-backups';

/**
 * Initialize GitHub repository for backups
 */
export async function initializeGitHubRepo(): Promise<{ success: boolean; repoUrl?: string; error?: string }> {
  try {
    // Check if gh CLI is authenticated
    try {
      execSync('gh auth status', { stdio: 'pipe' });
    } catch {
      return {
        success: false,
        error: 'GitHub CLI not authenticated. Please run: gh auth login',
      };
    }

    // Check if repository exists
    try {
      const result = execSync(`gh repo view ${REPO_NAME} --json url`, { encoding: 'utf8' });
      const repo = JSON.parse(result);
      return {
        success: true,
        repoUrl: repo.url,
      };
    } catch {
      // Repository doesn't exist, create it
      execSync(`gh repo create ${REPO_NAME} --private --description "Automated financial data backups"`, {
        stdio: 'pipe',
      });
      
      const result = execSync(`gh repo view ${REPO_NAME} --json url`, { encoding: 'utf8' });
      const repo = JSON.parse(result);
      
      return {
        success: true,
        repoUrl: repo.url,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create backup of financial data and commit to GitHub
 */
export async function backupToGitHub(data: {
  date: string;
  revenues: any[];
  expenses: any[];
  summary: any;
}): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  try {
    // Create backup directory if it doesn't exist
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Write backup data to JSON file
    const filename = `backup-${data.date}.json`;
    const filepath = join(BACKUP_DIR, filename);
    writeFileSync(filepath, JSON.stringify(data, null, 2));

    // Initialize git if needed
    if (!existsSync(join(BACKUP_DIR, '.git'))) {
      execSync('git init', { cwd: BACKUP_DIR });
      execSync('git branch -M main', { cwd: BACKUP_DIR });
      
      // Get remote URL from gh
      const result = execSync(`gh repo view ${REPO_NAME} --json url`, { encoding: 'utf8' });
      const repo = JSON.parse(result);
      execSync(`git remote add origin ${repo.url}`, { cwd: BACKUP_DIR });
    }

    // Add, commit, and push
    execSync(`git add ${filename}`, { cwd: BACKUP_DIR });
    execSync(`git commit -m "Backup: ${data.date}"`, { cwd: BACKUP_DIR });
    execSync('git push -u origin main', { cwd: BACKUP_DIR });

    // Get commit SHA
    const commitSha = execSync('git rev-parse HEAD', { cwd: BACKUP_DIR, encoding: 'utf8' }).trim();

    return {
      success: true,
      commitSha,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create monthly report and commit to GitHub
 */
export async function createMonthlyReport(data: {
  year: number;
  month: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueBreakdown: any;
  expenseBreakdown: any;
}): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  try {
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Create markdown report
    const reportContent = `# Monthly Financial Report - ${data.year}-${String(data.month).padStart(2, '0')}

## Summary
- **Total Revenue**: ${data.totalRevenue.toFixed(2)}
- **Total Expenses**: ${data.totalExpenses.toFixed(2)}
- **Net Profit**: ${data.netProfit.toFixed(2)}

## Revenue Breakdown
${JSON.stringify(data.revenueBreakdown, null, 2)}

## Expense Breakdown
${JSON.stringify(data.expenseBreakdown, null, 2)}

---
*Generated automatically on ${new Date().toISOString()}*
`;

    const filename = `report-${data.year}-${String(data.month).padStart(2, '0')}.md`;
    const filepath = join(BACKUP_DIR, filename);
    writeFileSync(filepath, reportContent);

    // Initialize git if needed
    if (!existsSync(join(BACKUP_DIR, '.git'))) {
      execSync('git init', { cwd: BACKUP_DIR });
      execSync('git branch -M main', { cwd: BACKUP_DIR });
      
      const result = execSync(`gh repo view ${REPO_NAME} --json url`, { encoding: 'utf8' });
      const repo = JSON.parse(result);
      execSync(`git remote add origin ${repo.url}`, { cwd: BACKUP_DIR });
    }

    // Add, commit, and push
    execSync(`git add ${filename}`, { cwd: BACKUP_DIR });
    execSync(`git commit -m "Monthly Report: ${data.year}-${data.month}"`, { cwd: BACKUP_DIR });
    execSync('git push -u origin main', { cwd: BACKUP_DIR });

    const commitSha = execSync('git rev-parse HEAD', { cwd: BACKUP_DIR, encoding: 'utf8' }).trim();

    return {
      success: true,
      commitSha,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * List all backups from GitHub
 */
export async function listBackups(): Promise<{ success: boolean; backups?: string[]; error?: string }> {
  try {
    const result = execSync(`gh api repos/{owner}/${REPO_NAME}/contents`, { encoding: 'utf8' });
    const files = JSON.parse(result);
    
    const backups = files
      .filter((file: any) => file.name.startsWith('backup-') && file.name.endsWith('.json'))
      .map((file: any) => file.name);

    return {
      success: true,
      backups,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
