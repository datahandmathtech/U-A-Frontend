const fs = require('fs');
const file = 'src/pages/ProjectDetails.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add isTermsDialogOpen state
code = code.replace(
  "const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);",
  "const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);\n  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);"
);

// 2. Add STANDARD_TERMS array
const termsArray = const STANDARD_TERMS = [
  "Payment terms shall be 50% advance against order confirmation and the remaining 50% before dispatch of the material.",
  "No post-dated cheque shall be applicable.",
  "The quoted prices are net and shall not be subject to deductions towards site maintenance, housekeeping, debris disposal, administration, Methadi charges, or any similar site-related charges. All such charges, wherever applicable, shall be borne directly by the Client.",
  "Since the material is natural stone/marble, natural veins, grains, patches, colour variations, pinholes, mineral marks, resin filling, and other inherent natural characteristics shall be considered acceptable and shall not be treated as manufacturing defects.",
  "The approximate material delivery period shall be 30 days from the date of receipt of advance payment, final approved drawings, and all required confirmations.",
  "Fixing or installation work, wherever included in our scope, shall take approximately 10 to 15 days, subject to site readiness and uninterrupted access. In such cases, all required scaffolding, suitable accommodation/stay for our fixing staff, and the necessary stone adhesive/chemical required for installation shall be arranged and provided by the client at their own cost.",
  "The delivery and installation timelines shall be reasonably extended in the event of force majeure, transport delays, shortage or rejection of raw material, natural-stone selection delays, site unavailability, civil-work delays, or delayed approvals or payments from the Client.",
  "Goods once sold, manufactured, or dispatched shall not be taken back, exchanged, or returned.",
  "No test certificate, warranty certificate, or any other certificate shall be provided unless specifically agreed by us in writing.",
  "Any variation in the approved design, dimensions, quantity, material, finish, carving depth, or site conditions may result in revision of price and delivery timeline.",
  "All payments made toward your order are strictly non-refundable once production has commenced or once raw materials/inventory have been purchased specifically for your project, whichever occurs first.",
  "You may cancel your order for a full or partial refund only if written notice of cancellation is received and confirmed before production has begun and prior to the procurement of any raw materials. Once material acquisition or production has started, no refunds, credits, or chargebacks will be issued under any circumstances.",
  "In the event of a cancellation after raw materials have been purchased, any procured materials, custom tooling, or work-in-progress remain the sole property of the company.",
  "All disputes and transactions shall be subject to Udaipur jurisdiction only.",
  "E. & O.E. — Errors and Omissions Excepted."
];;

code = code.replace(
  "const projectSteps = ['Shop Drawing & Approval', 'Material Planning', 'Production', 'Work Order Active'];\nconst steps = [...crmSteps, ...projectSteps];",
  "const projectSteps = ['Shop Drawing & Approval', 'Material Planning', 'Production', 'Work Order Active'];\nconst steps = [...crmSteps, ...projectSteps];\n\n" + termsArray
);

// 3. Replace Autocomplete with Button
const oldTermsUI = \                          {/* Terms and Conditions (Left Side) */}
                          <Box sx={{ flex: 1, minWidth: '300px' }}>
                            <Typography variant="subtitle2" color="text.secondary" mb={1} fontWeight="bold">Terms and Conditions</Typography>
                            <Autocomplete
                              multiple
                              freeSolo
                              size="small"
                              options={quotationTerms.map((t: any) => t.text)}
                              value={selectedTerms}
                              onChange={(event, newValue) => {
                                setSelectedTerms(newValue);
                                const newTerms = newValue.filter((val) => !quotationTerms.find((t: any) => t.text === val));
                                newTerms.forEach(term => addQuotationTerm({ text: term }));
                              }}
                              renderInput={(params) => (
                                <TextField {...params} variant="outlined" placeholder="Select or type conditions..." sx={{ bgcolor: '#FAFAFA' }} />
                              )}
                            />
                          </Box>\;

const newTermsUI = \                          {/* Terms and Conditions (Left Side) */}
                          <Box sx={{ flex: 1, minWidth: '300px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">Terms and Conditions</Typography>
                              <Button size="small" variant="outlined" onClick={() => setIsTermsDialogOpen(true)}>
                                Select Terms
                              </Button>
                            </Box>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {selectedTerms.length === 0 ? (
                                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                  No terms selected. Click 'Select Terms' to add.
                                </Typography>
                              ) : (
                                selectedTerms.map((term: string, i: number) => (
                                  <Box key={i} sx={{ display: 'flex', gap: 1, p: 1, bgcolor: '#FAFAFA', border: '1px solid #EEEEEE', borderRadius: 1 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>{i + 1}.</Typography>
                                    <Typography variant="body2" sx={{ flex: 1 }}>{term}</Typography>
                                    <IconButton size="small" onClick={() => setSelectedTerms(selectedTerms.filter(t => t !== term))} sx={{ p: 0.5 }}>
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ))
                              )}
                            </Box>
                          </Box>\;

code = code.replace(oldTermsUI, newTermsUI);

// 4. Insert Dialog
const dialogCode = \</Dialog>

      {/* STANDARD TERMS DIALOG */}
      <Dialog open={isTermsDialogOpen} onClose={() => setIsTermsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Select Terms and Conditions</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '60vh' }}>
            {STANDARD_TERMS.map((term, index) => {
              const isSelected = selectedTerms.includes(term);
              return (
                <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', p: 1, '&:hover': { bgcolor: '#f5f5f5' }, borderRadius: 1 }}>
                  <Checkbox 
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTerms([...selectedTerms, term]);
                        if (!quotationTerms.find((t: any) => t.text === term)) {
                          addQuotationTerm({ text: term });
                        }
                      } else {
                        setSelectedTerms(selectedTerms.filter(t => t !== term));
                      }
                    }}
                    sx={{ mt: -1 }}
                  />
                  <Typography variant="body2" sx={{ ml: 1, mt: 0.5 }}>{term}</Typography>
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: '#FAFAFA' }}>
          <Button variant="contained" onClick={() => setIsTermsDialogOpen(false)}>Done</Button>
        </Box>
      </Dialog>

      <Snackbar\;

code = code.replace("</Dialog>\\n\\n\\n\\n      <Snackbar", dialogCode);

fs.writeFileSync(file, code);
