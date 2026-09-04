import { ExclusionSettings } from "./components/exclusion-settings";
import { Footer } from "./components/footer";
import { LanguageSettings } from "./components/language-settings";
import { PopupHeader } from "./components/popup-header";
import { ProviderSettings } from "./components/provider-settings";
import { TranslationBehaviorSettings } from "./components/translation-behavior-settings";

export default function App() {
  return (
    <div className="flex h-auto max-h-[600px] w-96 flex-col overflow-hidden bg-gray-100 font-sans text-gray-900">
      <PopupHeader />
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto py-1.5">
        <section className="bg-white">
          <LanguageSettings />
        </section>
        <section className="bg-white">
          <ProviderSettings />
        </section>
        <section className="bg-white">
          <TranslationBehaviorSettings />
        </section>
        <section className="bg-white">
          <ExclusionSettings />
        </section>
      </div>
      <Footer />
    </div>
  );
}
