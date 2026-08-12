import { notarize } from "electron-notarize";

export default async function notarizeMac(
  context: ElectronPackager.Context
): Promise<void> {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productName;

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD || !process.env.APPLE_TEAM_ID) {
    throw new Error(
      "Missing required environment variables for notarization: APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID"
    );
  }

  console.log(`Notarizing ${appName}.app...`);

  await notarize({
    tool: "notarytool",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log("Notarization completed successfully.");
}
