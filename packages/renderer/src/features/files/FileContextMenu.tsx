import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  Pencil,
  Trash2,
  Copy,
  Download,
  Check,
} from "lucide-react";
import type { FileInfo } from "@shared/types/file";

export interface FileContextMenuProps {
  children: React.ReactNode;
  file: FileInfo;
  onOpen?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCopyPath?: () => void;
  onCopyContent?: () => void;
  onDownload?: () => void;
  disabled?: boolean;
}

export function FileContextMenu({
  children,
  file,
  onOpen,
  onRename,
  onDelete,
  onCopyPath,
  onCopyContent,
  onDownload,
  disabled = false,
}: FileContextMenuProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.relativePath);
    setCopied(true);
    onCopyPath?.();
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="min-w-48">
        {!file.isDirectory && (
          <>
            <DropdownMenuItem onSelect={onOpen} disabled={disabled || !onOpen}>
              <span className="flex items-center gap-2">
                <FolderOpen size={14} />
                Open
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {onRename && (
          <DropdownMenuItem onSelect={onRename} disabled={disabled}>
            <span className="flex items-center gap-2">
              <Pencil size={14} />
              Rename
            </span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onSelect={handleCopyPath} disabled={disabled}>
          <span className="flex items-center gap-2">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy path"}
          </span>
        </DropdownMenuItem>

        {!file.isDirectory && onCopyContent && (
          <DropdownMenuItem onSelect={onCopyContent} disabled={disabled}>
            <span className="flex items-center gap-2">
              <Copy size={14} />
              Copy content
            </span>
          </DropdownMenuItem>
        )}

        {!file.isDirectory && onDownload && (
          <DropdownMenuItem onSelect={onDownload} disabled={disabled}>
            <span className="flex items-center gap-2">
              <Download size={14} />
              Download
            </span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onDelete && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete} disabled={disabled}>
            <span className="flex items-center gap-2">
              <Trash2 size={14} />
              Delete
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
