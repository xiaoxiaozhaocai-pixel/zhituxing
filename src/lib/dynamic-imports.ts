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

// ExcelJS helper: download workbook buffer as file
const downloadBuffer = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const loadExcelJS = async () => {
  const ExcelJS = await import('exceljs');
  return { ExcelJS, downloadBuffer };
};
