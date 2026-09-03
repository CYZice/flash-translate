import { ExclusionSettings } from "./components/exclusion-settings";
import { Footer } from "./components/footer";
import { LanguageSettings } from "./components/language-settings";
import { PopupHeader } from "./components/popup-header";
import { ProviderSettings } from "./components/provider-settings";
import { TranslationBehaviorSettings } from "./components/translation-behavior-settings";

export default function App() {
  return (
    <div className="flex max-h-1/2 min-w-96 flex-col overflow-y-auto bg-white/90 backdrop-blur-sm">
      <PopupHeader />
      <div className="flex-1 divide-y divide-gray-100">
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
