import { getProviderLabelKey } from '@renderer/i18n/label'
import i18n from '@renderer/i18n/resolver'
import { isSystemProvider, isSystemProviderId, type Provider } from '@renderer/types/provider'

/**
 * Extract default group name from model ID.
 * Rules:
 * 1. First delimiter rule: split by first occurring delimiter, take part 0 as group name.
 * 2. Second delimiter rule: take first two parts joined (e.g. 'a-b-c' -> 'a-b').
 * 3. Otherwise return id.
 *
 * Examples:
 * - 'gpt-3.5-turbo-16k-0613' => 'gpt-3.5'
 * - 'qwen3:32b' => 'qwen3'
 * - 'Qwen/Qwen3-32b' => 'qwen'
 * - 'deepseek-r1' => 'deepseek-r1'
 * - 'o3' => 'o3'
 *
 * @param {string} id Model ID string
 * @param {string} [provider] Provider ID string
 * @returns {string} Extracted group name
 */
export const getDefaultGroupName = (id: string, provider?: string): string => {
  const str = id.toLowerCase()

  // Define delimiters
  let firstDelimiters = ['/', ' ', ':']
  let secondDelimiters = ['-', '_']

  if (provider && ['aihubmix', 'silicon', 'ocoolai', 'o3', 'dmxapi'].includes(provider.toLowerCase())) {
    firstDelimiters = ['/', ' ', '-', '_', ':']
    secondDelimiters = []
  }

  // First delimiter rule
  for (const delimiter of firstDelimiters) {
    if (str.includes(delimiter)) {
      return str.split(delimiter)[0]
    }
  }

  // Second delimiter rule
  for (const delimiter of secondDelimiters) {
    if (str.includes(delimiter)) {
      const parts = str.split(delimiter)
      return parts.length > 1 ? parts[0] + '-' + parts[1] : parts[0]
    }
  }

  return str
}

/**
 * Extract base name from model ID.
 * Examples:
 * - 'deepseek/deepseek-r1' => 'deepseek-r1'
 * - 'deepseek-ai/deepseek/deepseek-r1' => 'deepseek-r1'
 * @param {string} id Model ID
 * @param {string} [delimiter='/'] Delimiter, defaults to '/'
 * @returns {string} Base name
 */
export const getBaseModelName = (id: string, delimiter: string = '/'): string => {
  const parts = id.split(delimiter)
  return parts[parts.length - 1]
}

/**
 * Extract base name from model ID and convert to lowercase.
 * Examples:
 * - 'deepseek/DeepSeek-R1' => 'deepseek-r1'
 * - 'deepseek-ai/deepseek/DeepSeek-R1' => 'deepseek-r1'
 * @param {string} id Model ID
 * @param {string} [delimiter='/'] Delimiter, defaults to '/'
 * @returns {string} Lowercase base name
 */
export const getLowerBaseModelName = (id: string, delimiter: string = '/'): string => {
  // Normalize Fireworks model IDs: Fireworks replaces '.' with 'p' in version numbers
  // e.g. accounts/fireworks/models/deepseek-v3p2 -> deepseek-v3.2
  // e.g. accounts/fireworks/models/kimi-k2p5 -> kimi-k2.5
  const normalizedId = id.toLowerCase().startsWith('accounts/fireworks/models/')
    ? id.replace(/(\d)p(?=\d)/g, '$1.')
    : id

  let baseModelName = getBaseModelName(normalizedId, delimiter).toLowerCase()
  // Remove suffix
  // for openrouter
  if (baseModelName.endsWith(':free')) {
    baseModelName = baseModelName.replace(':free', '')
  }
  // for duskin
  if (baseModelName.endsWith('(free)')) {
    baseModelName = baseModelName.replace('(free)', '')
  }
  // for ollama
  if (baseModelName.endsWith(':cloud')) {
    baseModelName = baseModelName.replace(':cloud', '')
  }
  return baseModelName
}

/**
 * Get model provider name, decide whether to translate based on whether it's a system provider
 * @param provider Provider
 * @returns Descriptive name
 */
export const getFancyProviderName = (provider: Provider) => {
  return isSystemProvider(provider) ? i18n.t(getProviderLabelKey(provider.id)) : provider.name
}

/**
 * Resolve the best provider label available from an id alone.
 * Custom provider ids remain unchanged until provider metadata is available.
 */
export function getProviderDisplayNameById(providerId: string): string {
  const labelKey = getProviderLabelKey(providerId, '')
  return labelKey ? i18n.t(labelKey) : providerId
}

/**
 * Resolve a provider's user-facing name from its runtime metadata.
 * System providers use their canonical label; custom providers keep their user-set name.
 */
export function getProviderDisplayName(provider: Pick<Provider, 'id' | 'name'> | undefined): string {
  if (!provider) return ''
  return isSystemProviderId(provider.id) ? getProviderDisplayNameById(provider.id) : provider.name
}

// \uFE0F = VS16 (emoji-presentation selector); \u20E3 = combining enclosing keycap (1️⃣);
// \u200D = ZWJ joining multi-part sequences (🧛‍♂️). Composed into the emoji regexes below.
const EMOJI_PART_PATTERN = String.raw`(?:\p{Emoji}\uFE0F|\p{Emoji_Presentation})(?:\p{Emoji_Modifier})?`
const KEYCAP_EMOJI_PATTERN = String.raw`(?:[0-9#*]\uFE0F?\u20E3)`
const REGIONAL_FLAG_EMOJI_PATTERN = String.raw`(?:\p{Regional_Indicator}{2})`
const EMOJI_SEQUENCE_PATTERN = String.raw`(?:${EMOJI_PART_PATTERN}(?:\u200D${EMOJI_PART_PATTERN})*)`
const EMOJI_CLUSTER_PATTERN = String.raw`(?:${KEYCAP_EMOJI_PATTERN}|${REGIONAL_FLAG_EMOJI_PATTERN}|${EMOJI_SEQUENCE_PATTERN})`
// Anchored at both ends for whole-string checks (isEmoji); anchored at the start only
// for leading-run extraction/removal (getLeadingEmoji / removeLeadingEmoji).
const EMOJI_REGEX = new RegExp(`^(?:${EMOJI_CLUSTER_PATTERN})+$`, 'u')
const EMOJI_LEADING_REGEX = new RegExp(`^(?:${EMOJI_CLUSTER_PATTERN})+`, 'u')
const FIRST_LETTER_OR_EMOJI_REGEX = new RegExp(`${EMOJI_CLUSTER_PATTERN}|\\p{L}\\p{M}*`, 'u')

/**
 * Helper to get avatar name's first character, supports emoji.
 * @param {string} str Input string
 * @returns {string} First character, or empty string
 */
export function firstLetter(str: string): string {
  const match = str?.match(FIRST_LETTER_OR_EMOJI_REGEX)
  return match ? match[0] : ''
}

/**
 * Remove leading emoji from string.
 * @param {string} str Input string
 * @returns {string} String with leading emoji removed
 */
export function removeLeadingEmoji(str: string): string {
  return str.replace(EMOJI_LEADING_REGEX, '').trim()
}

/**
 * Extract leading emoji from string.
 * @param {string} str Input string
 * @returns {string} Leading emoji, or empty string if none
 */
export function getLeadingEmoji(str: string): string {
  const match = str.match(EMOJI_LEADING_REGEX)
  return match ? match[0] : ''
}

/**
 * Check if string is purely emoji.
 * @param {string} str Input string
 * @returns {boolean} True if string is purely emoji, false otherwise
 */
export function isEmoji(str: string): boolean {
  if (str.startsWith('data:')) {
    return false
  }
  if (str.startsWith('http')) {
    return false
  }
  return EMOJI_REGEX.test(str)
}

/**
 * Remove special characters from topic name:
 * - Replace newlines with spaces.
 * @param {string} str Input string
 * @returns {string} Processed string
 */
export function removeSpecialCharactersForTopicName(str: string): string {
  return str.replace(/["'\r\n]+/g, ' ').trim()
}

/**
 * Get first character of string.
 * @param {string} str Input string
 * @returns {string} First character, or empty string
 */
export function getFirstCharacter(str: string): string {
  // Use for...of to get first character
  for (const char of str) {
    return char
  }

  return ''
}

/**
 * Simplify text. Truncate to given length, considering semantic boundaries.
 * @param {string} text Input text
 * @param {number} [maxLength=50] Maximum length, defaults to 50
 * @returns {string} Processed brief text
 */
export function getBriefInfo(text: string, maxLength: number = 50): string {
  // Remove empty lines
  const noEmptyLinesText = text.replace(/\n\s*\n/g, '\n')

  // Check if text exceeds max length
  if (noEmptyLinesText.length <= maxLength) {
    return noEmptyLinesText
  }

  // Find nearest word boundary
  let truncatedText = noEmptyLinesText.slice(0, maxLength)
  const lastSpaceIndex = truncatedText.lastIndexOf(' ')

  if (lastSpaceIndex !== -1) {
    truncatedText = truncatedText.slice(0, lastSpaceIndex)
  }

  // Take preceding content and append "..."
  return truncatedText + '...'
}

/**
 * Truncate text while preserving sentence boundaries where possible.
 *
 * Logic:
 * 1. If text length <= minLength, return as-is
 * 2. Use Intl.Segmenter to split by sentences, accumulate until approaching maxLength
 * 3. If the first sentence exceeds maxLength, try to find the last punctuation within maxLength
 * 4. If no punctuation found, fall back to word boundary truncation
 *
 * @param {string} text Input text
 * @param {object} options Configuration options
 * @param {number} [options.minLength=15] Minimum length, result should not be shorter
 * @param {number} [options.maxLength=50] Maximum length, result should not exceed
 * @returns {string} Truncated text
 */
export function truncateText(text: string, options: { minLength?: number; maxLength?: number } = {}): string {
  const { minLength = 15, maxLength = 50 } = options

  if (!text || text.length <= minLength) {
    return text
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' })
  let result = ''

  for (const { segment } of segmenter.segment(text)) {
    if (result.length + segment.length > maxLength) {
      break
    }
    result += segment
  }

  // If we got a valid result within bounds, return it
  if (result && result.length >= minLength) {
    return result.trim()
  }

  // Need to truncate within a long sentence - try to find a good break point
  const candidate = text.substring(0, maxLength)

  // Try to find the last suitable ending punctuation (excluding comma-like marks)
  const endingPunctuationPattern = /[。！？；!?;]/g
  let lastEndingIndex = -1
  let match: RegExpExecArray | null

  while ((match = endingPunctuationPattern.exec(candidate)) !== null) {
    if (match.index >= minLength) {
      lastEndingIndex = match.index
    }
  }

  // If found a proper ending punctuation, truncate there
  if (lastEndingIndex > 0) {
    return text.substring(0, lastEndingIndex + 1).trim()
  }

  // Fall back to word boundary using Intl.Segmenter
  const wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
  let wordResult = ''

  for (const { segment } of wordSegmenter.segment(text)) {
    if (wordResult.length + segment.length > maxLength) {
      break
    }
    wordResult += segment
  }

  // Return word-boundary result if valid, otherwise hard truncate
  return wordResult.length >= minLength ? wordResult.trim() : text.substring(0, maxLength)
}
