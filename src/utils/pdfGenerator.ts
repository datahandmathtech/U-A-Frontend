import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to convert image URL to base64
const getBase64ImageFromUrl = async (imageUrl) => {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error fetching image:', err);
    return null;
  }
};

export const generateReceiptPDF = (project: any, advanceAmount: number) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(179, 139, 54); // #B38B36 (Gold)
  doc.text("UNNATI ARTS", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Fine Stone Craftsmanship", 105, 26, { align: "center" });
  
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("ADVANCE PAYMENT RECEIPT", 105, 45, { align: "center" });
  
  // Details
  doc.setFontSize(12);
  doc.text(\Receipt Date: \\, 20, 60);
  doc.text(\Project ID: \\, 140, 60);
  
  doc.text(\Received From: \\, 20, 70);
  doc.text(\Contact: \\, 20, 80);

  // Table
  autoTable(doc, {
    startY: 95,
    head: [['Description', 'Amount']],
    body: [
      [\Advance payment for Project: \\, \Rs. \\]
    ],
    theme: 'grid',
    headStyles: { fillColor: [26, 28, 41] }, // Dark header
    styles: { fontSize: 11, cellPadding: 5 }
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 30;
  doc.text("Authorized Signatory", 140, finalY);
  doc.setLineWidth(0.5);
  doc.line(140, finalY + 2, 185, finalY + 2);
  
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("This is an auto-generated receipt.", 105, 280, { align: "center" });

  // Download
  doc.save(\Receipt_\.pdf\);
};

export const generateWorkOrderPDF = (project: any, advanceAmount: number) => {
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.setTextColor(179, 139, 54);
  doc.text("UNNATI ARTS - WORK ORDER", 105, 20, { align: "center" });
  
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(\Date Issued: \\, 20, 45);
  doc.text(\Work Order Ref: WO-\\, 140, 45);

  doc.text(\Client Name: \\, 20, 60);
  doc.text(\Project Name: \\, 20, 70);
  doc.text(\Advance Received: Rs. \\, 20, 80);

  autoTable(doc, {
    startY: 95,
    head: [['Task', 'Status']],
    body: [
      ['Shop Drawings & Design Approval', 'Completed'],
      ['Material Procurement', 'Pending'],
      ['Production & Carving', 'Pending'],
      ['QA & Dispatch', 'Pending']
    ],
    theme: 'striped',
    headStyles: { fillColor: [179, 139, 54] },
  });

  doc.text("Production Manager", 140, (doc as any).lastAutoTable.finalY + 40);
  doc.line(140, (doc as any).lastAutoTable.finalY + 42, 185, (doc as any).lastAutoTable.finalY + 42);

  doc.save(\WorkOrder_\.pdf\);
};

export const generateQuotationPDF = async (project: any, products: any[], quoteDetails: any, globalCosts?: any, terms?: string[], gstPercent: number = 0) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(179, 139, 54); // Gold #B38B36
  doc.text("UNNATI ARTS", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Fine Stone Craftsmanship & Custom Designs", 105, 26, { align: "center" });
  
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("PRODUCT ESTIMATION & QUOTATION", 105, 45, { align: "center" });

  // Details
  doc.setFontSize(11);
  doc.text(\Quotation Date: \\, 20, 60);
  doc.text(\Project ID: \\, 140, 60);
  
  doc.text(\Client Name: \\, 20, 70);
  doc.text(\Project Name: \\, 140, 70);
  doc.text(\Contact: \\, 20, 80);

  // Products Table
  const tableBody = products.map(p => {
    const dimensionsStr = p.unit !== 'Pieces' 
      ? \\ x \\
      : '-';
    const mm = p.unit !== 'Pieces' ? \\\ : '-';
    const sqFt = p.unit === 'Sq. Ft' ? \\\ : '-';

    return [
      p.category || 'N/A',
      p.unit || 'N/A',
      dimensionsStr,
      mm,
      sqFt,
      p.qty || 0,
      \Rs. \\,
      \Rs. \\
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [['Category', 'Unit', 'Dimensions (L x W)', 'MM', 'Sq. Ft', 'Qty', 'Rate', 'Amount']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [26, 28, 41] }, // Dark header
    styles: { fontSize: 10, cellPadding: 3 }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Calculate totals
  const productsTotal = products.reduce((acc, p) => acc + (p.amount || 0), 0);
  let globalCostTotal = 0;
  if (globalCosts?.packageCostEnabled) globalCostTotal += Number(globalCosts.packageCost || 0);
  if (globalCosts?.transportCostEnabled) globalCostTotal += Number(globalCosts.transportCost || 0);
  
  const subTotal = productsTotal + globalCostTotal;
  const gstAmount = (subTotal * gstPercent) / 100;
  const finalGrandTotal = subTotal + gstAmount;

  // Grand Total Summary Box
  doc.setFillColor(247, 243, 235); // Light Gold/Cream background
  doc.rect(20, currentY, 170, 50, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(\Total Products Amount: Rs. \\, 25, currentY + 10);
  
  let boxYOffset = 18;
  if (globalCosts?.transportCostEnabled && globalCosts?.transportCost > 0) {
    doc.text(\Installation Cost: Rs. \\, 25, currentY + boxYOffset);
    boxYOffset += 8;
  }
  if (globalCosts?.packageCostEnabled && globalCosts?.packageCost > 0) {
    doc.text(\Packing Charges: Rs. \\, 25, currentY + boxYOffset);
    boxYOffset += 8;
  }
  
  doc.text(\GST (\%): Rs. \\, 25, currentY + boxYOffset);
  boxYOffset += 8;
  
  doc.setFontSize(12);
  doc.setTextColor(179, 139, 54);
  doc.setFont(undefined, 'bold');
  doc.text(\Estimated Grand Total: Rs. \\, 25, currentY + boxYOffset);
  doc.setFont(undefined, 'normal');

  currentY += 60;

  // Render Product Photos
  const photosWithCategories = products
    .filter(p => p.photo)
    .map(p => ({ category: p.category, photos: p.photo.split(',').filter(Boolean) }))
    .filter(p => p.photos.length > 0);

  if (photosWithCategories.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Product Reference Designs", 20, currentY);
    currentY += 10;

    for (const item of photosWithCategories) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(12);
      doc.text(item.category || 'Product', 20, currentY);
      currentY += 5;

      let startX = 20;
      for (const photoUrl of item.photos) {
        if (startX > 150) {
          startX = 20;
          currentY += 45;
        }
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
          startX = 20;
        }

        const base64Img = await getBase64ImageFromUrl(photoUrl);
        if (base64Img) {
          try {
            doc.addImage(base64Img as string, 'JPEG', startX, currentY, 40, 40);
          } catch(e) {}
        }
        startX += 45;
      }
      currentY += 50;
    }
  }

  // Terms and Conditions
  if (terms && terms.length > 0) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Terms and Conditions", 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    terms.forEach((term, index) => {
      const splitTerm = doc.splitTextToSize(\\. \\, 170);
      if (currentY + (splitTerm.length * 5) > 280) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(splitTerm, 20, currentY);
      currentY += splitTerm.length * 5 + 2;
    });
  }

  // Footer Signature
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("Authorized Signature", 140, currentY + 30);
  doc.setLineWidth(0.5);
  doc.line(140, currentY + 32, 185, currentY + 32);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("This is a computer generated quote.", 105, 290, { align: "center" });

  // Download
  doc.save(\Quotation_\.pdf\);
};
