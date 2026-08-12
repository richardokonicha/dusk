import { readdirSync, statSync } from "fs";
import { join } from "path";

function checkDirectory(dir: string, base: string = ""): void {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = join(base, entry.name);
    const fullPath = join(dir, entry.name);

    if (
      entry.name === "reference" ||
      relativePath.includes("/reference/") ||
      relativePath.includes("\\reference\\")
    ) {
      console.error(
        `AGPL CONTAMINATION RISK: Found reference/ path in build output: ${relativePath}`
      );
      console.error(
        "The reference/ directory contains Cherry Studio (AGPL-3.0) code and must not be included in builds."
      );
      process.exit(1);
    }

    if (entry.isDirectory()) {
      checkDirectory(fullPath, relativePath);
    }
  }
}

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function main(): void {
  const distDir = join(process.cwd(), "dist");

  if (!existsSync(distDir)) {
    console.error(`Build output directory not found: ${distDir}`);
    process.exit(1);
  }

  console.log("Verifying that reference/ is excluded from build output...");
  checkDirectory(distDir);
  console.log("SUCCESS: No reference/ paths found in build output.");
}

main();
