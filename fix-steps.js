const fs = require('fs');

const path = 'src/pages/ProjectDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the entire STEP 5 block
const step5Start = content.indexOf('{/* STEP 5: MATERIAL PLANNING */}');
const step6Start = content.indexOf('{/* STEP 6: PRODUCTION MANAGEMENT */}');

if (step5Start !== -1 && step6Start !== -1) {
    content = content.substring(0, step5Start) + content.substring(step6Start);
}

// 2. Change stepToRender === 6 to 5
content = content.replace(/\{stepToRender === 6 && \(/g, '{stepToRender === 5 && (');

// 3. Change stepToRender === 7 to 6
content = content.replace(/\{stepToRender === 7 && \(/g, '{stepToRender === 6 && (');

// 4. Change STEP 6: to STEP 5:
content = content.replace(/\{?\/\*\s*STEP 6: PRODUCTION MANAGEMENT\s*\*\/\}/g, '{/* STEP 5: PRODUCTION MANAGEMENT */}');

// 5. Change STEP 7: to STEP 6:
content = content.replace(/\{?\/\*\s*STEP 7: WORK ORDER ACTIVE\s*\*\/\}/g, '{/* STEP 6: WORK ORDER ACTIVE */}');

fs.writeFileSync(path, content);
console.log('Fixed steps');
