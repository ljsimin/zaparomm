import esbuild from "esbuild";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const targets = ["chrome", "firefox"];
const watch = process.argv.includes("--watch");

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
}

async function copy(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function buildManifest(target) {
  const base = await readJson("manifest.base.json");
  const override = await readJson(`manifest.${target}.json`);
  const merged = { ...base, ...override };
  const outDir = path.join(root, "dist", target);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(merged, null, 2));
}

async function copyStaticAssets(target) {
  const outDir = path.join(root, "dist", target);
  await copy(path.join(root, "src/options/options.html"), path.join(outDir, "options.html"));

  const iconsDir = path.join(root, "src/icons");
  const iconFiles = (await fs.readdir(iconsDir)).filter((f) => f.endsWith(".png"));
  for (const file of iconFiles) {
    await copy(path.join(iconsDir, file), path.join(outDir, "icons", file));
  }
}

async function runEsbuild() {
  const entryPoints = {
    background: "src/background/background.ts",
    content: "src/content/content-entry.ts",
    options: "src/options/options.ts",
  };

  const buildOptionsFor = (target) => ({
    entryPoints,
    bundle: true,
    outdir: path.join(root, "dist", target),
    format: "esm",
    target: "es2022",
    sourcemap: true,
    logLevel: "info",
  });

  for (const target of targets) {
    const opts = buildOptionsFor(target);
    if (watch) {
      const ctx = await esbuild.context(opts);
      await ctx.watch();
    } else {
      await esbuild.build(opts);
    }
  }
}

async function main() {
  for (const target of targets) {
    await buildManifest(target);
    await copyStaticAssets(target);
  }
  await runEsbuild();
  if (watch) {
    console.log("Watching for changes...");
  } else {
    console.log("Build complete: dist/chrome, dist/firefox");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
