import { ipcMain } from "electron";
import { z } from "zod";
import { ProviderService } from "../../services/provider/provider-service";
import { SecureStorageService } from "../../services/secure-storage";
import { Container } from "../../core/container";
import { validateSender } from "../../security/sender-validator";
import { channels } from "../channels";

const providerListSchema = z.object({});

const providerAddSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["openai", "anthropic", "gemini", "ollama", "custom"]),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
  apiKeyRef: z.string().optional(),
  models: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
  priority: z.number().default(0),
  timeout: z.number().default(60000),
  maxRetries: z.number().default(2),
  extraHeaders: z.record(z.string()).optional(),
});

const providerUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  type: z.enum(["openai", "anthropic", "gemini", "ollama", "custom"]).optional(),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
  apiKeyRef: z.string().optional(),
  models: z.array(z.string()).optional(),
  priority: z.number().optional(),
  timeout: z.number().optional(),
  maxRetries: z.number().optional(),
  extraHeaders: z.record(z.string()).optional(),
});

const providerTestSchema = z.object({
  providerId: z.string(),
});

const providerGetModelsSchema = z.object({
  providerId: z.string(),
});

const providerDeleteSchema = z.object({
  id: z.string(),
});

export function registerProviderHandlers(container: Container): void {
  const providerService = container.providerService;
  const secureStorage = container.secureStorage;

  ipcMain.handle(channels.provider.list, async (event) => {
    if (!validateSender(event)) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" },
      };
    }
    try {
      const providers = providerService.listWithInfo();
      return { success: true, data: providers };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "PROVIDER_LIST_ERROR",
          message: error instanceof Error ? error.message : "Failed to list providers",
        },
      };
    }
  });

  ipcMain.handle(channels.provider.add, async (event, input: unknown) => {
    if (!validateSender(event)) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" },
      };
    }
    try {
      const validated = providerAddSchema.parse(input);

      if (validated.apiKey && validated.apiKeyRef) {
        try {
          await secureStorage.set(validated.apiKeyRef, validated.apiKey);
        } catch (storageError) {
          return {
            success: false,
            error: {
              code: "SECURE_STORAGE_ERROR",
              message:
                storageError instanceof Error
                  ? storageError.message
                  : "Failed to store API key",
            },
          };
        }
      }

      const id = `provider-${Date.now()}`;
      const config = {
        id,
        name: validated.name,
        type: validated.type,
        baseURL: validated.baseURL || "",
        apiKeyRef: validated.apiKeyRef,
        models: validated.models?.map((m) => ({
          id: m,
          name: m,
          provider: id,
          supportsStreaming: true,
          supportsTools: true,
        })),
        enabled: true,
        priority: validated.priority,
        timeout: validated.timeout,
        maxRetries: validated.maxRetries,
        extraHeaders: validated.extraHeaders,
      };

      await providerService.registerProvider(config);
      return { success: true, data: { id, name: validated.name, type: validated.type } };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors.map((e) => e.message).join(", "),
          },
        };
      }
      return {
        success: false,
        error: {
          code: "PROVIDER_ADD_ERROR",
          message: error instanceof Error ? error.message : "Failed to add provider",
        },
      };
    }
  });

  ipcMain.handle(channels.provider.update, async (event, input: unknown) => {
    if (!validateSender(event)) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" },
      };
    }
    try {
      const validated = providerUpdateSchema.parse(input) as z.infer<typeof providerUpdateSchema> & { enabled: boolean; priority: number; timeout: number; maxRetries: number };

      if (validated.apiKey && validated.apiKeyRef) {
        try {
          await secureStorage.set(validated.apiKeyRef, validated.apiKey);
        } catch (storageError) {
          return {
            success: false,
            error: {
              code: "SECURE_STORAGE_ERROR",
              message:
                storageError instanceof Error
                  ? storageError.message
                  : "Failed to store API key",
            },
          };
        }
      }

      await providerService.updateProvider(validated.id, {
        name: validated.name,
        type: validated.type,
        baseURL: validated.baseURL,
        apiKeyRef: validated.apiKeyRef,
        models: validated.models?.map((m) => ({
          id: m,
          name: m,
          provider: validated.id,
          supportsStreaming: true,
          supportsTools: true,
        })),
        enabled: validated.enabled,
        priority: validated.priority,
        timeout: validated.timeout,
        maxRetries: validated.maxRetries,
        extraHeaders: validated.extraHeaders,
      });
      return { success: true, data: { id: validated.id } };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors.map((e) => e.message).join(", "),
          },
        };
      }
      return {
        success: false,
        error: {
          code: "PROVIDER_UPDATE_ERROR",
          message: error instanceof Error ? error.message : "Failed to update provider",
        },
      };
    }
  });

  ipcMain.handle(channels.provider.delete, async (event, input: unknown) => {
    if (!validateSender(event)) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" },
      };
    }
    try {
      const validated = providerDeleteSchema.parse(input);
      providerService.unregisterProvider(validated.id);
      return { success: true, data: { id: validated.id } };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors.map((e) => e.message).join(", "),
          },
        };
      }
      return {
        success: false,
        error: {
          code: "PROVIDER_DELETE_ERROR",
          message: error instanceof Error ? error.message : "Failed to delete provider",
        },
      };
    }
  });

  ipcMain.handle(channels.provider.test, async (event, input: unknown) => {
    if (!validateSender(event)) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" },
      };
    }
    try {
      const validated = providerTestSchema.parse(input);
      const result = await providerService.testConnection(validated.providerId);
      return { success: result.success, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors.map((e) => e.message).join(", "),
          },
        };
      }
      return {
        success: false,
        error: {
          code: "PROVIDER_TEST_ERROR",
          message: error instanceof Error ? error.message : "Failed to test provider",
        },
      };
    }
  });

  ipcMain.handle(channels.provider.getModels, async (event, input: unknown) => {
    if (!validateSender(event)) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" },
      };
    }
    try {
      const validated = providerGetModelsSchema.parse(input);
      const models = await providerService.listModels(validated.providerId);
      return { success: true, data: models };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors.map((e) => e.message).join(", "),
          },
        };
      }
      return {
        success: false,
        error: {
          code: "PROVIDER_GET_MODELS_ERROR",
          message: error instanceof Error ? error.message : "Failed to get models",
        },
      };
    }
  });
}
