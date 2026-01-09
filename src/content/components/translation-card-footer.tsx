import { CopyButton } from "./copy-button";

interface TranslationCardFooterProps {
  result: string | null;
}

export function TranslationCardFooter({ result }: TranslationCardFooterProps) {
  return (
    <div className="fixed right-0 bottom-0 left-0 flex items-center justify-end rounded-b-xl px-3 py-2">
      <CopyButton text={result} />
    </div>
  );
}
