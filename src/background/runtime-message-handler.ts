import { isOpenSettingsMessage } from "@/shared/constants/runtime-messages";

interface RuntimeMessageHandlerDependencies {
  onError: (error: unknown) => void;
  openOptionsPage: () => Promise<void>;
}

export function handleRuntimeMessage(
  message: unknown,
  dependencies: RuntimeMessageHandlerDependencies
): void {
  if (!isOpenSettingsMessage(message)) {
    return;
  }

  dependencies.openOptionsPage().catch(dependencies.onError);
}
