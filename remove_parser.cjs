const fs = require('fs');
let content = fs.readFileSync('src/pages/ProjectDetails.tsx', 'utf8');

let newContent = '';
let i = 0;
while (i < content.length) {
    let btnStart = content.indexOf('<Button', i);
    if (btnStart === -1) {
        newContent += content.slice(i);
        break;
    }
    newContent += content.slice(i, btnStart);
    let btnEnd = content.indexOf('</Button>', btnStart);
    if (btnEnd === -1) {
        newContent += content.slice(btnStart);
        break;
    }
    btnEnd += '</Button>'.length;
    let btnCode = content.slice(btnStart, btnEnd);
    if (btnCode.includes('Save Progress')) {
        // Skip adding this button
    } else {
        newContent += btnCode;
    }
    i = btnEnd;
}

fs.writeFileSync('src/pages/ProjectDetails.tsx', newContent, 'utf8');
