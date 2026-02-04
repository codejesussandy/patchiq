interface MockPattern {
  keywords: string[];
  response: string;
}

const patterns: MockPattern[] = [
  {
    keywords: ['critical', 'patch', 'pending'],
    response:
      'You currently have **12 critical patches** pending deployment across 45 endpoints.\n\n' +
      '• 5 are Windows security updates (KB5034441, KB5034439, etc.)\n' +
      '• 4 are Linux kernel patches\n' +
      '• 3 are third-party application updates\n\n' +
      'Would you like me to show the full list or help you create a deployment?',
  },
  {
    keywords: ['vulnerability', 'summary', 'overview'],
    response:
      'Here\'s your vulnerability summary:\n\n' +
      '🔴 **Critical**: 8 vulnerabilities (3 with known exploits)\n' +
      '🟠 **High**: 23 vulnerabilities\n' +
      '🟡 **Medium**: 47 vulnerabilities\n' +
      '🟢 **Low**: 112 vulnerabilities\n\n' +
      'Top CVEs requiring attention:\n' +
      '• CVE-2024-21412 — Windows SmartScreen bypass\n' +
      '• CVE-2024-21351 — Windows SmartScreen vulnerability\n' +
      '• CVE-2024-21338 — Windows kernel elevation of privilege',
  },
  {
    keywords: ['asset', 'health', 'status'],
    response:
      'Asset health overview:\n\n' +
      '• **Total assets**: 156 managed endpoints\n' +
      '• **Healthy**: 128 (82%)\n' +
      '• **Needs attention**: 19 (12%) — missing patches\n' +
      '• **Critical**: 6 (4%) — unpatched critical CVEs\n' +
      '• **Offline**: 3 (2%) — last seen > 7 days ago\n\n' +
      'The 6 critical endpoints are running outdated Windows Server 2019 builds.',
  },
  {
    keywords: ['deploy', 'deployment', 'install'],
    response:
      'To create a new deployment:\n\n' +
      '1. Go to **Patches → Patch Deployed** to see current deployments\n' +
      '2. Click **Create Deployment** to set up a new one\n' +
      '3. Select target patches and endpoint groups\n' +
      '4. Configure schedule and rollback policy\n\n' +
      'You can also use **Zero Touch Deployment** for automatic patching of approved updates.',
  },
  {
    keywords: ['agent', 'agents', 'endpoint'],
    response:
      'Agent status summary:\n\n' +
      '• **Online**: 142 agents actively reporting\n' +
      '• **Offline**: 14 agents (last check-in > 24h)\n' +
      '• **Pending approval**: 3 new agents\n\n' +
      'Go to **Discovery → Agents** to manage agents or **Settings → Agent Management** to configure approval policies.',
  },
  {
    keywords: ['cve', 'exploit', 'zero-day'],
    response:
      'Active zero-day tracking:\n\n' +
      '• **3 zero-day vulnerabilities** currently affect your environment\n' +
      '• 2 have patches available but not yet deployed\n' +
      '• 1 has no vendor patch — mitigation recommended\n\n' +
      'Check **Vulnerability → Zero Day Vulnerabilities** for details and recommended actions.',
  },
  {
    keywords: ['report', 'compliance', 'audit'],
    response:
      'Available report types:\n\n' +
      '• **Patch Compliance** — shows patching status by endpoint/group\n' +
      '• **Vulnerability Assessment** — CVE exposure across your fleet\n' +
      '• **Deployment History** — past deployment results and timelines\n' +
      '• **Audit Log** — user actions and system events\n\n' +
      'Go to **Reports** to generate or schedule a report.',
  },
  {
    keywords: ['help', 'what can you do', 'capabilities'],
    response:
      'I can help you with:\n\n' +
      '• **Patch status** — check pending, deployed, or failed patches\n' +
      '• **Vulnerability overview** — see CVE exposure and risk scores\n' +
      '• **Asset health** — monitor endpoint status and compliance\n' +
      '• **Deployment guidance** — help create or troubleshoot deployments\n' +
      '• **Agent management** — check agent connectivity and status\n' +
      '• **Reports** — guide you to the right report type\n\n' +
      'Try asking "Show critical patches" or "Vulnerability summary".',
  },
];

const fallbackResponses = [
  "I'm not sure I have specific data on that yet. Try asking about patches, vulnerabilities, assets, or deployments.",
  "I don't have enough context for that query. You can ask me about patch status, vulnerability summaries, asset health, or deployment guidance.",
  "That's outside my current knowledge. I can help with patch management, vulnerability tracking, and asset monitoring. What would you like to know?",
];

export function getMockResponse(input: string): string {
  const lower = input.toLowerCase();

  for (const pattern of patterns) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      return pattern.response;
    }
  }

  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

export const suggestedPrompts = [
  'Show critical patches',
  'Vulnerability summary',
  'Asset health overview',
  'What can you do?',
];
