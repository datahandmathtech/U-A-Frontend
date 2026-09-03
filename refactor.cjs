const fs = require('fs');
const path = 'src/pages/ProjectDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update projectSteps
content = content.replace(
  "const projectSteps = ['Shop Drawing & Approval', 'Material Planning', 'Production', 'Work Order Active'];",
  "const projectSteps = ['Shop Drawing & Approval', 'Production', 'Work Order Active'];"
);

// 2. Update getStepIndex
content = content.replace(
  "    if (status === 'material_planning') return 5;\n    if (status === 'production') return 6;\n    if (status === 'work_order' || status === 'completed') return 7;",
  "    if (status === 'production') return 5;\n    if (status === 'work_order' || status === 'completed') return 6;"
);

// 3. Update Step 4 Button
content = content.replace(
  "                           await updateProject({ id: id as string, data: { status: 'material_planning' } }).unwrap();\n                           setActiveStep(5);",
  "                           await updateProject({ id: id as string, data: { status: 'production' } }).unwrap();\n                           setActiveStep(5);"
);
content = content.replace(
  "{viewingStepOverride !== null ? 'Back to Active Step' : 'Proceed to Material Planning'}",
  "{viewingStepOverride !== null ? 'Back to Active Step' : 'Proceed to Production'}"
);

// 4. Wrap Step 5 UI in a Dialog instead of a timeline step
// We need to replace {stepToRender === 5 && ( with a Dialog block.
// And we also need to add the Dialog open state.
const dialogHeader = \
      {/* MATERIAL PLANNING DIALOG */}
      <Dialog open={isMaterialPlanningOpen} onClose={() => setIsMaterialPlanningOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Material Planning & Allocation
          <IconButton onClick={() => setIsMaterialPlanningOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#FAFAFA' }}>
\;

const dialogFooter = \
        </DialogContent>
      </Dialog>
\;

// We'll replace {/* STEP 5: MATERIAL PLANNING */} and the {stepToRender === 5 && (
const step5Match = '{/* STEP 5: MATERIAL PLANNING */}';
const step5Index = content.indexOf(step5Match);

if (step5Index !== -1) {
    // Find the end of the Step 5 block which is before {/* STEP 6: PRODUCTION MANAGEMENT */}
    const step6Match = '{/* STEP 6: PRODUCTION MANAGEMENT */}';
    let step6Index = content.indexOf(step6Match);
    
    let step5Content = content.substring(step5Index, step6Index);
    
    // Remove {stepToRender === 5 && ( at the beginning
    step5Content = step5Content.replace(/\\{stepToRender === 5 && \\(\\s*<Paper[^>]*>/, dialogHeader + '\\n          <Box>');
    
    // Remove the <Paper> end tag and )} at the end
    // The end looks like:
    //               </Paper>
    //             )}
    step5Content = step5Content.replace(/<\\/Paper>\\s*\\)\\s*\\}/, '</Box>\\n' + dialogFooter);

    // Also remove the "Proceed to Production" buttons from the bottom of Step 5 since it's now a standalone dialog
    const buttonsBlockStart = step5Content.indexOf('<Box sx={{ display: \\'flex\\', justifyContent: \\'space-between\\' }}>');
    if (buttonsBlockStart !== -1) {
        const buttonsBlockEnd = step5Content.indexOf('</Box>', step5Content.indexOf('</Box>', step5Content.indexOf('</Box>', buttonsBlockStart) + 1) + 1) + 6;
        step5Content = step5Content.substring(0, buttonsBlockStart) + step5Content.substring(buttonsBlockEnd);
    }

    content = content.substring(0, step5Index) + step5Content + content.substring(step6Index);
}

// 5. Shift subsequent steps
content = content.replace(/\{stepToRender === 6 && \(/g, '{stepToRender === 5 && (');
content = content.replace(/\{stepToRender === 7 && \(/g, '{stepToRender === 6 && (');
content = content.replace(/\{?\/\*\s*STEP 6: PRODUCTION MANAGEMENT\s*\*\/\}/g, '{/* STEP 5: PRODUCTION MANAGEMENT */}');
content = content.replace(/\{?\/\*\s*STEP 7: WORK ORDER ACTIVE\s*\*\/\}/g, '{/* STEP 6: WORK ORDER ACTIVE */}');

// 6. Add state variable
content = content.replace(
  'const [cameraPurpose, setCameraPurpose] = useState<\\'drawing\\' | \\'clientPhoto\\'>(\\'drawing\\');',
  'const [cameraPurpose, setCameraPurpose] = useState<\\'drawing\\' | \\'clientPhoto\\'>(\\'drawing\\');\\n  const [isMaterialPlanningOpen, setIsMaterialPlanningOpen] = useState(false);'
);

// 7. Add Button to the top of the page
const headerTarget = '<Typography variant="h4" fontWeight="bold">Project Details</Typography>';
const newHeader = headerTarget + '\\n          <Button variant="contained" color="secondary" onClick={() => setIsMaterialPlanningOpen(true)}>Material Planning</Button>';
content = content.replace(headerTarget, newHeader);

fs.writeFileSync(path, content);
console.log('Done refactoring');
