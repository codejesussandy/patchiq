import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface TableStyleInfo {
  page: string;
  url: string;
  tableSize: string;
  columnHeaderStyles: {
    fontSize: string;
    fontWeight: string;
    color: string;
    backgroundColor: string;
    padding: string;
    height: string;
    borderBottom: string;
    textAlign: string;
  } | null;
  cellStyles: {
    fontSize: string;
    padding: string;
    height: string;
    borderBottom: string;
    textAlign: string;
  } | null;
  rowStyles: {
    height: string;
  } | null;
  bordered: boolean;
  rowCount: number;
  paginationStyles: {
    exists: boolean;
    marginTop: string;
    justifyContent: string;
    textAlign: string;
  } | null;
}

const tablePages = [
  { name: 'Assets', url: '/assets' },
  { name: 'All Patches', url: '/patches' },
  { name: 'Patch Deployed', url: '/patches/deployed/scheduled' },
  { name: 'Patch Recommendations', url: '/patches/patch-jobs' },
  { name: 'Vulnerabilities', url: '/vulnerability/vulnerabilities' },
  { name: 'Vulnerability Exceptions', url: '/vulnerability/manage-exception' },
  { name: 'IP Discovery', url: '/discovery/ip-discovery' },
  { name: 'Device Credentials', url: '/discovery/device-credentials' },
  { name: 'Discovery Agents', url: '/discovery/agents' },
  { name: 'Hub Packages', url: '/assets/hub' },
  { name: 'User Management', url: '/settings/user-management/users' },
  { name: 'User Roles', url: '/settings/user-management/roles' },
  { name: 'Computer Groups', url: '/settings/patch-management/computer-groups' },
  { name: 'Patch Preferences', url: '/settings/patch-management/patch-preference' },
  { name: 'Agent Approvals', url: '/settings/agent-management/approval' },
  { name: 'Audit Logs', url: '/settings/audit' },
];

async function extractTableStyles(page: Page): Promise<TableStyleInfo | null> {
  const url = page.url();
  const pageName = url.split('/').filter(p => p).pop() || 'unknown';

  try {
    // Wait for table to be present
    await page.waitForSelector('table, .ant-table', { timeout: 10000 }).catch(() => null);

    const tableStyles = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return null;

      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');
      const th = table.querySelector('th');
      const td = table.querySelector('td');
      const tr = tbody?.querySelector('tr');

      const thStyles = th ? window.getComputedStyle(th) : null;
      const tdStyles = td ? window.getComputedStyle(td) : null;
      const trStyles = tr ? window.getComputedStyle(tr) : null;

      // Get table size from class names
      let tableSize = 'default';
      if (table.classList.contains('ant-table-small')) tableSize = 'small';
      else if (table.classList.contains('ant-table-middle')) tableSize = 'middle';
      else if (table.classList.contains('ant-table-large')) tableSize = 'large';

      // Count rows
      const rowCount = table.querySelectorAll('tbody tr').length;

      // Get pagination styles
      const pagination = document.querySelector('.ant-pagination');
      const paginationStyles = pagination
        ? {
            exists: true,
            marginTop: window.getComputedStyle(pagination).marginTop,
            justifyContent: window.getComputedStyle(pagination).justifyContent,
            textAlign: window.getComputedStyle(pagination).textAlign,
          }
        : {
            exists: false,
            marginTop: 'N/A',
            justifyContent: 'N/A',
            textAlign: 'N/A',
          };

      return {
        columnHeader: thStyles
          ? {
              fontSize: thStyles.fontSize,
              fontWeight: thStyles.fontWeight,
              color: thStyles.color,
              backgroundColor: thStyles.backgroundColor,
              padding: thStyles.padding,
              height: thStyles.height,
              borderBottom: thStyles.borderBottom,
              textAlign: thStyles.textAlign,
            }
          : null,
        cell: tdStyles
          ? {
              fontSize: tdStyles.fontSize,
              padding: tdStyles.padding,
              height: tdStyles.height,
              borderBottom: tdStyles.borderBottom,
              textAlign: tdStyles.textAlign,
            }
          : null,
        row: trStyles
          ? {
              height: trStyles.height,
            }
          : null,
        tableSize,
        bordered: table.classList.contains('ant-table-bordered'),
        rowCount,
        paginationStyles,
      };
    });

    if (!tableStyles) {
      return null;
    }

    return {
      page: pageName,
      url,
      tableSize: tableStyles.tableSize,
      columnHeaderStyles: tableStyles.columnHeader,
      cellStyles: tableStyles.cell,
      rowStyles: tableStyles.row,
      bordered: tableStyles.bordered,
      rowCount: tableStyles.rowCount,
      paginationStyles: tableStyles.paginationStyles,
    };
  } catch (error) {
    console.error(`Error extracting styles from ${url}:`, error);
    return null;
  }
}

function generateTableConsistencyReport(tables: TableStyleInfo[]): string {
  const validTables = tables.filter(t => t.columnHeaderStyles && t.cellStyles);

  // Analyze row heights
  const rowHeights = validTables
    .filter(t => t.rowStyles?.height)
    .map(t => ({ table: t.page, height: t.rowStyles!.height }));

  const uniqueRowHeights = [...new Set(rowHeights.map(r => r.height))];

  // Analyze cell padding
  const cellPaddings = validTables
    .filter(t => t.cellStyles?.padding)
    .map(t => ({ table: t.page, padding: t.cellStyles!.padding }));

  const uniquePaddings = [...new Set(cellPaddings.map(p => p.padding))];

  // Analyze column header styles
  const headerBgColors = validTables
    .filter(t => t.columnHeaderStyles?.backgroundColor)
    .map(t => ({ table: t.page, color: t.columnHeaderStyles!.backgroundColor }));

  const uniqueHeaderBgColors = [...new Set(headerBgColors.map(h => h.color))];

  const headerFontWeights = validTables
    .filter(t => t.columnHeaderStyles?.fontWeight)
    .map(t => ({ table: t.page, weight: t.columnHeaderStyles!.fontWeight }));

  const uniqueHeaderWeights = [...new Set(headerFontWeights.map(h => h.weight))];

  // Analyze table sizes
  const tableSizes = validTables.map(t => t.tableSize);
  const uniqueSizes = [...new Set(tableSizes)];

  // Build row height distribution text
  let rowHeightDistribution = '';
  uniqueRowHeights.forEach(height => {
    const tables = rowHeights.filter(r => r.height === height).map(r => r.table);
    rowHeightDistribution += `${height}: ${tables.length} table(s) - ${tables.join(', ')}\n`;
  });

  // Build cell padding distribution text
  let cellPaddingDistribution = '';
  uniquePaddings.forEach(padding => {
    const tables = cellPaddings.filter(p => p.padding === padding).map(p => p.table);
    cellPaddingDistribution += `${padding}: ${tables.length} table(s) - ${tables.join(', ')}\n`;
  });

  // Build header bg color distribution
  let headerBgDistribution = '';
  uniqueHeaderBgColors.forEach(color => {
    const tables = headerBgColors.filter(h => h.color === color).map(h => h.table);
    headerBgDistribution += `${color}: ${tables.length} table(s) - ${tables.join(', ')}\n`;
  });

  // Build header weight distribution
  let headerWeightDistribution = '';
  uniqueHeaderWeights.forEach(weight => {
    const tables = headerFontWeights.filter(h => h.weight === weight).map(h => h.table);
    headerWeightDistribution += `${weight}: ${tables.length} table(s) - ${tables.join(', ')}\n`;
  });

  // Build table matrix
  let tableMatrix = '';
  validTables.forEach(t => {
    tableMatrix += `| ${t.page} | ${t.url} | ${t.tableSize} | ${t.rowStyles?.height || 'N/A'} | ${t.cellStyles?.padding || 'N/A'} | ${t.columnHeaderStyles?.backgroundColor || 'N/A'} | ${t.columnHeaderStyles?.fontWeight || 'N/A'} | ${t.bordered ? 'Yes' : 'No'} | ${t.rowCount} |\n`;
  });

  // Build pagination alignment distribution
  let paginationAlignmentDistribution = '';
  const alignments = Array.from(new Set(validTables.map(t => t.paginationStyles?.justifyContent || 'N/A')));
  alignments.forEach(align => {
    const tables = validTables.filter(t => (t.paginationStyles?.justifyContent || 'N/A') === align).map(t => t.page);
    paginationAlignmentDistribution += `${align}: ${tables.length} table(s) - ${tables.join(', ')}\n`;
  });

  // Build pagination margin distribution
  let paginationMarginDistribution = '';
  const margins = Array.from(new Set(validTables.filter(t => t.paginationStyles?.exists).map(t => t.paginationStyles?.marginTop || 'N/A')));
  margins.forEach(margin => {
    const tables = validTables.filter(t => (t.paginationStyles?.marginTop || 'N/A') === margin).map(t => t.page);
    paginationMarginDistribution += `${margin}: ${tables.length} table(s) - ${tables.join(', ')}\n`;
  });

  const rowHeightIssue = uniqueRowHeights.length > 1
    ? `⚠️ **ISSUE:** Found ${uniqueRowHeights.length} different row heights. Tables should have consistent row heights.`
    : '✓ **OK:** All tables have consistent row heights.';

  const paddingIssue = uniquePaddings.length > 1
    ? `⚠️ **ISSUE:** Found ${uniquePaddings.length} different cell paddings. Tables should have consistent cell padding.`
    : '✓ **OK:** All tables have consistent cell padding.';

  const headerBgIssue = uniqueHeaderBgColors.length > 1
    ? `⚠️ **ISSUE:** Found ${uniqueHeaderBgColors.length} different header background colors.`
    : '✓ **OK:** All column headers have consistent background color.';

  const headerWeightIssue = uniqueHeaderWeights.length > 1
    ? `⚠️ **ISSUE:** Found ${uniqueHeaderWeights.length} different header font weights.`
    : '✓ **OK:** All column headers have consistent font weight.';

  const report = `# Phase 5 - Agent 36: Table & Data Grid Consistency Audit Report

## Executive Summary
- **Tables Audited:** ${validTables.length}
- **Row Height Variations:** ${uniqueRowHeights.length} (should be 1)
- **Cell Padding Variations:** ${uniquePaddings.length} (should be 1)
- **Column Header BG Variations:** ${uniqueHeaderBgColors.length} (should be 1)
- **Column Header Font Weight Variations:** ${uniqueHeaderWeights.length} (should be 1)
- **Table Size Variants Used:** ${uniqueSizes.join(', ')}
- **Consistency Score:** ${Math.round((uniqueRowHeights.length === 1 && uniquePaddings.length === 1 && uniqueHeaderBgColors.length === 1 ? 100 : 0) / 4)}%

## Critical Findings - Row Height Inconsistencies (User Concern)

### Row Height Distribution
\`\`\`
${rowHeightDistribution}
\`\`\`

${rowHeightIssue}

### Cell Padding Distribution
\`\`\`
${cellPaddingDistribution}
\`\`\`

${paddingIssue}

### Column Header Background Color Distribution
\`\`\`
${headerBgDistribution}
\`\`\`

${headerBgIssue}

### Column Header Font Weight Distribution
\`\`\`
${headerWeightDistribution}
\`\`\`

${headerWeightIssue}

## Table Style Matrix

| Page | URL | Table Size | Row Height | Cell Padding | Header BG | Header Weight | Bordered | Rows |
|------|-----|-----------|-----------|-------------|-----------|---------------|----------|------|
${tableMatrix}

## Pagination Analysis

### Alignment Distribution
\`\`\`
${paginationAlignmentDistribution}
\`\`\`

### Margin-Top Distribution
\`\`\`
${paginationMarginDistribution}
\`\`\`

## Recommendations

### Immediate Actions Required
1. **Standardize Row Height:** Set all tables to use consistent row height (recommend: 56px)
2. **Standardize Cell Padding:** Set all tables to use consistent cell padding (recommend: 16px)
3. **Standardize Column Headers:** Use consistent background color (#fafafa) and font weight (500)
4. **Standardize Table Size:** Use size="middle" for all DataTable instances

### Implementation

\`\`\`tsx
// Standard DataTable configuration
<DataTable
  size="middle"           // 56px row height
  bordered={false}        // Consistent border style
  rowKey="id"
  columns={columns}
  data={data}
  pagination={{
    position: ['bottomRight'],  // Consistent alignment
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => \`Total \${total} items\`,
  }}
/>
\`\`\`

### CSS Fallback (if needed)
\`\`\`css
/* Ensure table consistency */
.ant-table.ant-table-middle .ant-table-cell {
  padding: 16px !important;
  height: 56px !important;
}

.ant-table.ant-table-middle .ant-table-thead > tr > th {
  background-color: #fafafa !important;
  font-weight: 500 !important;
}

.ant-pagination {
  margin-top: 16px !important;
  text-align: right !important;
}
\`\`\`

## Table Count Summary
- Tables with non-standard row height: ${uniqueRowHeights.length > 1 ? rowHeights.length : 0}
- Tables with non-standard cell padding: ${uniquePaddings.length > 1 ? cellPaddings.length : 0}
- Tables needing consistency updates: ${validTables.filter(t =>
    uniqueRowHeights.length > 1 ||
    uniquePaddings.length > 1 ||
    uniqueHeaderBgColors.length > 1 ||
    uniqueHeaderWeights.length > 1
  ).length}

## Estimated Fix Effort
- **Audit Complete:** ✓
- **Estimated Implementation Time:** 4-6 hours
  - Update DataTable props in 15+ pages: 2-3 hours
  - Add CSS overrides if needed: 1-2 hours
  - Testing across all pages: 1 hour
- **Testing Required:** Full regression test on all 20+ table pages

---

**Generated:** ${new Date().toISOString()}
**Agent:** Phase 5 - Agent 36 (Table & Data Grid Consistency Audit)
`;

  return report;
}

test.describe('Phase 5 - Agent 36: Table & Data Grid Consistency Audit', () => {
  let allTableStyles: TableStyleInfo[] = [];

  test('should audit all table pages and extract styles', async ({ page }) => {
    // Navigate to each page and extract table styles
    for (const pageInfo of tablePages) {
      test.step(`Audit: ${pageInfo.name} (${pageInfo.url})`, async () => {
        try {
          await page.goto(pageInfo.url, { waitUntil: 'networkidle', timeout: 30000 });

          // Wait for content to load
          await page.waitForTimeout(1000);

          const styles = await extractTableStyles(page);

          if (styles) {
            allTableStyles.push(styles);
            console.log(`✓ ${pageInfo.name}: ${styles.tableSize} size, ${styles.rowCount} rows`);

            // Take screenshot
            await page.screenshot({
              path: `./playwright-report/table-audit-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`,
              fullPage: false,
            });
          } else {
            console.log(`✗ ${pageInfo.name}: No table found or couldn't extract styles`);
          }
        } catch (error) {
          console.error(`Error on page ${pageInfo.name}:`, error);
        }
      });
    }

    // Generate report
    test.step('Generate table consistency report', async () => {
      const report = generateTableConsistencyReport(allTableStyles);
      console.log('\n' + report);

      // Save report to file
      const reportPath = path.join('./playwright-report', 'PHASE5_AGENT36_TABLE_AUDIT_REPORT.md');
      fs.writeFileSync(reportPath, report, 'utf8');
      console.log(`\nReport saved to: ${reportPath}`);
    });

    expect(allTableStyles.length).toBeGreaterThan(0);
  });
});
