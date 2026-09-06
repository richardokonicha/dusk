import { BaseService, Injectable, Phase, ServicePhase } from '@main/core/lifecycle'

@Injectable('ProviderRegistryUpdaterService')
@ServicePhase(Phase.WhenReady)
export class ProviderRegistryUpdaterService extends BaseService {
  protected onReady(): void {
  }

  public async check(): Promise<void> {
  }
}
