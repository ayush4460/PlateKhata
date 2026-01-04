import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PastOrder } from "./types";
import { format } from "date-fns";

interface RestaurantProfile {
  name: string | null;
  address: string | null;
  contactNumber: string | null;
  gstin: string | null;
  fssaiLicNo: string | null;
  tagline: string | null;
  cashierName?: string;
}

export const generateBillPDF = (order: PastOrder, profile: RestaurantProfile) => {
  const doc = new jsPDF({
    unit: "mm",
    format: [80, 200], // 80mm width (thermal printer style)
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 10;

  // Header - Restaurant Name (BOLD)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const name = profile.name || "RESTAURANT";
  doc.text(name.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  // Profile Details (NORMAL)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  if (profile.address) {
    const splitAddress = doc.splitTextToSize(profile.address, pageWidth - 10);
    doc.text(splitAddress, pageWidth / 2, currentY, { align: "center" });
    currentY += splitAddress.length * 4;
  }

  if (profile.contactNumber) {
    doc.text(`Contact : ${profile.contactNumber}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 4;
  }

  if (profile.gstin) {
    doc.text(`GSTIN : ${profile.gstin}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 4;
  }

  // Separator 1 (BOLD LINE)
  doc.setLineWidth(0.5);
  doc.line(5, currentY, pageWidth - 5, currentY);
  currentY += 6; // Increased from 5 to 6 for more space above name

  // Customer Details (NORMAL)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${order.userName || ""}`, 5, currentY);
  // Name Underline (BOLD and spans labels)
  doc.setLineWidth(0.5);
  doc.line(5, currentY + 4, pageWidth - 5, currentY + 4); // Increased from 1.5 to 4 to match top spacing
  currentY += 10; // Increased to maintain spacing with the next section

  // Date and Bill Info (NORMAL)
  doc.setFontSize(8);
  const dateStr = format(order.date || Date.now(), "dd/MM/yy");
  const timeStr = format(order.date || Date.now(), "HH:mm");
  
  doc.text(`Date: ${dateStr}`, 5, currentY);
  doc.setFont("helvetica", "bold");
  doc.text(`Dine In: ${order.tableNumber}`, pageWidth - 30, currentY);
  doc.setFont("helvetica", "normal");
  currentY += 4;
  doc.text(timeStr, 5, currentY);
  currentY += 4;
  doc.text(`Cashier: ${profile.cashierName || "Admin"}`, 5, currentY);
  doc.text(`Bill No.: ${order.orderNumber.replace(/[^0-9]/g, '').slice(-5)}`, pageWidth - 30, currentY);
  currentY += 5;

  // Separator 3 (NORMAL line before table)
  doc.line(5, currentY, pageWidth - 5, currentY);
  currentY += 1;

  // Items Table
  const tableData = order.items.map((item, index) => [
    index + 1,
    item.name,
    item.quantity,
    item.price.toFixed(2),
    (item.quantity * item.price).toFixed(2),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["No.", "Item", "Qty.", "Price", "Amount"]],
    body: tableData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1, textColor: [0, 0, 0], fontStyle: "normal", halign: "center" },
    headStyles: { fontStyle: "normal", halign: "center" },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: "auto", halign: "center" },
      2: { cellWidth: 10 },
      3: { cellWidth: 15 },
      4: { cellWidth: 18 },
    },
    margin: { left: 5, right: 5 },
    didDrawCell: (data) => {
      if (data.section === "head") {
        doc.setDrawColor(0, 0, 0); // Ensure black color
        doc.setLineWidth(0.5);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
    didDrawPage: (data) => {
        currentY = data.cursor ? data.cursor.y : currentY;
    }
  });

  currentY += 2;
  // Separator 4
  doc.setLineWidth(0.5);
  doc.line(5, currentY, pageWidth - 5, currentY);
  currentY += 4;

  // Totals Area (NORMAL)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const rightAlignValue = pageWidth - 6;
  const labelAlignX = pageWidth - 20;

  doc.text(`Total Qty: ${order.items.reduce((acc, item) => acc + item.quantity, 0)}`, labelAlignX - 20, currentY, { align: "right" });
  doc.text(`Sub Total`, labelAlignX, currentY, { align: "right" });
  doc.text(order.subtotal.toFixed(2), rightAlignValue, currentY, { align: "right" });
  currentY += 4;

  if (order.tax > 0) {
    doc.text(`CGST 2.5%`, labelAlignX, currentY, { align: "right" });
    doc.text((order.tax / 2).toFixed(2), rightAlignValue, currentY, { align: "right" });
    currentY += 4;
    doc.text(`SGST 2.5%`, labelAlignX, currentY, { align: "right" });
    doc.text((order.tax / 2).toFixed(2), rightAlignValue, currentY, { align: "right" });
    currentY += 4;
  }

  // Separator 5 (BOLD line before Grand Total)
  doc.setLineWidth(0.5);
  doc.line(5, currentY, pageWidth - 5, currentY);
  currentY += 5;

  const roundedGrandTotal = Math.round(order.total);
  const roundOff = roundedGrandTotal - order.total;

  if (Math.abs(roundOff) > 0.001) {
    doc.text(`Round off`, labelAlignX, currentY, { align: "right" });
    const sign = roundOff > 0 ? "+" : "";
    doc.text(`${sign}${roundOff.toFixed(2)}`, rightAlignValue, currentY, { align: "right" });
    currentY += 5;
  }

  // Grand Total (BOLD)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total`, 5, currentY);
  // Using standard text characters to avoid symbol encoding issues causing layout box overflow
  doc.text(`Rs. ${roundedGrandTotal.toFixed(2)}`, rightAlignValue, currentY, { align: "right" });
  currentY += 8;

  // Separator 6 (BOLD line after Grand Total)
  doc.setLineWidth(0.5);
  doc.line(5, currentY, pageWidth - 5, currentY);
  currentY += 6;

  // Footer (NORMAL for FSSAI, BOLD for Thank You)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  if (profile.fssaiLicNo) {
    doc.text(`FSSAI Lic No. ${profile.fssaiLicNo}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
  }

  doc.setFont("helvetica", "bold");
  const footerMessage = "Thank you for dining with us. We hope the food was to your liking and you will visit us again.";
  const splitFooter = doc.splitTextToSize(footerMessage, pageWidth - 10);
  doc.text(splitFooter, pageWidth / 2, currentY, { align: "center" });
  currentY += splitFooter.length * 4;

  // Save the PDF
  doc.save(`Bill_${order.orderNumber}.pdf`);
};
