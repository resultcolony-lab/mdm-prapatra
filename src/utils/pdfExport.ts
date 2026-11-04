import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface SinglePagePdfOptions {
  element: HTMLElement;
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
}

export interface MultiPagePdfOptions {
  pageElements: HTMLElement[];
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
}

/**
 * Temporarily resets transform scales on the element and its ancestors
 * so html2canvas renders the crisp, full-resolution unscaled DOM.
 */
function resetTransforms(el: HTMLElement) {
  const elementsWithTransform: { element: HTMLElement; originalTransform: string }[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    if (current.style.transform && current.style.transform !== 'none') {
      elementsWithTransform.push({
        element: current,
        originalTransform: current.style.transform,
      });
      current.style.transform = 'none';
    }
    current = current.parentElement;
  }

  return () => {
    for (const item of elementsWithTransform) {
      item.element.style.transform = item.originalTransform;
    }
  };
}

/**
 * Downloads a single A4 full-page PDF with high DPI resolution.
 * Fits cleanly onto exactly 1 page (no spillover or blank 2nd page).
 */
export async function downloadSinglePagePdf({
  element,
  fileName,
  orientation = 'portrait',
  marginMm = 3,
}: SinglePagePdfOptions): Promise<void> {
  const restoreTransforms = resetTransforms(element);

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(element, {
      scale: 2, // 2x high resolution for ultra-sharp Hindi text and numbers
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc, clonedEl) => {
        // Convert all input and textarea elements to spans to prevent text clipping
        const inputs = clonedEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
        inputs.forEach((input) => {
          const val = input.value || input.placeholder || '';
          const span = clonedDoc.createElement('span');
          span.textContent = val;
          span.className = input.className;
          span.style.cssText = input.style.cssText;
          span.style.display = 'inline-block';
          span.style.width = 'auto';
          span.style.minWidth = input.offsetWidth > 0 ? `${input.offsetWidth}px` : 'auto';
          span.style.whiteSpace = 'nowrap';
          span.style.letterSpacing = 'normal';
          span.style.overflow = 'visible';
          span.style.border = 'none';
          if (input.classList.contains('border-b') || input.style.borderBottom) {
            span.style.borderBottom = '1px dotted black';
          }
          input.parentNode?.replaceChild(span, input);
        });

        // Ensure normal letter-spacing across all nodes to preserve Devanagari conjuncts
        const allNodes = clonedEl.querySelectorAll<HTMLElement>('*');
        allNodes.forEach((node) => {
          node.style.letterSpacing = 'normal';
          node.style.wordSpacing = 'normal';
        });
      },
    });

    restoreTransforms();

    const pdfWidth = orientation === 'landscape' ? 297 : 210;
    const pdfHeight = orientation === 'landscape' ? 210 : 297;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const maxW = pdfWidth - marginMm * 2;
    const maxH = pdfHeight - marginMm * 2;

    const canvasAspect = canvas.width / canvas.height;
    const maxAspect = maxW / maxH;

    let renderW = maxW;
    let renderH = maxH;

    if (canvasAspect > maxAspect) {
      // Wider than page aspect
      renderW = maxW;
      renderH = maxW / canvasAspect;
    } else {
      // Taller than page aspect
      renderH = maxH;
      renderW = maxH * canvasAspect;
    }

    // Ensure it strictly never exceeds maxH
    if (renderH > maxH) {
      renderH = maxH;
      renderW = maxH * canvasAspect;
    }

    const posX = marginMm + (maxW - renderW) / 2;
    const posY = marginMm + (maxH - renderH) / 2;

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');

    // Safe download triggering
    triggerDownload(pdf, fileName);
  } catch (err) {
    restoreTransforms();
    console.error('PDF export failed:', err);
    throw err;
  }
}

/**
 * Downloads a multi-page PDF where each passed element occupies exactly one A4 page.
 * Specifically crafted for the 2-page Consolidated Report.
 */
export async function downloadMultiPagePdf({
  pageElements,
  fileName,
  orientation = 'portrait',
  marginMm = 3,
}: MultiPagePdfOptions): Promise<void> {
  if (!pageElements.length) return;

  const restoreList: (() => void)[] = [];
  for (const el of pageElements) {
    restoreList.push(resetTransforms(el));
  }

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    const pdfWidth = orientation === 'landscape' ? 297 : 210;
    const pdfHeight = orientation === 'landscape' ? 210 : 297;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i];

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc, clonedEl) => {
          // Convert all input and textarea elements to spans to prevent text clipping
          const inputs = clonedEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
          inputs.forEach((input) => {
            const val = input.value || input.placeholder || '';
            const span = clonedDoc.createElement('span');
            span.textContent = val;
            span.className = input.className;
            span.style.cssText = input.style.cssText;
            span.style.display = 'inline-block';
            span.style.width = 'auto';
            span.style.minWidth = input.offsetWidth > 0 ? `${input.offsetWidth}px` : 'auto';
            span.style.whiteSpace = 'nowrap';
            span.style.letterSpacing = 'normal';
            span.style.overflow = 'visible';
            span.style.border = 'none';
            if (input.classList.contains('border-b') || input.style.borderBottom) {
              span.style.borderBottom = '1px dotted black';
            }
            input.parentNode?.replaceChild(span, input);
          });

          // Ensure normal letter-spacing across all nodes to preserve Devanagari conjuncts
          const allNodes = clonedEl.querySelectorAll<HTMLElement>('*');
          allNodes.forEach((node) => {
            node.style.letterSpacing = 'normal';
            node.style.wordSpacing = 'normal';
          });
        },
      });

      if (i > 0) {
        pdf.addPage('a4', orientation);
      }

      const maxW = pdfWidth - marginMm * 2;
      const maxH = pdfHeight - marginMm * 2;
      const canvasAspect = canvas.width / canvas.height;
      const maxAspect = maxW / maxH;

      let renderW = maxW;
      let renderH = maxH;

      if (canvasAspect > maxAspect) {
        renderW = maxW;
        renderH = maxW / canvasAspect;
      } else {
        renderH = maxH;
        renderW = maxH * canvasAspect;
      }

      if (renderH > maxH) {
        renderH = maxH;
        renderW = maxH * canvasAspect;
      }

      const posX = marginMm + (maxW - renderW) / 2;
      const posY = marginMm + (maxH - renderH) / 2;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
    }

    for (const restore of restoreList) {
      restore();
    }

    triggerDownload(pdf, fileName);
  } catch (err) {
    for (const restore of restoreList) {
      restore();
    }
    console.error('Multi-page PDF export failed:', err);
    throw err;
  }
}

/**
 * Universal safe download handler that handles iframe restrictions,
 * mobile browsers, and desktop environments smoothly.
 */
function triggerDownload(pdf: jsPDF, fileName: string) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  try {
    pdf.save(cleanFileName);
  } catch {
    // Fallback: create Object URL and click hidden anchor tag
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanFileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
