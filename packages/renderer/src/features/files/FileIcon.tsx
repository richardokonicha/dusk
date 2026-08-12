import {
  FileCode,
  FileText,
  FileJson,
  FileType2,
  Image,
  FileArchive,
  FileAudio,
  FileVideo,
  FileSpreadsheet,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";

export interface FileIconProps {
  fileName: string;
  isDirectory?: boolean;
  size?: number;
  className?: string;
}

const extensionMap: Record<string, React.ReactNode> = {
  js: <FileCode size={16} />,
  jsx: <FileCode size={16} />,
  ts: <FileCode size={16} />,
  tsx: <FileCode size={16} />,
  py: <FileCode size={16} />,
  rs: <FileCode size={16} />,
  go: <FileCode size={16} />,
  java: <FileCode size={16} />,
  c: <FileCode size={16} />,
  cpp: <FileCode size={16} />,
  rb: <FileCode size={16} />,
  php: <FileCode size={16} />,
  html: <FileCode size={16} />,
  css: <FileCode size={16} />,
  scss: <FileCode size={16} />,
  json: <FileJson size={16} />,
  yaml: <FileType2 size={16} />,
  yml: <FileType2 size={16} />,
  md: <FileType2 size={16} />,
  markdown: <FileType2 size={16} />,
  txt: <FileText size={16} />,
  png: <Image size={16} />,
  jpg: <Image size={16} />,
  jpeg: <Image size={16} />,
  gif: <Image size={16} />,
  svg: <Image size={16} />,
  webp: <Image size={16} />,
  zip: <FileArchive size={16} />,
  tar: <FileArchive size={16} />,
  gz: <FileArchive size={16} />,
  mp3: <FileAudio size={16} />,
  wav: <FileAudio size={16} />,
  flac: <FileAudio size={16} />,
  mp4: <FileVideo size={16} />,
  mov: <FileVideo size={16} />,
  avi: <FileVideo size={16} />,
  csv: <FileSpreadsheet size={16} />,
  xlsx: <FileSpreadsheet size={16} />,
  xls: <FileSpreadsheet size={16} />,
  pdf: <FileText size={16} />,
  sql: <FileCode size={16} />,
  sh: <FileCode size={16} />,
  bash: <FileCode size={16} />,
  toml: <FileCode size={16} />,
  xml: <FileCode size={16} />,
  dockerfile: <FileCode size={16} />,
  env: <FileText size={16} />,
  gitignore: <FileText size={16} />,
};

const extensionColorMap: Record<string, string> = {
  js: "text-yellow-500",
  jsx: "text-yellow-500",
  ts: "text-blue-500",
  tsx: "text-blue-500",
  py: "text-green-500",
  rs: "text-orange-500",
  go: "text-cyan-500",
  java: "text-red-500",
  c: "text-blue-500",
  cpp: "text-blue-500",
  html: "text-orange-600",
  css: "text-blue-600",
  json: "text-green-600",
  md: "text-blue-400",
  markdown: "text-blue-400",
  png: "text-purple-500",
  jpg: "text-purple-500",
  jpeg: "text-purple-500",
  gif: "text-purple-500",
  svg: "text-purple-500",
  zip: "text-amber-600",
  tar: "text-amber-600",
  gz: "text-amber-600",
  mp3: "text-pink-500",
  wav: "text-pink-500",
  mp4: "text-pink-600",
  mov: "text-pink-600",
  csv: "text-green-600",
  pdf: "text-red-600",
  sql: "text-indigo-500",
  yaml: "text-purple-400",
  yml: "text-purple-400",
};

export function FileIcon({ fileName, isDirectory = false, size = 16, className = "" }: FileIconProps) {
  if (isDirectory) {
    return <Folder size={size} className={className} />;
  }

  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const icon = extensionMap[extension];
  const colorClass = extensionColorMap[extension] || "text-muted-foreground";

  if (icon) {
    return <span className={colorClass}>{icon}</span>;
  }

  return <File size={size} className={`${colorClass} ${className}`} />;
}
