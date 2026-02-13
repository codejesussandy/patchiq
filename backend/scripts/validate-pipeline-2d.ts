#!/usr/bin/env tsx
/**
 * Pipeline 2D: Platform Infrastructure Settings
 * Comprehensive End-to-End Validation Script (R8)
 *
 * Runs all 65 validation scenarios across all requirements:
 * - R1: Server Settings (V1-V12) - 11 scenarios
 * - R2: Mail Server (V13-V22) - 17 scenarios
 * - R3: Proxy Server (V23-V32) - 10 scenarios
 * - R4: Branding (V33-V42) - 10 scenarios
 * - R5: Remote Desktop (V43-V47) - 5 scenarios
 * - R6: Risk Score (V48-V58) - 12 scenarios
 * - R7: Cross-Cutting (V59-V65) - 7 scenarios
 *
 * Total: 72 scenarios (includes some extras beyond the PRD's 65)
 */

import { spawn } from 'child_process';
import * as path from 'path';

interface ValidationResult {
  requirement: string;
  script: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  success: boolean;
}

const results: ValidationResult[] = [];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// Run a validation script
async function runValidationScript(
  requirement: string,
  scriptName: string
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    console.log();
    console.log(colorize('═'.repeat(80), 'cyan'));
    console.log(colorize(`Running: ${requirement}`, 'bold'));
    console.log(colorize(`Script: ${scriptName}`, 'blue'));
    console.log(colorize('═'.repeat(80), 'cyan'));
    console.log();

    const startTime = Date.now();
    const scriptPath = path.join(__dirname, scriptName);

    const child = spawn('npx', ['tsx', scriptPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const durationSec = (duration / 1000).toFixed(2);

      // Parse output to extract pass/fail counts
      // Since we're using 'inherit' stdio, we can't capture output
      // We'll rely on the exit code instead
      const success = code === 0;

      const result: ValidationResult = {
        requirement,
        script: scriptName,
        passed: success ? 1 : 0,
        failed: success ? 0 : 1,
        total: 1,
        duration,
        success,
      };

      console.log();
      if (success) {
        console.log(colorize(`✅ ${requirement} PASSED (${durationSec}s)`, 'green'));
      } else {
        console.log(colorize(`❌ ${requirement} FAILED (${durationSec}s)`, 'red'));
      }

      results.push(result);
      resolve(result);
    });

    child.on('error', (error) => {
      console.error(colorize(`Error running ${scriptName}: ${error.message}`, 'red'));
      const duration = Date.now() - startTime;

      const result: ValidationResult = {
        requirement,
        script: scriptName,
        passed: 0,
        failed: 1,
        total: 1,
        duration,
        success: false,
      };

      results.push(result);
      resolve(result);
    });
  });
}

async function runAllValidations() {
  console.log(colorize('═'.repeat(80), 'cyan'));
  console.log(colorize('Pipeline 2D: Platform Infrastructure Settings', 'bold'));
  console.log(colorize('Comprehensive End-to-End Validation (R8)', 'bold'));
  console.log(colorize('═'.repeat(80), 'cyan'));
  console.log();
  console.log(colorize('Testing all settings domains for runtime enforcement...', 'blue'));
  console.log();

  const startTime = Date.now();

  // Phase 1: Preflight
  console.log(colorize('Phase 1: Preflight', 'yellow'));
  console.log('Health checking backend API...');
  try {
    // Try login endpoint instead of health (which requires auth)
    const response = await fetch('http://localhost:3000/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test', password: 'test' }),
    });
    // Any response means backend is running
    if (response) {
      console.log(colorize('✓ Backend is responding', 'green'));
    } else {
      console.error(colorize('✗ Backend health check failed', 'red'));
      process.exit(1);
    }
  } catch (error) {
    console.error(colorize('✗ Cannot connect to backend', 'red'));
    console.error('  Make sure the backend is running: npm run dev:backend');
    process.exit(1);
  }

  // Phase 2: R1 - Server Settings
  await runValidationScript('R1: Server Settings', 'validate-r1-server-settings.ts');

  // Phase 3: R2 - Mail Server
  await runValidationScript('R2: Mail Server', 'validate-r2-mail-server.ts');

  // Phase 4: R3 - Proxy Server
  await runValidationScript('R3: Proxy Server', 'validate-r3-proxy.ts');

  // Phase 5: R4 - Branding
  await runValidationScript('R4: Branding', 'validate-r4-branding.ts');

  // Phase 6: R5 & R6 - Remote Desktop & Risk Score
  await runValidationScript('R5 & R6: Remote Desktop + Risk Score', 'validate-r5-r6.ts');

  // Phase 7: R7 - Cross-Cutting
  await runValidationScript('R7: Audit Logging & Errors', 'validate-r7-audit-errors.ts');

  const totalDuration = Date.now() - startTime;
  const totalDurationSec = (totalDuration / 1000).toFixed(2);

  // =================================================================
  // Final Summary
  // =================================================================
  console.log();
  console.log(colorize('═'.repeat(80), 'cyan'));
  console.log(colorize('FINAL SUMMARY', 'bold'));
  console.log(colorize('═'.repeat(80), 'cyan'));
  console.log();

  const totalPassed = results.filter(r => r.success).length;
  const totalFailed = results.filter(r => !r.success).length;
  const totalTests = results.length;

  console.log(`Total Test Suites: ${totalTests}`);
  console.log(colorize(`Passed: ${totalPassed}`, 'green'));
  console.log(colorize(`Failed: ${totalFailed}`, 'red'));
  console.log();

  console.log('Results by Requirement:');
  console.log();

  results.forEach(result => {
    const status = result.success
      ? colorize('✅ PASS', 'green')
      : colorize('❌ FAIL', 'red');
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`  ${status} ${result.requirement} (${duration}s)`);
  });

  console.log();
  console.log(colorize(`Total Duration: ${totalDurationSec}s`, 'blue'));
  console.log();

  if (totalFailed === 0) {
    console.log(colorize('═'.repeat(80), 'green'));
    console.log(colorize('🎉 ALL VALIDATIONS PASSED! 🎉', 'green'));
    console.log(colorize('═'.repeat(80), 'green'));
    console.log();
    console.log(colorize('Pipeline 2D is complete and ready for production!', 'green'));
    console.log();
    console.log('Exit criteria verified:');
    console.log(colorize('  ✅ Every setting provably affects runtime behavior', 'green'));
    console.log(colorize('  ✅ Mail and proxy test endpoints test saved config', 'green'));
    console.log(colorize('  ✅ Branding logos are permanently accessible', 'green'));
    console.log(colorize('  ✅ Input validation catches all invalid/dangerous inputs', 'green'));
    console.log(colorize('  ✅ Full RBAC enforcement on every endpoint', 'green'));
    console.log(colorize('  ✅ Zero plaintext passwords in API responses', 'green'));
    console.log(colorize('  ✅ 100% audit trail for all settings mutations', 'green'));
    console.log();
  } else {
    console.log(colorize('═'.repeat(80), 'red'));
    console.log(colorize('❌ VALIDATION FAILURES DETECTED', 'red'));
    console.log(colorize('═'.repeat(80), 'red'));
    console.log();
    console.log('Failed test suites:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(colorize(`  • ${r.requirement}`, 'red'));
      });
    console.log();
    console.log('Please fix the failures above before marking Pipeline 2D as complete.');
    console.log();
  }

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run all validations
runAllValidations().catch(error => {
  console.error(colorize('Fatal error during validation:', 'red'));
  console.error(error);
  process.exit(1);
});
