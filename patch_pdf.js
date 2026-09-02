const fs = require('fs');
const file = 'src/utils/pdfGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
\  let additionalTotal = 0;
  if (quoteDetails) {
    Object.values(quoteDetails).forEach((arr: any) => {
      arr.forEach((item: any) => {
        additionalTotal += Number(item.amount || 0);
      });
    });
  }\,
  ""
);

code = code.replace(
  "const subTotal = productsTotal + additionalTotal + globalCostTotal;",
  "const subTotal = productsTotal + globalCostTotal;"
);

code = code.replace(
\  if (additionalTotal > 0) {
    doc.text('Total Additional Cost: Rs. ' + additionalTotal.toLocaleString('en-IN'), 25, currentY + boxYOffset);
    boxYOffset += 8;
  }\,
  ""
);

fs.writeFileSync(file, code);
