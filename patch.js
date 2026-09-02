const fs = require('fs');
const file = 'src/pages/ProjectDetails.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove from subTotal
code = code.replace(
  "const subTotal = totalProductsAmount + additionalTotal + globalCostTotal;",
  "const subTotal = totalProductsAmount + globalCostTotal;"
);

// 2. Remove line from Quotation Summary
const summaryLine = \<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Total Additional Cost</Typography>
                              <Typography variant="body2" fontWeight="bold">₹{additionalTotal.toLocaleString('en-IN')}</Typography>
                            </Box>\;

code = code.replace(summaryLine, "");

fs.writeFileSync(file, code);
