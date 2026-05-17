// Dynamic PDF library imports for performance optimization
// These heavy libraries (~500KB each) are only loaded when actually needed

export const loadJSPDF = async () => {
  const { jsPDF } = await import('jspdf');
  return jsPDF;
};

export const loadHtml2Canvas = async () => {
  const html2canvas = (await import('html2canvas')).default;
  return html2canvas;
};

export const loadXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};
