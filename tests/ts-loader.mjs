import { registerHooks } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "next/headers") {
            const nextFile = path.join(repoRoot, "node_modules", "next", "headers.js");
            return nextResolve(pathToFileURL(nextFile).href, context);
        }
        if (specifier.startsWith("@/")) {
            const rel = specifier.slice(2);
            const candidateBase = path.join(repoRoot, rel);
            for (const ext of ["", ".ts", ".tsx", ".js", "/index.ts", "/index.js"]) {
                const full = candidateBase + ext;
                if (fs.existsSync(full) && fs.statSync(full).isFile()) {
                    return nextResolve(pathToFileURL(full).href, context);
                }
            }
        }
        if (
            (specifier.startsWith("./") || specifier.startsWith("../")) &&
            context.parentURL &&
            context.parentURL.startsWith("file://") &&
            !context.parentURL.includes("node_modules")
        ) {
            const parentDir = path.dirname(fileURLToPath(context.parentURL));
            const candidateBase = path.resolve(parentDir, specifier);
            if (!fs.existsSync(candidateBase)) {
                for (const ext of [".ts", ".tsx", ".js", "/index.ts", "/index.js"]) {
                    const full = candidateBase + ext;
                    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
                        return nextResolve(pathToFileURL(full).href, context);
                    }
                }
            }
        }
        return nextResolve(specifier, context);
    },
});
