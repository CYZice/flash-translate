const CHAT_COMPLETIONS_SUFFIX = "/chat/completions";

function parseHttpUrl(baseUrl: string): URL {
  const url = new URL(baseUrl.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Base URL must use http:// or https://");
  }
  return url;
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const url = parseHttpUrl(baseUrl);
  url.hash = "";
  url.search = "";
  const normalizedPath = stripTrailingSlashes(url.pathname);
  if (normalizedPath.endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    url.pathname = normalizedPath;
    return url.toString();
  }
  url.pathname = `${normalizedPath}${CHAT_COMPLETIONS_SUFFIX}`;
  return url.toString();
}

export function buildModelsUrl(baseUrl: string): string {
  const url = parseHttpUrl(baseUrl);
  url.hash = "";
  url.search = "";
  let normalizedPath = stripTrailingSlashes(url.pathname);
  if (normalizedPath.endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    normalizedPath = normalizedPath.slice(0, -CHAT_COMPLETIONS_SUFFIX.length);
  }
  url.pathname = `${normalizedPath}/models`;
  return url.toString();
}

export function getAiHostPermissionPattern(baseUrl: string): string {
  const url = parseHttpUrl(baseUrl);
  return `${url.protocol}//${url.hostname}/*`;
}
