import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export default function signWindows(
  context: ElectronPackager.Context
): void {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== "win32") {
    return;
  }

  const cscLink = process.env.CSC_LINK;
  const cscKeyPassword = process.env.CSC_KEY_PASSWORD;

  if (!cscLink || !cscKeyPassword) {
    console.warn(
      "CSC_LINK or CSC_KEY_PASSWORD not set. Skipping Windows code signing."
    );
    return;
  }

  const certPath = join(appOutDir, "certificate.pfx");

  if (!existsSync(certPath)) {
    console.warn(
      `Certificate not found at ${certPath}. Skipping Windows code signing.`
    );
    return;
  }

  try {
    const exeFiles = execSync(
      `find "${appOutDir}" -name "*.exe" -type f`
    )
      .toString()
      .split("\n")
      .filter((f: string) => f.length > 0);

    if (exeFiles.length === 0) {
      console.warn("No .exe files found for signing.");
      return;
    }

    for (const exeFile of exeFiles) {
      console.log(`Signing ${exeFile}...`);
      execSync(
        `signtool sign /f "${certPath}" /p "${cscKeyPassword}" /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 "${exeFile}"`,
        { stdio: "inherit" }
      );
      console.log(`Signed ${exeFile}`);
    }

    console.log("Windows code signing completed successfully.");
  } catch (error) {
    console.error("Windows code signing failed:", error);
    process.exit(1);
  }
}
