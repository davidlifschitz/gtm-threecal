import { JSDOM } from "jsdom";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load index.html with its inline and local scripts, like opening it from disk.
export function load() {
  let html = readFileSync(join(root, "index.html"), "utf8");
  html = html.replace(/<script([^>]*)\ssrc="([^"]+)"([^>]*)><\/script>/g, (m, a, src, b) => {
    const p = join(root, src);
    return existsSync(p) ? `<script${a}${b}>${readFileSync(p, "utf8")}</script>` : m;
  });
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w.navigator, "clipboard", { value: { writeText: async (t) => { w.__clip = t; } }, configurable: true });
  return w;
}
