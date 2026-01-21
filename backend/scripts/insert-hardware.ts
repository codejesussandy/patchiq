import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hardwareData = {
  "collectedAt": "2026-01-21T18:07:48Z",
  "systemIdentity": {
    "manufacturer": "Apple Inc.",
    "model": "MacBook Air",
    "serialNumber": "G1CVJW3R6K",
    "uuid": "C54BEEFB-3001-59B3-AD95-213FFD910011"
  },
  "bios": {
    "vendor": "Apple Inc.",
    "version": "15.1",
    "firmwareType": "UEFI",
    "secureBootEnabled": false
  },
  "processor": {
    "name": "Apple M4",
    "manufacturer": "Apple",
    "architecture": "arm64",
    "coreCount": 10,
    "threadCount": 10,
    "clockSpeedMHz": 4000
  },
  "memory": {
    "totalPhysicalGB": 16,
    "usedSlots": 1,
    "modules": [
      { "slot": "Onboard", "capacityGB": 16, "type": "LPDDR5", "speedMHz": 6400 }
    ]
  },
  "storageDrives": [
    {
      "name": "Macintosh HD",
      "deviceId": "/dev/disk3s1s1",
      "type": "SSD",
      "capacityGB": 460,
      "freeSpaceGB": 359,
      "fileSystem": "APFS",
      "mountPoint": "/"
    }
  ],
  "battery": {
    "present": true,
    "healthPercent": 100,
    "cycleCount": 41,
    "chargeLevel": 56,
    "chargingStatus": "Discharging",
    "designCapacityWh": 58
  },
  "graphicsAdapters": [
    { "name": "Apple M4 GPU", "manufacturer": "Apple", "memoryMB": 0 }
  ]
};

async function main() {
  const assetId = '71e29481-89cd-4eda-adc9-1f04354d2e44';
  
  // Check if hardware record exists
  const existing = await prisma.assetHardware.findUnique({
    where: { assetId }
  });
  
  if (existing) {
    // Update
    await prisma.assetHardware.update({
      where: { assetId },
      data: {
        cpu: hardwareData.processor.name,
        cpuCores: hardwareData.processor.coreCount,
        cpuManufacturer: hardwareData.processor.manufacturer,
        cpuThreads: hardwareData.processor.threadCount,
        cpuSpeedMHz: hardwareData.processor.clockSpeedMHz,
        ramTotal: BigInt(hardwareData.memory.totalPhysicalGB * 1024 * 1024 * 1024),
        ramSlots: hardwareData.memory.usedSlots,
        ramType: 'LPDDR5',
        diskTotal: BigInt(hardwareData.storageDrives[0].capacityGB * 1024 * 1024 * 1024),
        diskFree: BigInt(hardwareData.storageDrives[0].freeSpaceGB * 1024 * 1024 * 1024),
        diskType: hardwareData.storageDrives[0].type,
        biosVendor: hardwareData.bios.vendor,
        biosVersion: hardwareData.bios.version,
        manufacturer: hardwareData.systemIdentity.manufacturer,
        model: hardwareData.systemIdentity.model,
        serialNumber: hardwareData.systemIdentity.serialNumber,
        rawPayload: hardwareData,
        collectedAt: new Date(hardwareData.collectedAt)
      }
    });
    console.log('Hardware record updated');
  } else {
    // Create
    await prisma.assetHardware.create({
      data: {
        assetId,
        cpu: hardwareData.processor.name,
        cpuCores: hardwareData.processor.coreCount,
        cpuManufacturer: hardwareData.processor.manufacturer,
        cpuThreads: hardwareData.processor.threadCount,
        cpuSpeedMHz: hardwareData.processor.clockSpeedMHz,
        ramTotal: BigInt(hardwareData.memory.totalPhysicalGB * 1024 * 1024 * 1024),
        ramSlots: hardwareData.memory.usedSlots,
        ramType: 'LPDDR5',
        diskTotal: BigInt(hardwareData.storageDrives[0].capacityGB * 1024 * 1024 * 1024),
        diskFree: BigInt(hardwareData.storageDrives[0].freeSpaceGB * 1024 * 1024 * 1024),
        diskType: hardwareData.storageDrives[0].type,
        biosVendor: hardwareData.bios.vendor,
        biosVersion: hardwareData.bios.version,
        manufacturer: hardwareData.systemIdentity.manufacturer,
        model: hardwareData.systemIdentity.model,
        serialNumber: hardwareData.systemIdentity.serialNumber,
        rawPayload: hardwareData,
        collectedAt: new Date(hardwareData.collectedAt)
      }
    });
    console.log('Hardware record created');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
