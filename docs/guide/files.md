# Files

Dusk supports file attachments and context management to give agents the information they need.

## Attaching Files

You can attach files in several ways:

1. Click the **attachment button** next to the composer
2. **Drag and drop** files into the chat
3. Use the keyboard shortcut `Ctrl/Cmd + U` to open the file picker

## Supported Formats

- **Text**: `.txt`, `.md`, `.json`, `.yaml`, `.yml`, `.csv`
- **Code**: `.js`, `.ts`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`
- **Documents**: `.pdf`, `.docx`, `.doc`
- **Data**: `.xlsx`, `.xls`, `.sql`

## File Context

Files attached to a conversation become part of the context. The agent can read and reference them.

- **Full content**: Text-based files are included in full
- **Extracted text**: PDFs and documents have text extracted
- **Summaries**: Large files may be summarized to fit the context window

## File Management

### Viewing Files

Click the **Files** tab in a conversation to see all attached files.

### Removing Files

Click the **×** next to a file to remove it from the conversation context.

### Workspace Files

Files can be saved to the workspace for future use. Saved files are available across conversations within the same workspace.

## File Limits

- Maximum file size: **50MB** per file
- Maximum context size: **128K tokens** (varies by model)
- Supported total attachments: **10 files** per message

## Privacy

Files are processed locally when possible. When using cloud providers, file content is sent to the provider for processing. Files stored in Fugoku Cloud are encrypted at rest and in transit.
