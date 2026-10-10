import PDFDocument from "pdfkit";

// Draws a certificate as a one-page A4 landscape PDF.
//
// PDFKit's built-in fonts only cover Latin text (letters like a, e, n with
// accents are fine; Urdu, Hindi, Chinese... are not). Rather than print a
// certificate with missing letters in someone's name, callers check
// isPdfSafeText() first and fall back to the browser's print-to-PDF page.

export interface ICertificatePdfData {
  certificateId: string;
  studentName: string;
  courseName: string;
  instructorName: string;
  platformName: string;
  completionDate: Date;
  issuedAt: Date;
  status: "valid" | "revoked";
  revokedAt?: Date;
}

const PDF_SAFE_TEXT = /^[\x20-\x7E\xA0-\xFF]*$/;

export const isPdfSafeText = (...texts: string[]): boolean =>
  texts.every((t) => PDF_SAFE_TEXT.test(t));

// Same on every server, whatever its time zone.
export const formatCertificateDate = (value: Date): string =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

// A long course name must still fit on one line, so the font shrinks to fit.
const fitFontSize = (
  doc: PDFKit.PDFDocument,
  font: string,
  text: string,
  maxWidth: number,
  start: number,
  min: number
): number => {
  let size = start;
  doc.font(font);
  while (size > min && doc.fontSize(size).widthOfString(text) > maxWidth) size -= 1;
  return size;
};

export const renderCertificatePdf = (
  data: ICertificatePdfData,
  verifyUrl: string
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: {
        Title: `Certificate of Completion - ${data.courseName}`,
        Author: data.platformName,
        Subject: `Certificate ${data.certificateId}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const ink = "#1f1f1f";
    const grey = "#6b6b6b";
    const textWidth = W - 160;
    const centered = (text: string, y: number, size: number, font: string, color: string) => {
      doc.font(font).fontSize(size).fillColor(color).text(text, 80, y, {
        width: textWidth,
        align: "center",
        lineBreak: false,
      });
    };

    // double border
    doc.lineWidth(3).rect(28, 28, W - 56, H - 56).stroke(ink);
    doc.lineWidth(1).rect(37, 37, W - 74, H - 74).stroke(ink);

    centered(data.platformName.toUpperCase(), 78, 13, "Helvetica", grey);
    centered("Certificate of Completion", 108, 40, "Times-Bold", ink);

    centered("This certifies that", 185, 15, "Helvetica", grey);
    const nameSize = fitFontSize(doc, "Times-Bold", data.studentName, textWidth, 36, 16);
    centered(data.studentName, 212, nameSize, "Times-Bold", ink);

    centered("has successfully completed the course", 275, 15, "Helvetica", grey);
    const courseSize = fitFontSize(doc, "Times-Bold", data.courseName, textWidth, 28, 14);
    centered(data.courseName, 303, courseSize, "Times-Bold", ink);

    // date and instructor, each above a line with a caption
    const colWidth = 250;
    const leftX = W / 2 - colWidth - 40;
    const rightX = W / 2 + 40;
    const baseY = 405;
    const column = (x: number, value: string, caption: string) => {
      doc.font("Helvetica-Bold").fontSize(14).fillColor(ink).text(value, x, baseY, {
        width: colWidth,
        align: "center",
        lineBreak: false,
      });
      doc.lineWidth(0.8).moveTo(x, baseY + 24).lineTo(x + colWidth, baseY + 24).stroke("#9a9a9a");
      doc.font("Helvetica").fontSize(9).fillColor(grey).text(caption.toUpperCase(), x, baseY + 32, {
        width: colWidth,
        align: "center",
        characterSpacing: 1,
        lineBreak: false,
      });
    };
    column(leftX, formatCertificateDate(data.completionDate), "Completion date");
    column(rightX, data.instructorName, "Instructor");

    // verification footer
    doc.lineWidth(0.5).moveTo(80, H - 105).lineTo(W - 80, H - 105).stroke("#c8c8c8");
    centered(`Certificate ID: ${data.certificateId}`, H - 92, 10, "Courier-Bold", ink);
    centered(
      `Issued ${formatCertificateDate(data.issuedAt)}  |  Verify at ${verifyUrl}`,
      H - 74,
      9,
      "Helvetica",
      grey
    );

    if (data.status === "revoked") {
      doc.save();
      doc.rotate(-18, { origin: [W / 2, H / 2] });
      doc.fillOpacity(0.18);
      centered("REVOKED", H / 2 - 55, 110, "Helvetica-Bold", "#c0392b");
      doc.restore();
      doc.fillOpacity(1);
      const when = data.revokedAt ? ` on ${formatCertificateDate(data.revokedAt)}` : "";
      centered(`This certificate was revoked${when} and is no longer valid.`, H - 58, 9, "Helvetica-Oblique", "#c0392b");
    }

    doc.end();
  });
