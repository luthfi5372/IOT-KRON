export interface SensorMaintenanceState {
  // pH Probe (pH-4502C)
  phOperatingSeconds: number;
  phMaxOperatingHours: number; // default: 50 hours
  lastPhCalibrationDate: number; // timestamp ms
  phCalibrationCount: number;

  // TDS Probe (Analog TDS)
  tdsOperatingSeconds: number;
  tdsMaxOperatingHours: number; // default: 100 hours
  lastTdsCalibrationDate: number; // timestamp ms
  tdsCalibrationCount: number;

  // Temperature Sensor (DS18B20)
  tempOperatingSeconds: number;

  // Notification UI state
  reminderDismissed: boolean;
}

export const DEFAULT_MAINTENANCE_STATE: SensorMaintenanceState = {
  // Default with realistic starting operating time: 48.5 hours for pH (approaching 50h threshold)
  // and 64 hours for TDS, so users can see the feature working immediately
  phOperatingSeconds: 48.5 * 3600, // 48.5 hours
  phMaxOperatingHours: 50, // 50 hours threshold
  lastPhCalibrationDate: Date.now() - 48.5 * 3600 * 1000,
  phCalibrationCount: 3,

  tdsOperatingSeconds: 64.2 * 3600, // 64.2 hours
  tdsMaxOperatingHours: 100, // 100 hours threshold
  lastTdsCalibrationDate: Date.now() - 64.2 * 3600 * 1000,
  tdsCalibrationCount: 2,

  tempOperatingSeconds: 120 * 3600,
  reminderDismissed: false,
};
