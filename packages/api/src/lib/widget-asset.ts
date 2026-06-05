import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** Resolved path to built embed bundle (monorepo layout). */
export function resolveWidgetJsPath(): string | null {
  const candidates = [
    path.resolve(__dirname, "../../../embed/dist/widget.js"),
    path.resolve(__dirname, "../../embed/dist/widget.js"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}
