import { IpcMainInvokeEvent } from "electron";

const isDev = process.env.NODE_ENV !== "production";

const ALLOWED_DEV_ORIGIN = "http://localhost:5173";

export function validateSender(event: IpcMainInvokeEvent): boolean {
  if (event.senderFrame && !(event.senderFrame as any).isMain()) {
    return false;
  }

  const url = event.sender.getURL();

  if (isDev) {
    return url.startsWith(ALLOWED_DEV_ORIGIN);
  }

  return url.startsWith("data:text/html") || url.startsWith("file://");
}
