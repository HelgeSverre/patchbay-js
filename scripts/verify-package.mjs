import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporary = mkdtempSync(join(tmpdir(), "patchbay-package-"));
try {
  const [pack] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", temporary], { encoding: "utf8" }),
  );
  assert(pack.files.some((file) => file.path === "dist/patchbay.cjs"));
  assert(!pack.files.some((file) => /^(profiles|tests|scripts|node_modules)\//.test(file.path)));
  writeFileSync(join(temporary, "package.json"), JSON.stringify({ private: true, type: "module" }));
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(temporary, pack.filename)], {
    cwd: temporary,
    stdio: "pipe",
  });
  for (const [format, load] of [
    ["module", "import Patchbay from 'patchbay.js'"],
    ["commonjs", "const Patchbay = require('patchbay.js')"],
  ]) {
    execFileSync(
      process.execPath,
      [
        `--input-type=${format}`,
        "-e",
        `${load}; requireCheck(); function requireCheck() { if (typeof Patchbay !== 'function') throw new Error('Missing constructor'); }`,
      ],
      { cwd: temporary, stdio: "inherit" },
    );
    console.log(`Installed package ${format} import passed`);
  }
  console.log(`Package contents passed (${pack.files.length} files, ${pack.size} bytes)`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
