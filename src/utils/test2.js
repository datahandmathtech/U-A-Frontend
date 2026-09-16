const project = {
  slabs: [
    {
      requiredStages: [],
      pieces: [],
      status: 'active'
    }
  ]
};

const slabs = project.slabs && project.slabs.length > 0 ? project.slabs : [];
const totalProductRows = slabs.length;
let totalProductionEquivalent = 0;
let totalSlabPercentSum = 0;

slabs.forEach((slab) => {
  const pieces = slab.pieces || [];
  const totalSubPieces = pieces.length > 0 ? pieces.length : 1;

  const reqStages = slab.requiredStages || ['Production', 'Polishing', 'Packing', 'Dispatch'];
  const hasProduction = reqStages.includes('Production');
  const hasPolishing = reqStages.some((s) => s.startsWith('Polishing'));
  const hasPacking = reqStages.includes('Packing');
  const hasDispatch = reqStages.includes('Dispatch');

  let wPoli = hasPolishing ? 20 : 0;
  let wPack = hasPacking ? 10 : 0;
  let wDisp = hasDispatch ? 10 : 0;
  let wProd = 0;

  if (hasProduction || hasPolishing || hasPacking || hasDispatch) {
    wProd = 100 - wPoli - wPack - wDisp;
    if (!hasProduction) {
      wProd = 0;
      const remaining = wPoli + wPack + wDisp;
      if (remaining > 0) {
        wPoli = (wPoli / remaining) * 100;
        wPack = (wPack / remaining) * 100;
        wDisp = (wDisp / remaining) * 100;
      }
    }
  }

  const getStageCompletionRatio = (stageName) => {
    if (pieces.length === 0) {
       return slab.status === 'completed' ? 1.0 : 0;
    }
    let completedCount = 0;
    return Math.min(1.0, completedCount / totalSubPieces);
  };

  const cProd = hasProduction ? (slab.status === 'completed' ? 1.0 : getStageCompletionRatio('Production')) : 0;
  const cPoli = hasPolishing ? getStageCompletionRatio('Polishing') : 0;
  const cPack = hasPacking ? getStageCompletionRatio('Packing') : 0;
  const cDisp = hasDispatch ? getStageCompletionRatio('Dispatch') : 0;

  totalProductionEquivalent += cProd;
  const slabProgress = (wProd * cProd) + (wPoli * cPoli) + (wPack * cPack) + (wDisp * cDisp);
  totalSlabPercentSum += slabProgress;
});

console.log(totalSlabPercentSum);
console.log(totalProductRows);
console.log(Math.round(totalSlabPercentSum / totalProductRows));
