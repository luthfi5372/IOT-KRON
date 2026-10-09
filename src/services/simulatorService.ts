import { TelemetryPayload, PumpState } from '../types/telemetry';

export type SimMode = 'dynamic' | 'normal' | 'acidic' | 'alkaline' | 'low_battery';

export class SimulatorService {
  private intervalId: number | null = null;
  private currentMode: SimMode = 'dynamic';
  private currentTemp = 28.4;
  private currentPh = 7.35;
  private currentTds = 465;
  private currentBattery = 86;
  private onTickCallback?: (payload: TelemetryPayload) => void;

  public setMode(mode: SimMode) {
    this.currentMode = mode;
    if (mode === 'normal') {
      this.currentPh = 7.25;
      this.currentTemp = 28.2;
      this.currentTds = 420;
      this.currentBattery = 85;
    } else if (mode === 'acidic') {
      this.currentPh = 5.95;
      this.currentTemp = 27.8;
      this.currentTds = 540;
      this.currentBattery = 78;
    } else if (mode === 'alkaline') {
      this.currentPh = 8.95;
      this.currentTemp = 29.1;
      this.currentTds = 610;
      this.currentBattery = 74;
    } else if (mode === 'low_battery') {
      this.currentPh = 7.10;
      this.currentTemp = 28.5;
      this.currentTds = 450;
      this.currentBattery = 14; // Triggers critical low battery warning
    }
  }

  public getMode(): SimMode {
    return this.currentMode;
  }

  public start(intervalMs: number, onTick: (payload: TelemetryPayload) => void) {
    this.stop();
    this.onTickCallback = onTick;

    // Emit initial payload immediately
    this.generateAndEmit();

    this.intervalId = window.setInterval(() => {
      this.generateAndEmit();
    }, intervalMs);
  }

  public stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public isRunning(): boolean {
    return this.intervalId !== null;
  }

  public generatePayload(): TelemetryPayload {
    // Determine fluctuations based on mode
    if (this.currentMode === 'dynamic') {
      // Natural aquatic wave drift
      const deltaTemp = (Math.random() - 0.48) * 0.15;
      const deltaPh = (Math.random() - 0.5) * 0.08;
      const deltaTds = (Math.random() - 0.5) * 6;

      this.currentTemp = Math.max(20, Math.min(38, this.currentTemp + deltaTemp));
      this.currentPh = Math.max(4.0, Math.min(10.5, this.currentPh + deltaPh));
      this.currentTds = Math.max(100, Math.min(1200, this.currentTds + deltaTds));
    } else if (this.currentMode === 'normal') {
      this.currentPh = 7.15 + (Math.random() - 0.5) * 0.3;
      this.currentTemp = 28.0 + (Math.random() - 0.5) * 0.4;
      this.currentTds = 420 + Math.round((Math.random() - 0.5) * 15);
    } else if (this.currentMode === 'acidic') {
      // Stay acidic < 6.5
      this.currentPh = 5.85 + (Math.random() - 0.5) * 0.3;
      this.currentTemp = 27.6 + (Math.random() - 0.5) * 0.4;
      this.currentTds = 530 + Math.round((Math.random() - 0.5) * 20);
    } else if (this.currentMode === 'alkaline') {
      // Stay alkaline > 8.5
      this.currentPh = 8.85 + (Math.random() - 0.5) * 0.35;
      this.currentTemp = 29.3 + (Math.random() - 0.5) * 0.4;
      this.currentTds = 590 + Math.round((Math.random() - 0.5) * 20);
    } else if (this.currentMode === 'low_battery') {
      this.currentBattery = Math.max(8, this.currentBattery - 0.05);
    }

    if (this.currentMode !== 'low_battery') {
      // Very slow natural drain
      this.currentBattery = Math.max(12, this.currentBattery - 0.02);
    }

    const roundedPh = Number(this.currentPh.toFixed(2));
    const roundedTemp = Number(this.currentTemp.toFixed(1));
    const roundedTds = Math.round(this.currentTds);
    const roundedBattery = Math.max(0, Math.min(100, Math.round(this.currentBattery)));
    // Estimate 3S LiPo voltage: 10.0V (0%) to 12.6V (100%)
    const roundedVoltage = Number((10.0 + (roundedBattery / 100) * 2.6).toFixed(2));

    let pompaUp: PumpState = 'OFF';
    let pompaDown: PumpState = 'OFF';
    let status = 'NORMAL';

    if (roundedPh < 6.5) {
      pompaUp = 'ON';
      pompaDown = 'OFF';
      status = 'DOSING_UP';
    } else if (roundedPh > 8.5) {
      pompaUp = 'OFF';
      pompaDown = 'ON';
      status = 'DOSING_DOWN';
    } else {
      pompaUp = 'OFF';
      pompaDown = 'OFF';
      status = 'NORMAL';
    }

    return {
      suhu_c: roundedTemp,
      ph: roundedPh,
      tds_ppm: roundedTds,
      baterai_persen: roundedBattery,
      tegangan_v: roundedVoltage,
      pompa_up: pompaUp,
      pompa_down: pompaDown,
      status: status,
      timestamp: Date.now(),
    };
  }

  private generateAndEmit() {
    const payload = this.generatePayload();
    this.onTickCallback?.(payload);
  }
}
