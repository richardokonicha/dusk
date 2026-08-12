# Privacy Policy

_Last updated: August 11, 2025_

## 1. Introduction

Dusk is designed with privacy at its core. This Privacy Policy explains how we handle your data when you use Dusk.

## 2. Data Collection

### Data Stored Locally

Dusk is a local-first application. The following data is stored exclusively on your device:

- Conversation history
- File attachments
- Workspace configurations
- Provider API keys (stored in your OS keychain)
- App settings and preferences
- Agent configurations

### Telemetry

Dusk does not collect, transmit, or share any telemetry, analytics, or usage data by default.

## 3. Local Data Storage

All local data is stored in the standard application data directory for your operating system:

- **macOS**: `~/Library/Application Support/Dusk`
- **Windows**: `%APPDATA%\Dusk`
- **Linux**: `~/.config/dusk`

You can export all your data at any time from **Settings** → **Export**.

## 4. Fugoku Cloud Sync (Optional)

If you choose to enable Fugoku Cloud Sync, the following applies:

### What is synced

- Workspace configurations (without API keys)
- Conversation history
- Agent configurations
- File attachments

### How it is stored

- All data is encrypted end-to-end
- Data is stored in secure data centers
- You can delete all cloud data at any time

### What is NOT synced

- Provider API keys (never leave your device)
- Local-only files
- System-level settings

## 5. User Rights

You have the right to:

- **Access**: View all data stored about you
- **Deletion**: Delete specific conversations or all data
- **Export**: Export your data in JSON format
- **Correction**: Update any stored information
- **Portability**: Transfer your data to another service

## 6. Data Security

- All secrets are stored in your OS keychain
- Local data can be encrypted at rest
- Cloud data is encrypted in transit and at rest
- No data is shared with third parties

## 7. Third-Party Services

When you connect a provider (e.g., OpenAI, Anthropic), your data is subject to that provider's privacy policy. We recommend reviewing their policies.

## 8. Children's Privacy

Dusk is not directed at children under 13. We do not knowingly collect personal information from children.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted in the app and on the documentation site.

## 10. Contact

For privacy-related inquiries, contact us at:

- Email: privacy@fugoku.com
- GitHub: https://github.com/fugoku/dusk
