import { Prisma } from '@prisma/client';
import { NotFoundError } from '@shared/errors';
import { prisma } from '@/db/client';
import {
  transformHardwareForAPI,
  transformTelemetryForAPI,
} from './assets.transformer';
import type {
  AssetLifeCycle,
  AssetHardware,
  AssetSoftware,
  AssetSecurity,
  AssetNetwork,
  AssetPeripherals,
  AssetTelemetry,
  TelemetryHistory,
  SystemErrors,
  AssetAuditLog,
} from './assets.types';
import {
  calculateDepreciation,
  mapDepreciationMethod,
  getMethodDisplayName,
} from './depreciation.utils';
import { resolveAssetId, formatSystemUptime } from './assets-helpers';

// ============================================
// Asset Details Service
// ============================================

export async function getAssetLifeCycle(id: string, method?: string): Promise<AssetLifeCycle> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      name: true,
      purchaseDate: true,
      warrantyExpiry: true,
      endOfLife: true,
      amcExpiryDate: true,
      // Cost fields
      purchaseCost: true,
      salvageValue: true,
      currentValue: true,
      depreciationType: true,
      depreciationRate: true,
      currency: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const now = new Date();
  const purchaseDate = asset.purchaseDate;

  // Get values from database, with sensible defaults
  const purchaseCost = asset.purchaseCost ? Number(asset.purchaseCost) : null;
  const salvageValue = asset.salvageValue ? Number(asset.salvageValue) : null;
  // Use passed method if provided, otherwise use the database stored method
  const depreciationMethod = method ? mapDepreciationMethod(method) : mapDepreciationMethod(asset.depreciationType);

  // Calculate useful life from purchase date and end of life
  let usefulLifeYears = 5; // Default: 5 years
  if (purchaseDate && asset.endOfLife) {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    usefulLifeYears = Math.max(1, Math.round((asset.endOfLife.getTime() - purchaseDate.getTime()) / msPerYear));
  }

  // If we have all required data, use the depreciation algorithm
  if (purchaseCost && purchaseCost > 0 && purchaseDate) {
    const effectiveSalvageValue = salvageValue ?? Math.round(purchaseCost * 0.1); // Default: 10% salvage

    try {
      const depreciation = calculateDepreciation({
        purchaseCost,
        salvageValue: effectiveSalvageValue,
        usefulLifeYears,
        purchaseDate,
        method: depreciationMethod,
        currentDate: now,
      });

      // Calculate end of life date
      const endOfLifeDate = asset.endOfLife
        ? asset.endOfLife.toISOString().split('T')[0]
        : new Date(purchaseDate.getTime() + usefulLifeYears * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      return {
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        purchaseValue: Math.round(purchaseCost),
        currentDate: now.toISOString().split('T')[0],
        currentValue: depreciation.currentValue,
        amcExpiryDate: asset.amcExpiryDate?.toISOString().split('T')[0] ?? null,
        warrantyExpiryDate: asset.warrantyExpiry?.toISOString().split('T')[0] ?? null,
        endOfLife: endOfLifeDate,
        endOfLifeValue: Math.round(effectiveSalvageValue),
        depreciationTimeline: depreciation.depreciationTimeline,
        // Extended fields for UI
        depreciationMethod: getMethodDisplayName(depreciationMethod),
        totalDepreciation: depreciation.totalDepreciation,
        annualDepreciation: depreciation.annualDepreciation,
        yearsElapsed: depreciation.yearsElapsed,
        yearsRemaining: depreciation.yearsRemaining,
        usefulLifeYears,
        currency: asset.currency ?? 'INR',
        hasFinancialData: true,
      };
    } catch {
      // Fall through to default calculation if depreciation fails
    }
  }

  // Fallback: Use simple calculation with defaults when data is missing
  const defaultPurchaseValue = purchaseCost ?? 40000;
  const defaultSalvageValue = salvageValue ?? Math.round(defaultPurchaseValue * 0.1);
  const depreciationRate = 0.2; // 20% per year for fallback

  let currentValue = defaultPurchaseValue;
  if (purchaseDate) {
    const yearsOwned = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    currentValue = Math.max(
      defaultPurchaseValue * (1 - depreciationRate * yearsOwned),
      defaultSalvageValue
    );
  }

  // Build simple timeline for fallback
  const depreciationTimeline: Array<{ date: string; value: number; label: string }> = [];

  if (purchaseDate) {
    depreciationTimeline.push({
      date: purchaseDate.toISOString().split('T')[0],
      value: Math.round(defaultPurchaseValue),
      label: 'Purchase',
    });
  }

  depreciationTimeline.push({
    date: now.toISOString().split('T')[0],
    value: Math.round(currentValue),
    label: 'Today',
  });

  // Add end of life point
  const endOfLifeDate = purchaseDate
    ? new Date(purchaseDate.getTime() + usefulLifeYears * 365.25 * 24 * 60 * 60 * 1000)
    : null;

  if (endOfLifeDate) {
    depreciationTimeline.push({
      date: endOfLifeDate.toISOString().split('T')[0],
      value: Math.round(defaultSalvageValue),
      label: 'End of Life',
    });
  }

  return {
    purchaseDate: purchaseDate?.toISOString().split('T')[0] ?? null,
    purchaseValue: null,
    currentDate: now.toISOString().split('T')[0],
    currentValue: null,
    amcExpiryDate: asset.amcExpiryDate?.toISOString().split('T')[0] ?? null,
    warrantyExpiryDate: asset.warrantyExpiry?.toISOString().split('T')[0] ?? null,
    endOfLife: asset.endOfLife?.toISOString().split('T')[0] ?? null,
    endOfLifeValue: null,
    depreciationTimeline: [],
    // Extended fields - null when no data
    depreciationMethod: null,
    totalDepreciation: null,
    annualDepreciation: null,
    yearsElapsed: null,
    yearsRemaining: null,
    usefulLifeYears: null,
    currency: asset.currency ?? 'INR',
    hasFinancialData: false,
  };
}

export async function getAssetHardware(id: string): Promise<AssetHardware | null> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    include: {
      hardware: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const hw = asset.hardware;
  if (!hw) {
    return null;
  }

  // Use transformer to return rawPayload if available, else construct from summary fields
  const transformed = transformHardwareForAPI(hw);
  if (transformed) {
    // The transformer returns rawPayload directly when available.
    // The rawPayload uses Go agent field names which differ from HardwareResponse:
    // - Agent sends: storageDrives, graphicsAdapters, memory.modules[].capacityGB
    // - HardwareResponse expects: storage, graphicsCards, memory.modules[].capacity
    // We need to handle BOTH formats for compatibility.
    // The raw payload from the agent may contain fields beyond HardwareResponse
    // (e.g. storageDrives, graphicsAdapters, networkAdapters, battery).
    // Cast to Record to access agent-specific field names that aren't on HardwareResponse.
    // The agent raw payload has a dynamic shape; we use a narrow union type instead of `any`.
    type AgentField = string | number | boolean | undefined | null;
    type AgentRecord = Record<string, AgentField>;
    type AgentPayload = Record<string, AgentField | AgentRecord | AgentRecord[]>;
    const rawValue: unknown = transformed;
    const raw = rawValue as AgentPayload;

    // Get storage drives (agent sends "storageDrives", fallback to "storage")
    const storageDrives = (raw.storageDrives || transformed.storage || []) as AgentRecord[];

    // Get memory modules
    const rawMemory = raw.memory as (AgentRecord & { modules?: AgentRecord[] }) | undefined;
    const memoryModules = rawMemory?.modules || [];
    const totalPhysicalGB = (rawMemory?.totalPhysicalGB as number) || transformed.memory?.totalPhysicalGB;

    // Get network adapters (agent might send these in different formats)
    const networkAdapters = (raw.networkAdapters || []) as (AgentRecord & { ipConfiguration?: AgentRecord })[];

    // Get graphics (agent sends "graphicsAdapters")
    const graphicsAdapters = (raw.graphicsAdapters || transformed.graphicsCards || []) as AgentRecord[];

    // Get BIOS info
    const biosInfo = (raw.bios || transformed.bios) as AgentRecord | undefined;

    // Get processor info
    const processorInfo = (raw.processor || transformed.processor) as AgentRecord | undefined;

    // Get system identity for additional fields
    const systemIdentity = (raw.systemIdentity || transformed.systemIdentity) as AgentRecord | undefined;

    // Get battery info
    const batteryInfo = raw.battery as AgentRecord | undefined;

    return {
      bios: biosInfo ? {
        name: biosInfo.vendor || biosInfo.name,
        biosVersion: biosInfo.version,
        manufacturer: biosInfo.vendor,
        installDate: biosInfo.releaseDate,
        description: biosInfo.firmwareType || undefined,
        secureBootState: biosInfo.secureBootEnabled !== undefined
          ? (biosInfo.secureBootEnabled ? 'Enabled' : 'Disabled')
          : undefined,
        serialNumber: systemIdentity?.serialNumber,
      } : undefined,
      processor: processorInfo ? {
        name: processorInfo.name,
        manufacturer: processorInfo.manufacturer,
        numberOfCores: processorInfo.coreCount,
        logicalProcessors: processorInfo.threadCount,
        processorSpeed: processorInfo.clockSpeedMHz ? `${processorInfo.clockSpeedMHz} MHz` : undefined,
        secureBootState: biosInfo?.secureBootEnabled !== undefined
          ? (biosInfo.secureBootEnabled ? 'Enabled' : 'Disabled')
          : undefined,
      } : undefined,
      baseBoard: systemIdentity ? {
        name: systemIdentity.model || 'Unknown',
        partNumber: systemIdentity.sku || undefined,
        productId: systemIdentity.uuid || undefined,
        serialNumber: systemIdentity.serialNumber || undefined,
        tag: systemIdentity.assetTag || undefined,
        version: undefined,
      } : undefined,
      storage: storageDrives.map((s, i: number) => ({
        name: s.name || `Drive ${i + 1}`,
        drive: s.mountPoint || s.deviceId || s.name || `Drive ${i + 1}`,
        capacity: s.capacityGB ? `${Math.round(Number(s.capacityGB))} GB` : undefined,
        used: s.capacityGB && s.freeSpaceGB !== undefined
          ? `${Math.round(Number(s.capacityGB) - Number(s.freeSpaceGB))} GB`
          : undefined,
        format: s.fileSystem || undefined,
        type: s.type || 'Unknown',
        serialNumber: s.serialNumber || undefined,
      })),
      memory: memoryModules.length > 0
        ? memoryModules.map((m, i: number) => ({
            slot: m.slot || `Slot ${i + 1}`,
            name: m.manufacturer || 'Memory Module',
            // Handle both string "capacity" and number "capacityGB"
            capacity: typeof m.capacity === 'string'
              ? m.capacity
              : (m.capacityGB ? `${Math.round(Number(m.capacityGB))} GB` : undefined),
            bankLabel: m.bankLabel || undefined,
            locator: m.slot || undefined,
            memoryType: m.type || m.memoryType || undefined,
            serialNumber: m.serialNumber || undefined,
            partNumber: m.partNumber || undefined,
          }))
        : [{
            slot: 'Total',
            name: 'System Memory',
            capacity: totalPhysicalGB ? `${Math.round(totalPhysicalGB)} GB` : undefined,
          }],
      networkAdapters: networkAdapters.map((n, i: number) => {
        // Handle nested ipConfiguration from agent (ipConfiguration.ipv4Address)
        // Also handle flat structure (ipAddressV4) for compatibility
        const ipConfig = n.ipConfiguration || {} as AgentRecord;
        return {
          id: n.id || `adapter-${i}`,
          name: n.displayName || n.name || `Network Adapter ${i + 1}`,
          type: n.type || undefined,
          status: n.status || undefined,
          ipAddressV4: n.ipAddressV4 || n.ipAddress || ipConfig.ipv4Address || undefined,
          ipAddressV6: n.ipAddressV6 || ipConfig.ipv6Address || undefined,
          macAddress: n.macAddress || undefined,
          dhcpServer: n.dhcpServer || ipConfig.dhcpServer || undefined,
          isDefault: n.isDefault || false,
        };
      }),
      battery: batteryInfo ? {
        id: 'battery-0',
        name: batteryInfo.name || 'Battery',
        health: batteryInfo.healthPercent !== undefined
          ? `${Math.round(Number(batteryInfo.healthPercent))}%`
          : 'Unknown',
        cycleCount: batteryInfo.cycleCount || 0,
        chargeLevel: batteryInfo.chargeLevel || 0,
        chargingStatus: batteryInfo.chargingStatus || 'Unknown',
        batteryCapacity: batteryInfo.designCapacityWh
          ? `${batteryInfo.designCapacityWh} Wh`
          : undefined,
        estimatedRuntime: batteryInfo.estimatedRuntimeMinutes
          ? `${batteryInfo.estimatedRuntimeMinutes} min`
          : undefined,
        temperature: batteryInfo.temperature
          ? `${batteryInfo.temperature}°C`
          : undefined,
      } : undefined,
      graphicsCards: graphicsAdapters.map((g) => ({
        name: g.name || 'Unknown GPU',
        manufacturer: g.manufacturer || undefined,
        driverVersion: g.driverVersion || undefined,
        videoMemoryMB: g.memoryMB || undefined,
        currentResolution: g.resolution || undefined,
      })),
    } as AssetHardware;
  }

  // Fallback to basic fields
  return {
    bios: {
      name: hw.biosVendor || hw.biosVersion || undefined,
      biosVersion: hw.biosVersion || undefined,
      manufacturer: hw.biosVendor || undefined,
    },
    processor: {
      name: hw.cpu || undefined,
      manufacturer: hw.cpuManufacturer || undefined,
      numberOfCores: hw.cpuCores || undefined,
      logicalProcessors: hw.cpuThreads || hw.cpuCores || undefined,
      processorSpeed: hw.cpuSpeedMHz ? `${hw.cpuSpeedMHz} MHz` : undefined,
    },
    baseBoard: hw.manufacturer ? {
      name: hw.model || 'Unknown',
      serialNumber: hw.serialNumber || undefined,
    } : undefined,
    storage: [
      {
        name: 'Primary Drive',
        drive: 'C:',
        capacity: hw.diskTotal ? `${Math.round(Number(hw.diskTotal) / (1024 * 1024 * 1024))} GB` : undefined,
        used: hw.diskTotal && hw.diskFree
          ? `${Math.round((Number(hw.diskTotal) - Number(hw.diskFree)) / (1024 * 1024 * 1024))} GB`
          : undefined,
        type: hw.diskType || 'SSD',
      },
    ],
    memory: [
      {
        slot: 'Slot 1',
        name: 'System Memory',
        capacity: hw.ramTotal ? `${Math.round(Number(hw.ramTotal) / (1024 * 1024 * 1024))} GB` : undefined,
        memoryType: hw.ramType || undefined,
      },
    ],
    networkAdapters: [],
    graphicsCards: hw.gpuModel ? [{
      name: hw.gpuModel,
      videoMemoryMB: hw.gpuMemoryMB || undefined,
    }] : [],
  };
}

export async function getAssetSoftware(id: string): Promise<AssetSoftware | null> {
  const uuid = await resolveAssetId(id);
  // First, get the asset for OS info
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Get the full software inventory from rawPayload
  const softwareInventory = await prisma.assetSoftwareInventory.findUnique({
    where: { assetId: uuid },
  });

  // Extract data from rawPayload if available
  const rawPayload = softwareInventory?.rawPayload as Record<string, unknown> | null;

  // Whitelist of known commercial software (case-insensitive partial match)
  const commercialSoftwareWhitelist = [
    // Microsoft
    'microsoft office',
    'microsoft 365',
    'office 365',
    'microsoft word',
    'microsoft excel',
    'microsoft powerpoint',
    'microsoft outlook',
    'microsoft access',
    'microsoft publisher',
    'microsoft visio',
    'microsoft project',
    'visual studio',
    'sql server',
    // Adobe
    'adobe',
    'acrobat',
    'photoshop',
    'illustrator',
    'premiere',
    'after effects',
    'indesign',
    'lightroom',
    'creative cloud',
    // JetBrains
    'jetbrains',
    'intellij',
    'pycharm',
    'webstorm',
    'phpstorm',
    'rider',
    'clion',
    'goland',
    'rubymine',
    'datagrip',
    // Autodesk
    'autodesk',
    'autocad',
    'maya',
    '3ds max',
    'revit',
    'inventor',
    // Other commercial
    'vmware',
    'parallels',
    'zoom',
    'slack',
    'dropbox',
    'box',
    'salesforce',
    'tableau',
    'splunk',
    'datadog',
    'newrelic',
    'jira',
    'confluence',
    'bitbucket',
    'github enterprise',
    'gitlab',
    'teamviewer',
    'anydesk',
    'norton',
    'mcafee',
    'kaspersky',
    'bitdefender',
    'avast',
    'avg',
    'eset',
    'sophos',
    'crowdstrike',
    'sentinelone',
    'carbon black',
    'malwarebytes',
    'webroot',
    'trend micro',
    '1password',
    'lastpass',
    'dashlane',
    'keeper',
    'bitwarden',
    'nordvpn',
    'expressvpn',
    'cisco',
    'fortinet',
    'palo alto',
    'oracle',
    'sap',
    'servicenow',
    'workday',
    'docusign',
    'adobe sign',
    'figma',
    'sketch',
    'canva',
    'notion',
    'asana',
    'monday.com',
    'trello',
    'basecamp',
    'evernote',
    'onenote',
    'grammarly',
    'snagit',
    'camtasia',
    'screenflow',
    'final cut',
    'logic pro',
    'ableton',
    'fl studio',
    'pro tools',
    'cubase',
    'matlab',
    'mathematica',
    'stata',
    'spss',
    'endnote',
    'mendeley',
    'zotero',
  ];

  // System/built-in app patterns - matches native OS apps
  const systemAppPatterns = [
    // Windows built-in apps
    /^microsoft\s+(store|edge|photos|camera|calculator|clock|calendar|mail|maps|weather|news|people|groove|movies|xbox|cortana|feedback|get help|tips|voice recorder|screen sketch|snipping|sticky notes|your phone|phone link|to do|whiteboard|3d|paint 3d|mixed reality)/i,
    /^windows\s+(security|defender|update|backup|terminal|powershell|notepad|wordpad|media player|fax|dvd|photo viewer)/i,
    /^(internet explorer|microsoft solitaire|microsoft minesweeper|microsoft mahjong|microsoft jigsaw|microsoft sudoku|microsoft treasure hunt|xbox game bar|xbox identity|groove music|movies & tv|mixed reality portal|3d viewer|paint 3d)/i,

    // macOS built-in apps
    /^apple\s+(music|tv|books|podcasts|news|arcade|fitness|wallet|weather|clock|calendar|contacts|reminders|notes|freeform|home|find my|photos|facetime|messages|mail|safari|maps|compass|measure|voice memos|stocks|translate|shortcuts|files|health|journal|configurator|developer)/i,
    /^(safari|finder|preview|textedit|font book|digital color meter|grapher|keychain access|migration assistant|system (preferences|settings|information)|disk utility|activity monitor|console|terminal|screenshot|archive utility|automator|bluetooth file exchange|boot camp|colorsync|dvd player|image capture|launchpad|photo booth|quicktime|siri|time machine|xcode)/i,

    // Linux system apps (GNOME, KDE, etc.)
    /^(gnome-|kde-|systemd|dbus|gvfs|evolution|nautilus|gedit|evince|eog|totem|rhythmbox|cheese|baobab|seahorse|network-manager|bluetooth-manager)/i,
    /^(settings|system settings|software center|software updater|ubuntu software|snap store|flatpak|packagekit|synaptic|update manager|software & updates)/i,

    // Common system utilities
    /^(control panel|device manager|task manager|resource monitor|event viewer|services|registry editor|group policy|disk management|computer management)/i,
  ];

  // Parse applications from rawPayload
  const rawApplications = (rawPayload?.applications as Array<Record<string, unknown>>) || [];
  const applications = rawApplications.map((app, index) => {
    // Parse license data if present and has meaningful data
    const rawLicense = app.license as Record<string, unknown> | undefined;
    let license = undefined;

    if (rawLicense) {
      const licenseData = {
        type: rawLicense.type as string | undefined,
        status: rawLicense.status as string | undefined,
        key: rawLicense.key as string | undefined,
        expirationDate: rawLicense.expirationDate as string | undefined,
        daysRemaining: rawLicense.daysRemaining as number | undefined,
        licensedTo: rawLicense.licensedTo as string | undefined,
        productId: rawLicense.productId as string | undefined,
        channel: rawLicense.channel as string | undefined,
      };

      const appName = ((app.name as string) || '').toLowerCase();
      const licenseType = (licenseData.type || '').toLowerCase();

      // Check if app is in whitelist (commercial software)
      const isWhitelisted = commercialSoftwareWhitelist.some((name) =>
        appName.includes(name.toLowerCase())
      );

      // Check if license type is free/opensource - exclude these
      const isFreeware = ['freeware', 'opensource', 'open source', 'free', 'unknown'].includes(
        licenseType
      );

      // Has an actual tracked license key (masked key like XXXXX-XXXXX-...)
      const hasLicenseKey = !!(licenseData.key && licenseData.key.length > 5);

      // STRICT FILTERING: Only include if:
      // 1. App is in commercial whitelist (regardless of license data), OR
      // 2. Has an actual license key AND is not freeware
      if ((isWhitelisted && !isFreeware) || (hasLicenseKey && !isFreeware)) {
        license = licenseData;
      }
    }

    const appName = (app.name as string) || 'Unknown';

    // Check if app matches system app patterns
    const isSystemApp = systemAppPatterns.some((pattern) => pattern.test(appName));

    return {
      id: `app-${index}`,
      name: appName,
      vendor: app.vendor as string | undefined,
      version: app.version as string | undefined,
      appInstalledOn: app.installDate as string | undefined,
      installSource: app.installSource as string | undefined,
      isSystemApp,
      isManaged: false,
      license,
    };
  });

  // Parse services from rawPayload
  const rawServices = (rawPayload?.services as Array<Record<string, unknown>>) || [];
  const services = rawServices.map((svc, index) => ({
    id: `svc-${index}`,
    name: (svc.name as string) || 'Unknown',
    displayName: svc.displayName as string | undefined,
    state: (svc.status as 'Running' | 'Stopped') || undefined,
    startupType: svc.startupType as string | undefined,
    type: 'Service',
    status: svc.status as string | undefined,
  }));

  // Parse startup programs from rawPayload
  const rawStartupPrograms = (rawPayload?.startupPrograms as Array<Record<string, unknown>>) || [];
  const startupPrograms = rawStartupPrograms.map((prog, index) => ({
    id: `startup-${index}`,
    name: (prog.name as string) || 'Unknown',
    command: prog.command as string | undefined,
    location: prog.location as string | undefined,
    enabled: (prog.enabled as boolean) ?? true,
    vendor: prog.vendor as string | undefined,
  }));

  // Get OS info from rawPayload or fall back to asset fields
  const rawOS = rawPayload?.operatingSystem as Record<string, unknown> | undefined;

  // Merge hub-managed software into the application list
  const managedSoftware = await prisma.assetManagedSoftware.findMany({
    where: { assetId: uuid, status: 'INSTALLED' },
  });

  // Build a set of managed software names (lowercase) for dedup
  const managedNameSet = new Set(managedSoftware.map((ms) => ms.name.toLowerCase()));

  // Mark existing apps as managed if they match a managed software entry
  for (const app of applications) {
    if (managedNameSet.has(app.name.toLowerCase())) {
      (app as Record<string, unknown>).isManaged = true;
      managedNameSet.delete(app.name.toLowerCase());
    }
  }

  // Add remaining managed software entries that aren't in the system list
  for (const ms of managedSoftware) {
    if (managedNameSet.has(ms.name.toLowerCase())) {
      applications.push({
        id: `managed-${ms.id}`,
        name: ms.displayName || ms.name,
        vendor: ms.vendor || undefined,
        version: ms.version,
        appInstalledOn: ms.installedAt?.toISOString(),
        installSource: 'hub',
        isSystemApp: false,
        license: undefined,
        isManaged: true,
      } as typeof applications[0]);
    }
  }

  return {
    os: {
      name: (rawOS?.name as string) || asset.os || 'Unknown',
      version: (rawOS?.version as string) || asset.osVersion || undefined,
      buildNumber: rawOS?.buildNumber as string | undefined,
      architecture: rawOS?.architecture as string | undefined,
      installDate: rawOS?.installDate as string | undefined,
      licenseStatus: rawOS?.licenseStatus as string | undefined,
    },
    applications,
    services,
    startupPrograms,
  };
}

export async function getAssetSecurity(id: string): Promise<AssetSecurity | null> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    include: {
      security: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const sec = asset.security;
  if (!sec) {
    return null;
  }

  return {
    collectedAt: new Date().toISOString(),
    encryption: {
      driveEncryptionEnabled: sec.encryptionEnabled ?? false,
    },
    firewall: {
      enabled: sec.firewallEnabled ?? false,
    },
    antivirus: {
      installed: sec.antivirusInstalled ?? false,
      products: sec.antivirusName
        ? [
            {
              name: sec.antivirusName,
              definitionDate: sec.antivirusUpdated?.toISOString(),
              lastScanDate: sec.lastSecurityScan?.toISOString(),
            },
          ]
        : undefined,
    },
    secureBootEnabled: false,
    uacEnabled: true,
  };
}

export async function getAssetNetwork(id: string): Promise<AssetNetwork | null> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    select: {
      ipAddress: true,
      macAddress: true,
      name: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  return {
    collectedAt: new Date().toISOString(),
    identity: {
      hostname: asset.name,
    },
    adapters: asset.ipAddress
      ? [
          {
            id: 'eth0',
            name: 'Ethernet',
            macAddress: asset.macAddress || undefined,
            status: 'Up',
            ipConfiguration: {
              ipv4Address: asset.ipAddress,
              dhcpEnabled: true,
            },
            isPhysical: true,
            isEnabled: true,
          },
        ]
      : [],
    primaryAdapter: 'eth0',
    vpnConnected: false,
    proxyConfigured: false,
  };
}

export async function getAssetPeripherals(id: string): Promise<AssetPeripherals | null> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    include: {
      peripherals: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Return stored peripheral data from database
  const peripherals = asset.peripherals;
  if (!peripherals || !peripherals.rawPayload) {
    // No peripheral data collected yet
    return {
      collectedAt: new Date().toISOString(),
      monitors: [],
      monitorCount: 0,
      usbDevices: [],
      usbDeviceCount: 0,
      printers: [],
      audioDevices: [],
      bluetoothDevices: [],
      bluetoothEnabled: false,
    };
  }

  // Extract data from rawPayload
  const raw = peripherals.rawPayload as Record<string, unknown>;
  const monitors = (raw.monitors as Array<Record<string, unknown>>) || [];
  const usbDevices = (raw.usbDevices as Array<Record<string, unknown>>) || [];
  const printers = (raw.printers as Array<Record<string, unknown>>) || [];
  const audioDevices = (raw.audioDevices as Array<Record<string, unknown>>) || [];
  const bluetoothDevices = (raw.bluetoothDevices as Array<Record<string, unknown>>) || [];

  return {
    collectedAt: peripherals.collectedAt?.toISOString() || new Date().toISOString(),
    monitors: monitors.map((m, i) => ({
      id: `monitor-${i}`,
      name: (m.name as string) || 'Unknown',
      manufacturer: m.manufacturer as string | undefined,
      model: m.model as string | undefined,
      serialNumber: m.serialNumber as string | undefined,
      resolution: (m.resolution as string) || `${m.widthPx || 0}x${m.heightPx || 0}`,
      refreshRate: m.refreshRate as number | undefined,
      connectionType: m.connectionType as string | undefined,
      isPrimary: (m.isPrimary as boolean) || false,
      isBuiltIn: (m.isBuiltIn as boolean) || false,
    })),
    monitorCount: peripherals.monitorCount,
    usbDevices: usbDevices.map((u, i) => ({
      id: `usb-${i}`,
      name: (u.name as string) || 'Unknown',
      manufacturer: u.manufacturer as string | undefined,
      deviceType: u.deviceType as string | undefined,
      deviceClass: u.deviceClass as string | undefined,
      speed: u.speed as string | undefined,
    })),
    usbDeviceCount: peripherals.usbDeviceCount,
    printers: printers.map((p, i) => ({
      id: `printer-${i}`,
      name: (p.name as string) || 'Unknown',
      driverName: p.driver as string | undefined,
      connectionType: (p.connectionType as string) || 'Unknown',
      status: (p.status as string) || 'Unknown',
      isDefault: (p.isDefault as boolean) || false,
      isNetwork: (p.connectionType as string)?.toLowerCase() === 'network',
    })),
    audioDevices: audioDevices.map((a, i) => ({
      id: `audio-${i}`,
      name: (a.name as string) || 'Unknown',
      type: (a.type as 'Input' | 'Output' | 'Both') || undefined,
      deviceType: a.manufacturer as string | undefined,
      isDefault: (a.isDefault as boolean) || false,
      isEnabled: true,
    })),
    bluetoothDevices: bluetoothDevices.map((b, i) => ({
      id: `bt-${i}`,
      name: (b.name as string) || 'Unknown',
      address: b.address as string | undefined,
      type: b.type as string | undefined,
      connected: (b.connected as boolean) || false,
      paired: (b.paired as boolean) || false,
      batteryLevel: b.batteryLevel as number | undefined,
    })),
    bluetoothEnabled: bluetoothDevices.length > 0,
  };
}

export async function getAssetTelemetry(id: string): Promise<AssetTelemetry | null> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    include: {
      agent: {
        include: {
          telemetry: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const latestTelemetry = asset.agent?.telemetry?.[0];
  if (!latestTelemetry) {
    return null;
  }

  // Use transformer to get rawPayload if available
  const transformed = transformTelemetryForAPI(latestTelemetry);
  if (transformed && latestTelemetry.rawPayload) {
    // rawPayload contains full telemetry from agent
    const raw = transformed as Record<string, unknown>;
    const cpuRaw = raw.cpu as Record<string, unknown> | undefined;
    const memoryRaw = raw.memory as Record<string, unknown> | undefined;
    const diskRaw = raw.disk as Record<string, unknown> | undefined;
    const networkRaw = raw.network as Record<string, unknown> | undefined;
    const processesRaw = raw.processes as Record<string, unknown> | undefined;

    return {
      timestamp: latestTelemetry.timestamp.toISOString(),
      cpu: {
        // Support both old format (usage) and new format (usagePercent)
        usagePercent: cpuRaw?.usagePercent as number ?? cpuRaw?.usage as number ?? latestTelemetry.cpuUsage ?? 0,
        userPercent: cpuRaw?.userPercent as number | undefined,
        systemPercent: cpuRaw?.systemPercent as number | undefined,
        idlePercent: cpuRaw?.idlePercent as number | undefined,
        loadAverage: cpuRaw?.loadAverage as number[] | undefined,
        temperature: cpuRaw?.temperature as number | undefined,
        processCount: processesRaw?.totalCount as number ?? latestTelemetry.processCount ?? undefined,
      },
      memory: {
        usagePercent: memoryRaw?.usagePercent as number ?? memoryRaw?.usage as number ?? latestTelemetry.memoryUsage ?? 0,
        usedBytes: memoryRaw?.usedBytes as number | undefined,
        availableBytes: memoryRaw?.availableBytes as number | undefined,
        totalBytes: memoryRaw?.totalBytes as number | undefined,
        usedHuman: memoryRaw?.usedHuman as string | undefined,
        availableHuman: memoryRaw?.availableHuman as string | undefined,
      },
      disk: {
        drives: diskRaw?.drives as Array<{ mountPoint: string; usagePercent: number; name?: string; usedBytes?: number; availableBytes?: number; totalBytes?: number }> ?? [
          {
            mountPoint: 'C:',
            usagePercent: latestTelemetry.diskUsage ?? 0,
          },
        ],
      },
      network: {
        bytesSentPerSec: networkRaw?.bytesSentPerSec as number | undefined,
        bytesReceivedPerSec: networkRaw?.bytesReceivedPerSec as number | undefined,
        totalBytesSentPerSec: latestTelemetry.networkOutBps ? Number(latestTelemetry.networkOutBps) : undefined,
        totalBytesReceivedPerSec: latestTelemetry.networkInBps ? Number(latestTelemetry.networkInBps) : undefined,
      },
      processes: processesRaw ? {
        totalCount: processesRaw.totalCount as number | undefined,
        runningCount: processesRaw.runningCount as number | undefined,
        topByCpu: (processesRaw.topByCPU || processesRaw.topByCpu) as Array<{ pid: number; name: string; cpuPercent: number }> | undefined,
        topByMemory: processesRaw.topByMemory as Array<{ pid: number; name: string; memoryPercent: number }> | undefined,
      } : undefined,
      systemUptime: formatSystemUptime(latestTelemetry.uptime, raw.systemUptime),
      thermal: raw.thermal as Record<string, unknown> | undefined,
      power: raw.power as Record<string, unknown> | undefined,
      agentUtilization: raw.agentUtilization as Record<string, unknown> | undefined,
      pendingReboot: latestTelemetry.pendingReboot ?? false,
    };
  }

  // Fallback to summary fields
  return {
    timestamp: latestTelemetry.timestamp.toISOString(),
    cpu: {
      usagePercent: latestTelemetry.cpuUsage ?? 0,
      processCount: latestTelemetry.processCount ?? undefined,
    },
    memory: {
      usagePercent: latestTelemetry.memoryUsage ?? 0,
    },
    disk: {
      drives: [
        {
          mountPoint: 'C:',
          usagePercent: latestTelemetry.diskUsage ?? 0,
        },
      ],
    },
    network: {
      totalBytesSentPerSec: latestTelemetry.networkOutBps ? Number(latestTelemetry.networkOutBps) : undefined,
      totalBytesReceivedPerSec: latestTelemetry.networkInBps ? Number(latestTelemetry.networkInBps) : undefined,
    },
    systemUptime: formatSystemUptime(latestTelemetry.uptime, undefined),
    pendingReboot: latestTelemetry.pendingReboot ?? false,
  };
}

export async function getAssetTelemetryHistory(
  id: string,
  period: 'hour' | 'day' | 'week' = 'day'
): Promise<TelemetryHistory> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    select: { agent: { select: { id: true } } },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const hoursMap = { hour: 1, day: 24, week: 168 };
  const hours = hoursMap[period];
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  let telemetry: Prisma.AgentTelemetryGetPayload<object>[] = [];
  if (asset.agent) {
    telemetry = await prisma.agentTelemetry.findMany({
      where: {
        agentId: asset.agent.id,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });
  }

  const mapToDataPoints = (
    data: Prisma.AgentTelemetryGetPayload<object>[],
    getValue: (t: Prisma.AgentTelemetryGetPayload<object>) => number | null
  ): Array<{ timestamp: string; value: number }> => {
    return data
      .filter((t) => getValue(t) !== null)
      .map((t) => ({
        timestamp: t.timestamp.toISOString(),
        value: getValue(t) ?? 0,
      }));
  };

  return {
    cpu: mapToDataPoints(telemetry, (t) => t.cpuUsage),
    memory: mapToDataPoints(telemetry, (t) => t.memoryUsage),
    disk: mapToDataPoints(telemetry, (t) => t.diskUsage),
    networkIn: mapToDataPoints(telemetry, (t) => t.networkInBps ? Number(t.networkInBps) : null),
    networkOut: mapToDataPoints(telemetry, (t) => t.networkOutBps ? Number(t.networkOutBps) : null),
  };
}

export async function getAssetErrors(id: string): Promise<SystemErrors> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    include: {
      agent: {
        include: {
          telemetry: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Default values
  const errors: SystemErrors = {
    applicationCrashCount24h: 0,
    applicationCrashCount7d: 0,
    bsodCount30d: 0,
    systemEventLogErrors24h: 0,
    criticalEventCount24h: 0,
  };

  // Extract error data from latest telemetry if available
  const latestTelemetry = asset.agent?.telemetry?.[0];
  if (latestTelemetry?.rawPayload) {
    const payload = latestTelemetry.rawPayload as Record<string, unknown>;
    const systemErrors = payload.systemErrors as Record<string, unknown> | undefined;

    if (systemErrors) {
      errors.applicationCrashCount24h = (systemErrors.applicationCrashCount24h as number) || 0;
      errors.bsodCount30d = (systemErrors.bsodCount30d as number) || (systemErrors.kernelPanicCount30d as number) || 0;

      // Extract last crash info if available
      const lastCrash = systemErrors.lastCrash as Record<string, unknown> | undefined;
      if (lastCrash) {
        errors.lastCrash = {
          timestamp: (lastCrash.timestamp as string) || '',
          application: (lastCrash.application as string) || 'Unknown',
          errorCode: lastCrash.errorCode as string | undefined,
          description: lastCrash.description as string | undefined,
        };
      }
    }
  }

  return errors;
}

export async function getAssetAuditLog(id: string): Promise<AssetAuditLog[]> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      resource: 'asset',
      resourceId: uuid,
    },
    orderBy: { timestamp: 'desc' },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    user: log.user?.name || log.user?.email || 'System',
    details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
  }));
}
