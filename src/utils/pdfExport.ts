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

    // Measure element's true intrinsic dimensions to prevent row or column clipping
    const targetW = Math.max(element.scrollWidth, element.offsetWidth, orientation === 'landscape' ? 1140 : 820);
    const targetH = Math.max(element.scrollHeight, element.offsetHeight, orientation === 'landscape' ? 796 : 1150);

    const canvas = await html2canvas(element, {
      scale: 3.0, // 3.0x ultra-high resolution (>300 DPI) for crystal clear, laser-sharp printing
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: targetW,
      height: targetH,
      windowWidth: targetW + 200,
      windowHeight: targetH + 200,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (clonedDoc, clonedEl) => {
        // 1. Force the cloned element and all its ancestor containers up to body to have visible overflow and no clipping
        let curr: HTMLElement | null = clonedEl;
        while (curr && curr !== clonedDoc.body) {
          curr.style.overflow = 'visible';
          curr.style.overflowX = 'visible';
          curr.style.overflowY = 'visible';
          curr.style.maxWidth = 'none';
          curr.style.maxHeight = 'none';
          curr.style.transform = 'none';
          curr = curr.parentElement;
        }

        if (clonedDoc.body) {
          clonedDoc.body.style.width = `${targetW + 200}px`;
          clonedDoc.body.style.minWidth = `${targetW + 200}px`;
          clonedDoc.body.style.overflow = 'visible';
          clonedDoc.body.style.overflowX = 'visible';
        }
        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.style.width = `${targetW + 200}px`;
          clonedDoc.documentElement.style.minWidth = `${targetW + 200}px`;
          clonedDoc.documentElement.style.overflow = 'visible';
          clonedDoc.documentElement.style.overflowX = 'visible';
        }

        clonedEl.style.width = `${targetW}px`;
        clonedEl.style.minWidth = `${targetW}px`;
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.height = 'auto';
        clonedEl.style.overflow = 'visible';
        clonedEl.style.transform = 'none';

        // 2. Inject print-hiding styles into the cloned document head
        const style = clonedDoc.createElement('style');
        style.textContent = `
          .no-print, button, .translate-helper-btn, [data-no-print], [data-translate-btn] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
        `;
        clonedDoc.head?.appendChild(style);

        // 3. Remove all no-print elements, buttons, and translation badges from both clonedDoc and clonedEl
        const selectors = '.no-print, button, .translate-helper-btn, [data-no-print], [data-translate-btn]';
        clonedDoc.querySelectorAll(selectors).forEach((el) => el.remove());
        clonedEl.querySelectorAll(selectors).forEach((el) => el.remove());

        // 4. Remove any element whose text is strictly "हिन्दी" or contains translation badge text
        const allNodes = clonedEl.querySelectorAll<HTMLElement>('*');
        allNodes.forEach((node) => {
          const txt = (node.textContent || '').trim();
          if (txt === 'हिन्दी' || txt === '🌐 हिन्दी' || txt === '🌐 हिन्दी अनुवाद') {
            node.remove();
          }
        });

        // 5. Convert all input and textarea elements to clean text spans
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

        // 6. Ensure normal letter-spacing across all nodes to preserve Devanagari conjuncts
        clonedEl.querySelectorAll<HTMLElement>('*').forEach((node) => {
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

    // When aspect ratio is within 20% of standard A4 ratio, fill the complete printable page
    const aspectDiff = Math.abs(canvasAspect - maxAspect) / maxAspect;
    if (aspectDiff <= 0.20) {
      renderW = maxW;
      renderH = maxH;
    } else if (canvasAspect > maxAspect) {
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

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', posX, posY, renderW, renderH, undefined, 'NONE');

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

      const targetW = Math.max(el.scrollWidth, el.offsetWidth, orientation === 'landscape' ? 1140 : 820);
      const targetH = Math.max(el.scrollHeight, el.offsetHeight, orientation === 'landscape' ? 760 : 1150);

      const canvas = await html2canvas(el, {
        scale: 3.0, // 3.0x ultra-high resolution (>300 DPI)
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: targetW,
        height: targetH,
        windowWidth: targetW + 200,
        windowHeight: targetH + 200,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        onclone: (clonedDoc, clonedEl) => {
          // 1. Force the cloned element and all its ancestor containers up to body to have visible overflow and no clipping
          let curr: HTMLElement | null = clonedEl;
          while (curr && curr !== clonedDoc.body) {
            curr.style.overflow = 'visible';
            curr.style.overflowX = 'visible';
            curr.style.overflowY = 'visible';
            curr.style.maxWidth = 'none';
            curr.style.maxHeight = 'none';
            curr.style.transform = 'none';
            curr = curr.parentElement;
          }

          if (clonedDoc.body) {
            clonedDoc.body.style.width = `${targetW + 200}px`;
            clonedDoc.body.style.minWidth = `${targetW + 200}px`;
            clonedDoc.body.style.overflow = 'visible';
            clonedDoc.body.style.overflowX = 'visible';
          }
          if (clonedDoc.documentElement) {
            clonedDoc.documentElement.style.width = `${targetW + 200}px`;
            clonedDoc.documentElement.style.minWidth = `${targetW + 200}px`;
            clonedDoc.documentElement.style.overflow = 'visible';
            clonedDoc.documentElement.style.overflowX = 'visible';
          }

          clonedEl.style.width = `${targetW}px`;
          clonedEl.style.minWidth = `${targetW}px`;
          clonedEl.style.maxWidth = 'none';
          clonedEl.style.height = 'auto';
          clonedEl.style.overflow = 'visible';
          clonedEl.style.transform = 'none';

          // 2. Inject print-hiding styles into the cloned document head
          const style = clonedDoc.createElement('style');
          style.textContent = `
            .no-print, button, .translate-helper-btn, [data-no-print], [data-translate-btn] {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              width: 0 !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
            }
          `;
          clonedDoc.head?.appendChild(style);

          // 2. Remove all no-print elements, buttons, and translation badges from both clonedDoc and clonedEl
          const selectors = '.no-print, button, .translate-helper-btn, [data-no-print], [data-translate-btn]';
          clonedDoc.querySelectorAll(selectors).forEach((item) => item.remove());
          clonedEl.querySelectorAll(selectors).forEach((item) => item.remove());

          // 3. Remove any element whose text is strictly "हिन्दी" or contains translation badge text
          const allNodes = clonedEl.querySelectorAll<HTMLElement>('*');
          allNodes.forEach((node) => {
            const txt = (node.textContent || '').trim();
            if (txt === 'हिन्दी' || txt === '🌐 हिन्दी' || txt === '🌐 हिन्दी अनुवाद') {
              node.remove();
            }
          });

          // 4. Convert all input and textarea elements to spans to prevent text clipping
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

          // 5. Ensure normal letter-spacing across all nodes to preserve Devanagari conjuncts
          clonedEl.querySelectorAll<HTMLElement>('*').forEach((node) => {
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

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', posX, posY, renderW, renderH, undefined, 'NONE');
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
