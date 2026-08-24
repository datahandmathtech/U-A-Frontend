const fs = require('fs');
let content = fs.readFileSync('src/pages/ProjectDetails.tsx', 'utf8');

const regex1 = /<Button[^>]*>[\s\S]*?Save Progress[\s\S]*?<\/Button>/g;
const regex2 = /<Button[^>]*>[\s\S]*?\{viewingStepOverride !== null \? 'Save Changes' : 'Save Progress'\}[\s\S]*?<\/Button>/g;

content = content.replace(regex1, '');
content = content.replace(regex2, '');

fs.writeFileSync('src/pages/ProjectDetails.tsx', content, 'utf8');
