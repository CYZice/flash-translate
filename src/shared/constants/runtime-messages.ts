export const OPEN_SETTINGS_MESSAGE = {
  type: "OPEN_SETTINGS",
} as const;

export function isOpenSettingsMessage(
  message: unknown
): message is typeof OPEN_SETTINGS_MESSAGE {
  if (typeof message !== "object" || message === null) {
    return false;
  }

  return "type" in message && message.type === OPEN_SETTINGS_MESSAGE.type;
}
