// Bundles the Electron main process and preload script with esbuild.
// Native deps (better-sqlite3) and node builtins stay external so Electron
// resolves them at runtime (and electron-builder unpacks the native binary).
import { build } from "esbuild";
import { rmSync } from "node:fs";

const external = [
  "electron",
  "better-sqlite3",
  "imapflow",
  "nodemailer",
  "mailparser",
];

const common = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: false,
  external,
  logLevel: "info",
};

rmSync("dist-electron", { recursive: true, force: true });

await build({
  ...common,
  entryPoints: ["src/main/index.ts"],
  outfile: "dist-electron/main/index.js",
});

await build({
  ...common,
  entryPoints: ["src/main/preload.ts"],
  outfile: "dist-electron/preload/index.js",
});

console.log("[build-electron] main + preload bundled -> dist-electron/");
