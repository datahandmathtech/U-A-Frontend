import re

with open('src/utils/pdfGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "export const generateQuotationPDF ="
start_idx = content.find(start_str)

if start_idx != -1:
    content = content[:start_idx]

new_func = r'''export const generateQuotationPDF = async (project: any, products: any[], quoteDetails: any, globalCosts?: any, terms?: string[], gstPercent: number = 0) => {
  const doc = new jsPDF();
  
  // Pre-fetch images for the table
  const productImages: Record<number, string | null> = {};
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (p.photo) {
      const photos = p.photo.split(',').filter(Boolean);
      if (photos.length > 0) {
        const base64Img = await getBase64ImageFromUrl(photos[0]);
        if (base64Img) {
          productImages[i] = base64Img as string;
        }
      }
    }
  }

  const goldColor = [179, 139, 54] as [number, number, number];
  
  // Custom Hook to draw left black bar on every page
  const addPageDecorations = (pdfDoc: any) => {
    const pages = pdfDoc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdfDoc.setPage(i);
      pdfDoc.setFillColor(0, 0, 0);
      pdfDoc.rect(10, 0, 8, 297, 'F');
      pdfDoc.setLineWidth(0.5);
      pdfDoc.setDrawColor(0, 0, 0);
      pdfDoc.line(20, 0, 20, 297);
    }
  };

  // Header Background
  doc.setFillColor(220, 220, 220); // Light Gray
  doc.rect(20, 15, 190, 30, 'F');
  
  // Header Text - Left (Logo substitute)
  doc.setFontSize(36);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.text('UA', 25, 36);
  doc.setFontSize(16);
  doc.text('Unnati', 50, 30);
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text('Arts', 50, 36);

  // Header Text - Right (Company Info)
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('UNNATI ARTS', 205, 20, { align: 'right' });
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text('101, Vintage Delight', 205, 24, { align: 'right' });
  doc.text('Apartment, Shobhagpura, Udaipur', 205, 28, { align: 'right' });
  doc.text('Rajasthan (313001)', 205, 32, { align: 'right' });
  doc.setFont(undefined, 'bold');
  doc.text('GSTIN : 08ARMPV8958M1ZF', 205, 36, { align: 'right' });
  doc.text('9001843501/9887253946', 205, 40, { align: 'right' });

  // Gold Line below header
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(20, 45, 190, 2, 'F');

  // Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.text('QUOTATION', 115, 60, { align: 'center' });

  // Client Info & Date
  doc.setFontSize(8);
  doc.text('TO,', 25, 75);
  doc.text(String(project.clientName || 'CLIENT NAME').toUpperCase(), 25, 80);
  doc.setFont(undefined, 'normal');
  doc.text(String(project.clientContact || 'CLIENT ADDRESS DETAILS').toUpperCase(), 25, 85);

  doc.setFont(undefined, 'bold');
  const d = new Date();
  const dateStr = d.getDate().toString().padStart(2, '0') + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getFullYear();
  doc.text('DATE  ' + dateStr, 205, 75, { align: 'right' });
  doc.text('QUOTE #.  UA/QT/' + d.getFullYear().toString().slice(-2) + '/' + String(Math.floor(Math.random()*100)).padStart(2, '0'), 205, 80, { align: 'right' });

  // Add a horizontal gray line above table
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(25, 90, 205, 90);

  // Table Data
  const tableBody = products.map((p, index) => {
    const dimensionsStr = p.unit !== 'Pieces' 
      ? (p.length || 0) + ' x ' + (p.width || 0)
      : 'sizes as per\nshared\ndrawing';
    
    const qtySqft = p.unit === 'Sq. Ft' ? String((p.length || 0) * (p.width || 0)) : String(p.qty || 1);

    return [
      String(index + 1),
      '', // Image placeholder
      (p.category || 'MATERIAL').toUpperCase(),
      dimensionsStr,
      qtySqft,
      String(p.rate || 0),
      String(p.amount || 0)
    ];
  });

  // Calculate global costs as a separate row if any
  let globalCostTotal = 0;
  if (globalCosts?.packageCostEnabled) globalCostTotal += Number(globalCosts.packageCost || 0);
  if (globalCosts?.transportCostEnabled) globalCostTotal += Number(globalCosts.transportCost || 0);
  
  if (globalCostTotal > 0) {
    let globalCostDesc = [];
    if (globalCosts?.packageCostEnabled) globalCostDesc.push('PACKING CHARGES');
    if (globalCosts?.transportCostEnabled) globalCostDesc.push('INSTALLATION COST');
    
    tableBody.push([
      String(tableBody.length + 1),
      '',
      globalCostDesc.join(' + \n'),
      '',
      '-',
      '-',
      String(globalCostTotal)
    ]);
  }

  autoTable(doc, {
    startY: 95,
    margin: { left: 25, right: 5 },
    head: [['SR. NO.', 'IMAGE', 'MATERIAL', 'DIMENSIONS', 'QUANTITY\n(SQFT)', 'RATE\n(RS/SQFT)', 'AMOUNT']],
    body: tableBody,
    theme: 'plain',
    headStyles: { 
      fillColor: [0, 0, 0], 
      textColor: goldColor,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 8
    },
    bodyStyles: {
      halign: 'center',
      valign: 'middle',
      fontSize: 9,
      textColor: [0,0,0],
      minCellHeight: 35
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold', fontSize: 12 },
      1: { cellWidth: 35 }, // Image column
      2: { cellWidth: 35, fontStyle: 'bold', fontSize: 8 },
      3: { cellWidth: 30, textColor: [100,100,100], fontSize: 8 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 }
    },
    didDrawCell: function(data) {
      // Draw bottom border for body rows
      if (data.row.section === 'body') {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
      
      // Draw image in cell index 1
      if (data.row.section === 'body' && data.column.index === 1 && data.row.index < products.length) {
        const base64 = productImages[data.row.index];
        if (base64) {
          try {
            const dim = 24;
            const x = data.cell.x + (data.cell.width - dim) / 2;
            const y = data.cell.y + (data.cell.height - dim) / 2;
            doc.addImage(base64, 'JPEG', x, y, dim, dim);
          } catch(e) {}
        }
      }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;
  
  if (currentY > 230) {
    doc.addPage();
    currentY = 30;
  }

  // Draw Bank Details and Totals
  const productsTotal = products.reduce((acc, p) => acc + (p.amount || 0), 0);
  const subTotal = productsTotal + globalCostTotal;
  const gstAmount = (subTotal * gstPercent) / 100;
  const finalGrandTotal = subTotal + gstAmount;

  // Subtotal & Totals on Right
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal', 160, currentY);
  doc.setTextColor(0, 0, 0);
  doc.text(String(subTotal), 200, currentY, { align: 'right' });

  doc.setTextColor(100, 100, 100);
  doc.text('GST ' + gstPercent + '%', 160, currentY + 6);
  doc.setTextColor(0, 0, 0);
  doc.text(String(gstAmount), 200, currentY + 6, { align: 'right' });

  doc.setFont(undefined, 'bold');
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text('Total', 160, currentY + 16);
  doc.text(String(finalGrandTotal), 200, currentY + 16, { align: 'right' });

  // Draw gold line under Total
  doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.setLineWidth(0.5);
  doc.line(160, currentY + 18, 205, currentY + 18);

  // Bank Details Table on Left
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(25, currentY - 5, 80, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Bank details', 27, currentY - 1);
  
  doc.setTextColor(0, 0, 0);
  const rows = [
    ['Bank name', 'state bank of india'],
    ['A/c no.', '40127845471'],
    ['Ifsc code', 'SBIN0032153'],
    ['Branch', 'sukher, udaipur']
  ];
  
  let bY = currentY + 1;
  rows.forEach(r => {
    doc.rect(25, bY, 80, 6);
    doc.line(50, bY, 50, bY + 6); // vertical divider
    doc.setFont(undefined, 'bold');
    doc.text(r[0], 27, bY + 4);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(r[1], 52, bY + 4);
    doc.setTextColor(0, 0, 0);
    bY += 6;
  });

  currentY = bY + 15;

  // Terms and Conditions Title
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('All payments are subject to the terms and conditions stated on Page 2', 25, currentY);
  doc.setTextColor(100, 100, 100);
  doc.text('Term & conditions', 25, currentY + 5);
  currentY += 15;

  // Render Terms
  if (terms && terms.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    
    terms.forEach((term, index) => {
      // number
      doc.text(String(index + 1), 25, currentY);
      
      const splitTerm = doc.splitTextToSize(term, 160);
      if (currentY + (splitTerm.length * 4) > 280) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(splitTerm, 30, currentY);
      currentY += splitTerm.length * 4 + 3;
    });
  }

  // Final decorations
  addPageDecorations(doc);

  // Download
  doc.save('Quotation_' + project.projectId + '.pdf');
};
'''

with open('src/utils/pdfGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(content + newFunc)
