import { describe, expect, it, vi } from "vitest";
import { OPEN_SETTINGS_MESSAGE } from "@/shared/constants/runtime-messages";
import { handleRuntimeMessage } from "./runtime-message-handler";

describe("handleRuntimeMessage", () => {
  it("opens the options page for the open-settings message", () => {
    const openOptionsPage = vi.fn().mockResolvedValue(undefined);

    handleRuntimeMessage(OPEN_SETTINGS_MESSAGE, {
      onError: vi.fn(),
      openOptionsPage,
    });

    expect(openOptionsPage).toHaveBeenCalledOnce();
  });

  it("ignores unrelated messages", () => {
    const openOptionsPage = vi.fn().mockResolvedValue(undefined);

    handleRuntimeMessage(
      { type: "GET_CURRENT_URL" },
      {
        onError: vi.fn(),
        openOptionsPage,
      }
    );

    expect(openOptionsPage).not.toHaveBeenCalled();
  });
});
