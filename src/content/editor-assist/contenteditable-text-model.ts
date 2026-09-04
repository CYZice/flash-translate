const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DD",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TD",
  "TH",
  "TR",
  "UL",
]);

export interface TextSegment {
  end: number;
  node: Text;
  start: number;
}

export interface ContentTextModel {
  boundaries: WeakMap<Node, number[]>;
  segments: TextSegment[];
  text: string;
}

function appendNewline(parts: string[]): void {
  if (parts.length > 0 && parts.at(-1) !== "\n") {
    parts.push("\n");
  }
}

function appendTextNode(
  node: Text,
  parts: string[],
  segments: TextSegment[]
): void {
  if (!node.data) {
    return;
  }
  const start = parts.join("").length;
  segments.push({ start, end: start + node.data.length, node });
  parts.push(node.data);
}

export function buildContentTextModel(root: HTMLElement): ContentTextModel {
  const parts: string[] = [];
  const segments: TextSegment[] = [];
  const boundaries = new WeakMap<Node, number[]>();

  // Keep the traversal and its boundary offsets as the single source of truth.
  const walk = (node: Node, isRoot = false): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendTextNode(node as Text, parts, segments);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tag = element.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
      return;
    }
    if (tag === "BR") {
      parts.push("\n");
      return;
    }

    const isBlock = !isRoot && BLOCK_TAGS.has(tag);
    if (isBlock) {
      appendNewline(parts);
    }
    const before = parts.length;
    const childBoundaries = [parts.join("").length];
    for (const child of Array.from(element.childNodes)) {
      walk(child);
      childBoundaries.push(parts.join("").length);
    }
    boundaries.set(element, childBoundaries);
    if (isBlock && (parts.length > before || element.childNodes.length === 0)) {
      appendNewline(parts);
    }
  };

  walk(root, true);
  return { boundaries, segments, text: parts.join("") };
}

export function domPositionToTextOffset(
  model: ContentTextModel,
  container: Node,
  offset: number
): number {
  if (container.nodeType === Node.TEXT_NODE) {
    const segment = model.segments.find(({ node }) => node === container);
    if (segment) {
      return segment.start + Math.min(offset, segment.end - segment.start);
    }
  }

  const elementBoundary = model.boundaries.get(container);
  if (elementBoundary) {
    return elementBoundary[Math.min(offset, elementBoundary.length - 1)] ?? 0;
  }

  try {
    const boundaryRange = document.createRange();
    boundaryRange.setStart(container, offset);
    boundaryRange.collapse(true);
    for (const segment of model.segments) {
      const segmentStart = document.createRange();
      segmentStart.setStart(segment.node, 0);
      segmentStart.collapse(true);
      const segmentEnd = document.createRange();
      segmentEnd.setStart(segment.node, segment.node.length);
      segmentEnd.collapse(true);
      if (
        boundaryRange.compareBoundaryPoints(
          Range.START_TO_START,
          segmentStart
        ) <= 0
      ) {
        return segment.start;
      }
      if (
        boundaryRange.compareBoundaryPoints(Range.START_TO_START, segmentEnd) <
        0
      ) {
        return segment.start;
      }
    }
  } catch {
    // The selection may belong to a replaced or detached editor.
  }
  return model.segments.at(-1)?.end ?? 0;
}

export function textRangeToDomRange(
  model: ContentTextModel,
  start: number,
  end: number
): Range | null {
  const startSegment = model.segments.find((segment) => segment.end > start);
  const endSegments = model.segments.filter((segment) => segment.start < end);
  const endSegment = endSegments.at(-1);
  if (!(startSegment && endSegment)) {
    return null;
  }
  if (
    !(startSegment.node.ownerDocument && endSegment.node.ownerDocument) ||
    startSegment.node.ownerDocument !== endSegment.node.ownerDocument
  ) {
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(
      startSegment.node,
      Math.max(
        0,
        Math.min(start - startSegment.start, startSegment.node.length)
      )
    );
    range.setEnd(
      endSegment.node,
      Math.max(0, Math.min(end - endSegment.start, endSegment.node.length))
    );
    return range;
  } catch {
    return null;
  }
}
