import { ipcMain } from "electron";
import { Container } from "../../core/container";
import { IpcChannel } from "../../../../../shared/dist/src/IpcChannel.js";
import {
  jobListSchema,
  jobGetSchema,
  jobCancelSchema,
  jobRetrySchema,
} from "../validator";
import { validateSender } from "../../security/sender-validator";

export function registerJobHandlers(container: Container): void {
  const jobQueue = container.jobQueue;

  ipcMain.handle(IpcChannel.Job_List, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { workspaceId, agentId, status } = jobListSchema.parse(raw);
      const jobs = await jobQueue.listJobs(workspaceId, agentId);
      const filtered = status ? jobs.filter((j) => j.status === status) : jobs;
      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: { code: "JOB_LIST_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(IpcChannel.Job_Get, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { jobId } = jobGetSchema.parse(raw);
      const job = await jobQueue.getJob(jobId);
      if (!job) {
        return { success: false, error: { code: "JOB_NOT_FOUND", message: `Job ${jobId} not found` } };
      }
      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: { code: "JOB_GET_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(IpcChannel.Job_Cancel, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { jobId } = jobCancelSchema.parse(raw);
      const job = await jobQueue.cancel(jobId);
      if (!job) {
        return { success: false, error: { code: "JOB_NOT_FOUND", message: `Job ${jobId} not found` } };
      }
      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: { code: "JOB_CANCEL_ERROR", message: (error as Error).message } };
    }
  });

  ipcMain.handle(IpcChannel.Job_Retry, async (event, raw) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    try {
      const { jobId } = jobRetrySchema.parse(raw);
      const job = await jobQueue.retryJob(jobId);
      if (!job) {
        return { success: false, error: { code: "JOB_NOT_FOUND", message: `Job ${jobId} not found or not failed` } };
      }
      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: { code: "JOB_RETRY_ERROR", message: (error as Error).message } };
    }
  });
}
