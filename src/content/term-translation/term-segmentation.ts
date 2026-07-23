export interface TermSegment {
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface TermSegmentationRequest {
  text: string;
  offset: number;
  language: string;
}

export interface TermSegmentationStrategy {
  segmentAt: (request: TermSegmentationRequest) => TermSegment | null;
}

function createSegmenter(language: string): Intl.Segmenter {
  try {
    return new Intl.Segmenter(language, { granularity: "word" });
  } catch {
    return new Intl.Segmenter(undefined, { granularity: "word" });
  }
}

function containsOffset(
  startOffset: number,
  endOffset: number,
  offset: number
): boolean {
  return startOffset <= offset && offset < endOffset;
}

export const intlWordSegmentationStrategy: TermSegmentationStrategy = {
  segmentAt({ text, offset, language }) {
    if (offset < 0 || offset > text.length) {
      return null;
    }

    const segments = createSegmenter(language).segment(text);
    const offsetsToCheck = offset > 0 ? [offset, offset - 1] : [offset];

    for (const offsetToCheck of offsetsToCheck) {
      for (const segment of segments) {
        const endOffset = segment.index + segment.segment.length;
        if (
          segment.isWordLike &&
          containsOffset(segment.index, endOffset, offsetToCheck)
        ) {
          return {
            text: segment.segment,
            startOffset: segment.index,
            endOffset,
          };
        }
      }
    }

    return null;
  },
};
