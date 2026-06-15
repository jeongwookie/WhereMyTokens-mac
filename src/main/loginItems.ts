import { app } from 'electron';

export function syncLoginItemSettings(openAtLogin: boolean): void {
  try {
    if (app.getLoginItemSettings().openAtLogin === openAtLogin) return;
  } catch {
    // If Electron cannot read the current state, fall back to applying the requested setting.
  }
  try {
    app.setLoginItemSettings({ openAtLogin });
  } catch (error) {
    console.warn('Unable to update login item settings', error);
  }
}
