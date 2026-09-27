/**
 * Whether electron-builder's publish channel is wired up. The fork ships with
 * the `publish` block disabled (no Dusk update server yet), so auto update
 * checks stay off until this flips to true. Kept in its own module so tests
 * can substitute a configured channel.
 */
export const UPDATE_CHANNEL_CONFIGURED = false
