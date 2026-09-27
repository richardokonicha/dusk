import { loggerService } from '@logger'
import type { Tab } from '@shared/data/cache/cacheValueTypes'

const logger = loggerService.withContext('TabLRU')

/**
 * Tab LRU limits configuration
 *
 * Controls when inactive tabs should be hibernated to save memory.
 * TODO: Can be injected from preferences later
 */
export const TAB_LIMITS = {
  /**
   * Soft cap: trigger LRU hibernation when active tab count exceeds this value
   * Default 10, adjustable based on actual memory usage
   */
  softCap: 10,

  /**
   * Hard fuse: extreme fallback to prevent runaway
   * When active tab count exceeds this value, force hibernation of excess
   */
  hardCap: 22
}

export type TabLimits = typeof TAB_LIMITS

/**
 * TabLruManager - Manages tab LRU hibernation strategy
 *
 * Features:
 * - When active tab count exceeds soft cap, select LRU candidates for hibernation
 * - Hard fuse as extreme fallback to prevent memory runaway
 * - Supports exemption mechanism: current tab, default chat tab, pinned tabs don't participate in soft cap hibernation
 */
export class TabLruManager {
  private softCap: number
  private hardCap: number

  constructor(limits: TabLimits = TAB_LIMITS) {
    this.softCap = limits.softCap
    this.hardCap = limits.hardCap
  }

  /**
   * Check and return list of tab IDs that need hibernation
   *
   * Strategy:
   * - Exceeds softCap: hibernate down to softCap
   * - Exceeds hardCap: force hibernate down to softCap (ignore some exemptions, keep only current + default chat tabs)
   *
   * @param tabs All tabs
   * @param activeTabId Currently active tab ID
   * @returns Array of tab IDs to hibernate
   */
  checkAndGetDormantCandidates(tabs: Tab[], activeTabId: string): string[] {
    const activeTabs = tabs.filter((t) => !t.isDormant)
    const activeCount = activeTabs.length

    // Below soft cap, no hibernation needed
    if (activeCount <= this.softCap) {
      return []
    }

    const isHardCapTriggered = activeCount > this.hardCap

    const candidates = isHardCapTriggered
      ? this.getHardCapCandidates(activeTabs, activeTabId)
      : this.getLRUCandidates(activeTabs, activeTabId)

    let toHibernateCount = activeCount - this.softCap

    if (isHardCapTriggered) {
      logger.warn('Hard cap triggered - using relaxed exemption rules', {
        activeCount,
        hardCap: this.hardCap,
        softCap: this.softCap,
        toHibernate: toHibernateCount
      })
    }

    // Can only hibernate available candidates
    toHibernateCount = Math.min(toHibernateCount, candidates.length)

    const afterHibernation = activeCount - toHibernateCount
    if (isHardCapTriggered && afterHibernation > this.hardCap) {
      logger.error('Cannot guarantee hard cap - insufficient candidates', {
        activeCount,
        candidatesAvailable: candidates.length,
        willHibernate: toHibernateCount,
        afterHibernation,
        hardCap: this.hardCap
      })
    } else if (afterHibernation > this.softCap) {
      logger.warn('Cannot reach soft cap - limited by available candidates', {
        activeCount,
        candidatesAvailable: candidates.length,
        willHibernate: toHibernateCount,
        afterHibernation,
        softCap: this.softCap
      })
    }

    const result = candidates.slice(0, toHibernateCount).map((t) => t.id)

    if (result.length > 0) {
      logger.info('Tabs selected for hibernation', {
        count: result.length,
        ids: result,
        activeCount,
        softCap: this.softCap,
        hardCapTriggered: isHardCapTriggered
      })
    }

    return result
  }

  /**
   * Hard fuse candidate list (only exempt current tab and default chat tab)
   */
  private getHardCapCandidates(tabs: Tab[], activeTabId: string): Tab[] {
    return tabs
      .filter((tab) => !this.isHardExempt(tab, activeTabId))
      .sort((a, b) => (a.lastAccessTime ?? 0) - (b.lastAccessTime ?? 0))
  }

  private isHardExempt(tab: Tab, activeTabId: string): boolean {
    return tab.id === activeTabId || tab.id === 'home' || tab.isDormant === true
  }

  private getLRUCandidates(tabs: Tab[], activeTabId: string): Tab[] {
    return tabs
      .filter((tab) => !this.isExempt(tab, activeTabId))
      .sort((a, b) => (a.lastAccessTime ?? 0) - (b.lastAccessTime ?? 0))
  }

  /**
   * Check if tab is exempt from hibernation
   *
   * Exemption conditions:
   * - Current active tab
   * - Default chat tab (id === 'home')
   * - Pinned tab (isPinned)
   * - Already dormant tab (don't process again)
   */
  private isExempt(tab: Tab, activeTabId: string): boolean {
    return (
      tab.id === activeTabId || // Current active tab
      tab.id === 'home' || // Default chat tab (must match TabsContext DEFAULT_TAB.id)
      tab.isPinned === true || // Pinned tab
      tab.isDormant === true // Already dormant, don't process again
    )
  }

  /**
   * Update soft cap (for future settings page)
   */
  updateSoftCap(newSoftCap: number): void {
    this.softCap = newSoftCap
    logger.info('SoftCap updated', { newSoftCap })
  }

  /**
   * Update hard cap (for future settings page)
   */
  updateHardCap(newHardCap: number): void {
    this.hardCap = newHardCap
    logger.info('HardCap updated', { newHardCap })
  }

  /**
   * Get current configuration
   */
  getLimits(): TabLimits {
    return {
      softCap: this.softCap,
      hardCap: this.hardCap
    }
  }
}
