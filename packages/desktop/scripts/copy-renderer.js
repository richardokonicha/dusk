const fs = require("fs");
const path = require("path");

const rendererDist = path.resolve(__dirname, "..", "..", "packages", "renderer", "dist");
const desktopRendererOut = path.resolve(__dirname, "..", "out", "renderer");

if (!fs.existsSync(rendererDist)) {
  console.error("[copy-renderer] Renderer dist not found. Run renderer build first.");
  process.exit(1);
}

if (fs.existsSync(desktopRendererOut)) {
  fs.rmSync(desktopRendererOut, { recursive: true, force: true });
}

fs.mkdirSync(desktopRendererOut, { recursive: true });

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(rendererDist, desktopRendererOut);
console.log("[copy-renderer] Copied renderer dist to out/renderer");
