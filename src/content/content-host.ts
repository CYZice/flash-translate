export function isolateContentHost(host: HTMLElement): void {
  host.setAttribute(
    "style",
    "all: initial !important; position: relative !important; z-index: 2147483647 !important"
  );
}
