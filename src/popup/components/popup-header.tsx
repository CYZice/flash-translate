import { PanelRightOpen } from "lucide-react";
import { useState } from "react";
import { getMessage } from "@/shared/utils/i18n";
import iconUrl from "/icons/icon-32.png";

export function PopupHeader() {
  const [isOpeningSidePanel, setIsOpeningSidePanel] = useState(false);

  const handleOpenSidePanel = async () => {
    if (isOpeningSidePanel || !chrome.sidePanel?.open) {
      return;
    }

    setIsOpeningSidePanel(true);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id !== undefined) {
        await chrome.sidePanel.open({ tabId: tab.id });
        window.close();
      }
    } catch {
      // The side panel cannot open on some browser-internal pages.
    } finally {
      setIsOpeningSidePanel(false);
    }
  };

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-gray-200 border-b bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50">
          <img
            alt=""
            className="h-6 w-6"
            height={24}
            src={iconUrl}
            width={24}
          />
        </span>
        <div className="min-w-0">
          <span className="block truncate font-semibold text-gray-900 text-sm">
            {getMessage("popup_header_title")}
          </span>
          <span className="block truncate text-[11px] text-gray-400">
            {getMessage("popup_header_subtitle")}
          </span>
        </div>
      </div>
      <button
        aria-label={getMessage("popup_header_sidePanel")}
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-wait disabled:opacity-50"
        disabled={isOpeningSidePanel}
        onClick={handleOpenSidePanel}
        title={getMessage("popup_header_sidePanel")}
        type="button"
      >
        <PanelRightOpen aria-hidden="true" size={16} />
      </button>
    </header>
  );
}
