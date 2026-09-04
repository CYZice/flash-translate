import { ExclusionSettings } from "./components/exclusion-settings";
import { Footer } from "./components/footer";
import { LanguageSettings } from "./components/language-settings";
import { PopupHeader } from "./components/popup-header";
import { ProviderSettings } from "./components/provider-settings";
import { TranslationBehaviorSettings } from "./components/translation-behavior-settings";

export default function App() {
  return (
    <div className="flex h-auto max-h-[600px] w-96 flex-col overflow-hidden bg-white/90 backdrop-blur-sm">
      <PopupHeader />
      <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
        <section className="bg-white">
          <LanguageSettings />
        </section>
        <section className="bg-gray-50/50">
          <ProviderSettings />
        </section>
        <section className="bg-gray-50/50">
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
