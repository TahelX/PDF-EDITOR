
import { PDFDocument, degrees } from 'pdf-lib';
import { PDFFile, PDFPageReference } from '../types';

// PDF-LIB is globally available via script tag
declare const PDFLib: any;

export async function mergeAndDownload(
  files: PDFFile[],
  pageRefs: PDFPageReference[],
  filename: string = 'merged_document.pdf'
) {
  const { PDFDocument, degrees } = (window as any).PDFLib;
  const mergedPdf = await PDFDocument.create();

  // Cache loaded documents to avoid re-parsing
  const docCache: Record<string, any> = {};
  for (const file of files) {
    docCache[file.id] = await PDFDocument.load(file.data);
  }

  for (const ref of pageRefs) {
    const srcDoc = docCache[ref.fileId];
    const [copiedPage] = await mergedPdf.copyPages(srcDoc, [ref.pageIndex]);
    
    // Apply rotation
    if (ref.rotation !== 0) {
      copiedPage.setRotation(degrees(ref.rotation));
    }
    
    mergedPdf.addPage(copiedPage);
  }

  const pdfBytes = await mergedPdf.save();
  downloadBlob(pdfBytes, filename, 'application/pdf');
}

export async function splitAllToIndividual(files: PDFFile[], pageRefs: PDFPageReference[]) {
  const { PDFDocument } = (window as any).PDFLib;
  const docCache: Record<string, any> = {};
  for (const file of files) {
    docCache[file.id] = await PDFDocument.load(file.data);
  }

  for (let i = 0; i < pageRefs.length; i++) {
    const ref = pageRefs[i];
    const newPdf = await PDFDocument.create();
    const srcDoc = docCache[ref.fileId];
    const [copiedPage] = await newPdf.copyPages(srcDoc, [ref.pageIndex]);
    newPdf.addPage(copiedPage);
    const bytes = await newPdf.save();
    downloadBlob(bytes, `page_${i + 1}.pdf`, 'application/pdf');
  }
}

function downloadBlob(data: Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  window.URL.revokeObjectURL(url);
}

// Generate a thumbnail for a specific page using PDF.js
export async function generateThumbnail(fileData: Uint8Array, pageIndex: number): Promise<string> {
  const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const loadingTask = pdfjsLib.getDocument({ data: fileData });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex + 1);
  
  const viewport = page.getViewport({ scale: 0.3 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  if (context) {
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas.toDataURL();
  }
  return '';
}

export async function extractText(fileData: Uint8Array): Promise<string> {
  const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
  const loadingTask = pdfjsLib.getDocument({ data: fileData });
  const pdf = await loadingTask.promise;
  let fullText = '';
  
  // Extract first 5 pages for context to Gemini
  const maxPages = Math.min(pdf.numPages, 5);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n`;
  }
  return fullText;
}
