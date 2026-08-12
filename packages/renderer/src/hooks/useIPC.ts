import { useEffect, useCallback, useRef } from "react";
import { ipcClient } from "@shared/ipc";
import type { IPCChannel } from "@shared/ipc";

export function useIPC<T = unknown>(
  channel: IPCChannel,
  callback: (data: T) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = ipcClient.on(channel, (data: unknown) => {
      callbackRef.current(data as T);
    });

    return () => {
      unsubscribe();
    };
  }, [channel]);
}

export function useIPCInvoke() {
  const invoke = useCallback(<T = unknown>(channel: IPCChannel, ...args: unknown[]): Promise<T> => {
    return ipcClient.invoke<T>(channel, ...args);
  }, []);

  return { invoke };
}

export function useIPCEvent<T = unknown>(channel: IPCChannel, callback: (data: T) => void): void {
  useIPC<T>(channel, callback);
}

export function useIPCOff(channel: IPCChannel, callback: (data: unknown) => void): void {
  useEffect(() => {
    return () => {
      ipcClient.off(channel, callback);
    };
  }, [channel, callback]);
}
