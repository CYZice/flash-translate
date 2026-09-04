import { getMessage } from "@/shared/utils/i18n";
import iconUrl from "/icons/icon-32.png";

export function PopupHeader() {
  return (
    <header className="flex shrink-0 items-center gap-2.5 border-gray-200 border-b bg-white px-4 py-3">
      <img alt="" className="h-6 w-6" height={24} src={iconUrl} width={24} />
      <span className="font-semibold text-gray-900 text-sm">
        {getMessage("popup_header_title")}
      </span>
    </header>
  );
}
