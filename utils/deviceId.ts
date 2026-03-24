const DEVICE_ID_KEY = 'xueqiu_tracker_device_id';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate a unique device ID using timestamp and random string
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
};

export const resetDeviceId = (): string => {
  const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  return newDeviceId;
};