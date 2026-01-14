// Peripheral Device Types
// Based on contracts/schemas/peripheral.schema.json

// Monitor Types
export type MonitorConnectionType =
  | 'HDMI'
  | 'DisplayPort'
  | 'USB-C'
  | 'Thunderbolt'
  | 'VGA'
  | 'DVI'
  | 'Internal'
  | 'Unknown';

export type MonitorOrientation = 'Landscape' | 'Portrait' | 'LandscapeFlipped' | 'PortraitFlipped';

export type Monitor = {
  id?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  connectionType?: MonitorConnectionType;
  resolution?: string;
  nativeResolution?: string;
  refreshRate?: number;
  screenSizeInches?: number;
  physicalWidthMm?: number;
  physicalHeightMm?: number;
  bitDepth?: number;
  isPrimary?: boolean;
  isBuiltIn?: boolean;
  scalingPercent?: number;
  orientation?: MonitorOrientation;
  yearOfManufacture?: number;
  weekOfManufacture?: number;
};

// USB Device Types
export type USBDeviceClass =
  | 'HID'
  | 'MassStorage'
  | 'Audio'
  | 'Video'
  | 'Printer'
  | 'Hub'
  | 'Communications'
  | 'SmartCard'
  | 'Wireless'
  | 'Other';

export type USBVersion = '1.0' | '1.1' | '2.0' | '3.0' | '3.1' | '3.2' | '4.0' | 'Unknown';
export type USBSpeed = 'Low' | 'Full' | 'High' | 'Super' | 'SuperPlus' | 'Unknown';

export type USBDevice = {
  id?: string;
  name?: string;
  manufacturer?: string;
  productId?: string;
  vendorId?: string;
  serialNumber?: string;
  deviceClass?: USBDeviceClass;
  deviceType?: string;
  usbVersion?: USBVersion;
  speed?: USBSpeed;
  portNumber?: number;
  hubPort?: string;
  isHub?: boolean;
  currentDrawMa?: number;
  driverName?: string;
  driverVersion?: string;
  isRemovable?: boolean;
  connectedAt?: string;
};

// Docking Station Types
export type DockConnectionType = 'Thunderbolt' | 'USB-C' | 'USB-A' | 'Proprietary';

export type DockPortCounts = {
  usb_a?: number;
  usb_c?: number;
  thunderbolt?: number;
  hdmi?: number;
  displayPort?: number;
  ethernet?: number;
  audio?: number;
  sdCard?: number;
};

export type DockingStation = {
  id?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  connectionType?: DockConnectionType;
  powerDeliveryWatts?: number;
  connectedDevices?: string[];
  availablePorts?: DockPortCounts;
};

// Printer Types
export type PrinterConnectionType = 'USB' | 'Network' | 'Bluetooth' | 'WiFi' | 'Shared' | 'Virtual';
export type PrinterStatus =
  | 'Ready'
  | 'Offline'
  | 'Error'
  | 'Busy'
  | 'PaperJam'
  | 'LowToner'
  | 'Unknown';
export type PrinterCapability = 'Print' | 'Scan' | 'Copy' | 'Fax' | 'Duplex' | 'Color';

export type Printer = {
  id?: string;
  name?: string;
  driverName?: string;
  portName?: string;
  connectionType?: PrinterConnectionType;
  ipAddress?: string;
  status?: PrinterStatus;
  isDefault?: boolean;
  isShared?: boolean;
  isNetwork?: boolean;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  capabilities?: PrinterCapability[];
};

// Audio Device Types
export type AudioDeviceIOType = 'Output' | 'Input' | 'Both';
export type AudioDeviceType =
  | 'Speaker'
  | 'Headphones'
  | 'Microphone'
  | 'Headset'
  | 'LineIn'
  | 'LineOut'
  | 'HDMI'
  | 'DisplayPort'
  | 'Bluetooth'
  | 'USB'
  | 'Built-in'
  | 'Unknown';
export type AudioConnectionType = 'Internal' | 'USB' | 'Bluetooth' | 'HDMI' | 'Jack' | 'Unknown';

export type AudioDevice = {
  id?: string;
  name?: string;
  type?: AudioDeviceIOType;
  deviceType?: AudioDeviceType;
  isDefault?: boolean;
  isEnabled?: boolean;
  manufacturer?: string;
  driverVersion?: string;
  connectionType?: AudioConnectionType;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
};

// Bluetooth Device Types
export type BluetoothDeviceType =
  | 'Keyboard'
  | 'Mouse'
  | 'Headphones'
  | 'Speaker'
  | 'Phone'
  | 'Tablet'
  | 'Computer'
  | 'Gamepad'
  | 'Other';

export type BluetoothDevice = {
  id?: string;
  name?: string;
  address?: string;
  type?: BluetoothDeviceType;
  connected?: boolean;
  paired?: boolean;
  batteryLevel?: number;
  manufacturer?: string;
  lastConnected?: string;
};

// Webcam Types
export type Webcam = {
  name?: string;
  manufacturer?: string;
  resolution?: string;
  isBuiltIn?: boolean;
};

// Complete Peripheral Inventory Type
export type PeripheralInventory = {
  collectedAt: string;
  monitors?: Monitor[];
  monitorCount?: number;
  usbDevices?: USBDevice[];
  usbDeviceCount?: number;
  dockingStations?: DockingStation[];
  printers?: Printer[];
  audioDevices?: AudioDevice[];
  bluetoothDevices?: BluetoothDevice[];
  bluetoothEnabled?: boolean;
  webcams?: Webcam[];
};

// Export all types
export type {
  Monitor as PeripheralMonitor,
  USBDevice as PeripheralUSBDevice,
  DockingStation as PeripheralDockingStation,
  Printer as PeripheralPrinter,
  AudioDevice as PeripheralAudioDevice,
  BluetoothDevice as PeripheralBluetoothDevice,
  Webcam as PeripheralWebcam,
};
