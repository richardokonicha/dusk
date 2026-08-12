import { WorkspaceOrganizer } from "../services/workspace-organizer";
import { FileService } from "../services/file-service";
import { ArtifactService } from "../services/artifact-service";
import { ProviderService } from "../services/provider/provider-service";
import { SecureStorageService } from "../services/secure-storage";
import { DatabaseService } from "../services/db";
import { AgentOrchestrator, type AgentOrchestratorOptions } from "../services/agent-runtime";
import { LLMRouterClient } from "../services/agent-runtime/llm-router-client";
import { JobQueueService } from "../services/job-queue";
import { CspManager, createCspManager } from "../security/csp";
import { URLValidator, createDefaultUrlValidator } from "../security/url-validator";

export interface SecurityServices {
  csp: CspManager;
  urlValidator: URLValidator;
}

export interface SecurityServices {
  csp: CspManager;
  urlValidator: URLValidator;
}

export interface ContainerOptions {
  security?: Partial<SecurityServices>;
}

export class Container {
  private static instance: Container | null = null;

  private constructor(
    public readonly workspaceOrganizer: WorkspaceOrganizer,
    public readonly fileService: FileService,
    public readonly artifactService: ArtifactService,
    public readonly providerService: ProviderService,
    public readonly secureStorage: SecureStorageService,
    public readonly jobQueue: JobQueueService,
    public readonly agentRuntime: AgentOrchestrator,
    public readonly security: SecurityServices
  ) {}

  static async create(options: ContainerOptions = {}): Promise<Container> {
    if (Container.instance) {
      return Container.instance;
    }

    const dbService = DatabaseService.getInstance();
    await dbService.initialize();

    const secureStorage = new SecureStorageService(dbService.raw);
    await secureStorage.initialize();

    const providerService = new ProviderService(secureStorage);
    const jobQueue = new JobQueueService();

    const providerRouter = providerService.getRouter();
    const llmClient = new LLMRouterClient(providerRouter);

    const orchestratorOptions: AgentOrchestratorOptions = {
      llmClient,
      db: {
        drizzle: dbService.drizzle,
        raw: dbService.raw
      },
      jobQueueService: jobQueue
    };

    const agentRuntime = new AgentOrchestrator(orchestratorOptions);

    jobQueue.setAgentRuntime({
      getAgent: (id: string) => agentRuntime.getAgent(id) || undefined
    });
    jobQueue.start();

    const isDev = process.env.NODE_ENV !== "production";

    const csp = options.security?.csp ??
      createCspManager({
        nonceLength: 32,
        allowedScriptSrc: isDev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
        allowedStyleSrc: isDev
          ? ["'self'", "'unsafe-inline'"]
          : ["'self'", "'nonce-{CSP_NONCE}'"],
        allowedImgSrc: ["'self'", "data:", "https:"],
        allowedFontSrc: ["'self'", "data:"],
        allowedConnectSrc: ["'self'", "https:"],
        allowedFrameSrc: ["'none'"],
      });

    const urlValidator = options.security?.urlValidator ?? createDefaultUrlValidator();

    const security: SecurityServices = {
      csp,
      urlValidator,
    };

    Container.instance = new Container(
      new WorkspaceOrganizer(),
      new FileService(new WorkspaceOrganizer()),
      new ArtifactService(new WorkspaceOrganizer()),
      providerService,
      secureStorage,
      jobQueue,
      agentRuntime,
      security
    );

    return Container.instance;
  }

  async initialize(): Promise<void> {
    await this.workspaceOrganizer.initialize();
  }

  async shutdown(): Promise<void> {
    await this.jobQueue.stop();
    this.agentRuntime.shutdown();
  }
}
