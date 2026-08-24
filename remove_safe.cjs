const fs = require('fs');
let content = fs.readFileSync('src/pages/ProjectDetails.tsx', 'utf8');

// Replace standard 'Save Progress' dummy buttons
content = content.replace(/<Button variant="outlined" size="large" onClick=\{\(\) => \{\s*setSnackbarMessage\('.*?progress saved!'\);\s*\}\} sx=\{\{ px: 4, py: 1\.5, borderRadius: 2 \}\}>\s*Save Progress\s*<\/Button>/g, '');

// Replace 'Save Changes' or 'Save Progress' dummy buttons
content = content.replace(/<Button variant="contained" (?:color="success" )?size="large" onClick=\{.*?\(\) => \{\s*(?:if \(viewingStepOverride !== null\) setViewingStepOverride\(null\);\s*)?(?:setSnackbarMessage\('.*?'\);\s*)?(?:if \(viewingStepOverride !== null\) setViewingStepOverride\(null\);\s*)?\}\} sx=\{\{ px: [45], py: 1\.5, borderRadius: 2.*?\}>\s*\{viewingStepOverride !== null \? 'Save Changes' : 'Save Progress'\}\s*<\/Button>/g, '');

fs.writeFileSync('src/pages/ProjectDetails.tsx', content, 'utf8');
