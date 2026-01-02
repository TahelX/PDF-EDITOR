
export interface PDFPageReference {
  id: string; // Unique ID for this page instance in the workspace
  fileId: string;
  pageIndex: number;
  rotation: number;
  thumbnailUrl?: string;
}

export interface PDFFile {
  id: string;
  name: string;
  size: number;
  data: Uint8Array;
  pageCount: number;
}

export interface WorkspaceState {
  files: PDFFile[];
  pages: PDFPageReference[];
  isProcessing: boolean;
  aiInsights: string | null;
}
