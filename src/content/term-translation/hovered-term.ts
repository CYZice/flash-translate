export interface ViewportRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface HoveredTerm {
  sourceText: string;
  contextText: string;
  anchorRect: ViewportRect;
}

export interface TermTranslationResult {
  sourceText: string;
  translatedText: string;
  contextText: string;
  sourceLanguage: string;
  targetLanguage: string;
}
