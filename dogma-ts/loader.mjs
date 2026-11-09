import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const srcDir = path.resolve(import.meta.dirname, "./src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      const base = path.join(srcDir, rel);
      for (const candidate of [
        base,
        `${base}.ts`,
        `${base}.js`,
        path.join(base, "index.ts"),
        path.join(base, "index.js"),
      ]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      specifier.endsWith(".js") &&
      context.parentURL?.startsWith("file:")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const tsCandidate = path.resolve(
        parentDir,
        `${specifier.slice(0, -3)}.ts`,
      );
      if (fs.existsSync(tsCandidate) && fs.statSync(tsCandidate).isFile()) {
        return nextResolve(pathToFileURL(tsCandidate).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
