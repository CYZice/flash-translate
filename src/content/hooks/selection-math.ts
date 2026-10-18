const MATH_SELECTOR = ".katex,mjx-container,math";

export function getMathRoot(node: Node): Element | null {
  const element = node.nodeType === 1 ? (node as Element) : node.parentElement;
  const root = element?.closest(MATH_SELECTOR) ?? null;
  // A MathML representation belongs to its enclosing KaTeX/MathJax formula.
  return root?.closest(".katex,mjx-container") ?? root;
}

interface MathBudget {
  characters: number;
  nodes: number;
  exceeded: boolean;
}

function readMathText(node: Node, budget: MathBudget): string {
  const walker = node.ownerDocument?.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT
  );
  let current = node.nodeType === 3 ? node : walker?.nextNode();
  const parts: string[] = [];
  while (current) {
    const text = current as Text;
    if (budget.nodes-- <= 0 || text.length > budget.characters) {
      budget.exceeded = true;
      break;
    }
    parts.push(text.substringData(0, text.length));
    budget.characters -= text.length;
    current = walker?.nextNode();
  }
  return parts.join("");
}

function serializeMath(node: Node, budget: MathBudget): string {
  if (budget.nodes-- <= 0) {
    budget.exceeded = true;
    return "";
  }
  if (node.nodeType === 3) {
    return readMathText(node, budget);
  }
  if (!(node instanceof Element)) {
    return "";
  }
  const name = node.localName;
  if (name === "annotation" || name === "annotation-xml") {
    return "";
  }
  const parts: string[] = [];
  const children = node.children.length > 0 ? node.children : node.childNodes;
  for (const child of children) {
    if (budget.exceeded) {
      break;
    }
    parts.push(serializeMath(child, budget));
  }
  return formatMath(name, parts, node.firstElementChild?.localName === "mrow");
}

function formatMath(name: string, parts: string[], groupBase: boolean): string {
  const base = groupBase ? `{${parts[0] ?? ""}}` : (parts[0] ?? "");
  switch (name) {
    case "mfrac":
      return `\\frac{${parts[0] ?? ""}}{${parts[1] ?? ""}}`;
    case "msup":
      return `${base}^{${parts[1] ?? ""}}`;
    case "msub":
      return `${base}_{${parts[1] ?? ""}}`;
    case "msubsup":
      return `${base}_{${parts[1] ?? ""}}^{${parts[2] ?? ""}}`;
    case "msqrt":
      return `\\sqrt{${parts.join("")}}`;
    case "mroot":
      return `\\sqrt[${parts[1] ?? ""}]{${parts[0] ?? ""}}`;
    default:
      return parts.join("");
  }
}

/** Only substitute a complete formula; a partial selection stays partial. */
export function isWholeMathSelected(
  range: Range,
  root: Element,
  maxNodes = Number.POSITIVE_INFINITY
): boolean {
  if (
    range.comparePoint(root, 0) === 0 &&
    range.comparePoint(root, root.childNodes.length) === 0
  ) {
    return true;
  }
  const visual =
    root.querySelector(".katex-html,mjx-math,svg,semantics > :first-child") ??
    root;
  const walker = root.ownerDocument.createTreeWalker(
    visual,
    NodeFilter.SHOW_TEXT
  );
  let first: Text | null = null;
  let last: Text | null = null;
  let node = walker.nextNode();
  let visited = 0;
  while (node) {
    if (visited++ >= maxNodes) {
      return false;
    }
    if (node.textContent?.replace(/[\u200b-\u200d\ufeff]/g, "").trim()) {
      first ??= node as Text;
      last = node as Text;
    }
    node = walker.nextNode();
  }
  return (
    first !== null &&
    last !== null &&
    range.comparePoint(first, 0) === 0 &&
    range.comparePoint(last, last.length) === 0
  );
}

export function getMathText(
  root: Element,
  maxCharacters = Number.POSITIVE_INFINITY,
  maxNodes = Number.POSITIVE_INFINITY
): string {
  const attribute =
    root.getAttribute("data-latex") ?? root.getAttribute("data-tex");
  if (attribute?.trim()) {
    return attribute.length <= maxCharacters ? attribute.trim() : "";
  }
  const budget: MathBudget = {
    characters: maxCharacters,
    nodes: maxNodes,
    exceeded: false,
  };
  const annotation = root.querySelector(
    "annotation[encoding='application/x-tex']"
  );
  const source = annotation ? readMathText(annotation, budget) : "";
  if (budget.exceeded) {
    return "";
  }
  if (source?.trim()) {
    return source.trim();
  }
  const math = root.localName === "math" ? root : root.querySelector("math");
  if (math) {
    const text = serializeMath(math, budget);
    return budget.exceeded || text.length > maxCharacters ? "" : text;
  }
  const visual = root.querySelector(".katex-html,mjx-math");
  const label = root.getAttribute("aria-label");
  const textNode = visual ?? root.querySelector("svg title,svg text");
  const text = textNode ? readMathText(textNode, budget) : (label ?? "");
  return budget.exceeded || text.length > maxCharacters ? "" : text;
}
