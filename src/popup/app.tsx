import { DisplaySettings } from "./components/display-settings";
import { Footer } from "./components/footer";
import { LanguageSettings } from "./components/language-settings";
import { PopupHeader } from "./components/popup-header";
import { ProviderSettings } from "./components/provider-settings";
import { TranslationBehaviorSettings } from "./components/translation-behavior-settings";
import { UsageStatistics } from "./components/usage-statistics";

export default function App() {
  return (
    <div className="flex h-auto max-h-[640px] w-96 flex-col overflow-hidden bg-gray-100 font-sans text-gray-900">
      <PopupHeader />
      <main className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-100 px-2.5 py-2.5">
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <LanguageSettings />
        </section>
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <DisplaySettings />
        </section>
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <TranslationBehaviorSettings />
        </section>
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <ProviderSettings />
        </section>
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <UsageStatistics />
        </section>
      </main>
      <Footer />
    </div>
  );
}
