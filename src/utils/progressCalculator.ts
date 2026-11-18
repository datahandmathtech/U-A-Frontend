export const calculateOrderProgress = (project: any) => {
  const slabs = project.slabs && project.slabs.length > 0 ? project.slabs : [];
  
  if (slabs.length === 0) {
    const isCompleted = project.status === 'completed';
    return {
      totalProductRows: 0,
      productionEquivalentCompleted: 0,
      productionProgressDisplay: "0.00 / 0",
      overallProgressPercent: isCompleted ? 100 : 0
    };
  }

  const totalProductRows = slabs.length;

  // If work order is explicitly completed, progress is 100%!
  if (project.status === 'completed') {
    return {
      totalProductRows,
      productionEquivalentCompleted: totalProductRows,
      productionProgressDisplay: `${totalProductRows}.00 / ${totalProductRows}`,
      overallProgressPercent: 100
    };
  }
  let totalProductionEquivalent = 0;
  let totalSlabPercentSum = 0;

  slabs.forEach((slab: any) => {
    const pieces = slab.pieces || [];
    const totalSubPieces = pieces.length > 0 ? pieces.length : 1;

    const reqStages = (slab.requiredStages && Array.isArray(slab.requiredStages) && slab.requiredStages.length > 0)
      ? slab.requiredStages.filter((s: string) => s !== 'Polishing')
      : ['Production'];
    const hasProduction = reqStages.includes('Production') || reqStages.length === 0;
    const hasBridgeCutting = reqStages.includes('Bridge Cutting');
    const hasPolishing = reqStages.some((s: string) => s.startsWith('Polishing'));
    const hasPacking = reqStages.includes('Packing');
    const hasDispatch = reqStages.includes('Dispatch');

    let wBridge = hasBridgeCutting ? 15 : 0;
    let wPoli = hasPolishing ? 15 : 0;
    let wPack = hasPacking ? 10 : 0;
    let wDisp = hasDispatch ? 10 : 0;
    let wProd = 0;

    if (hasProduction || hasBridgeCutting || hasPolishing || hasPacking || hasDispatch) {
      wProd = 100 - wBridge - wPoli - wPack - wDisp;
      if (!hasProduction) {
        wProd = 0;
        const remaining = wBridge + wPoli + wPack + wDisp;
        if (remaining > 0) {
          wBridge = (wBridge / remaining) * 100;
          wPoli = (wPoli / remaining) * 100;
          wPack = (wPack / remaining) * 100;
          wDisp = (wDisp / remaining) * 100;
        }
      }
    }

    const getStageCompletionRatio = (stageName: string) => {
      if (pieces.length === 0) {
         return slab.status === 'completed' ? 1.0 : 0;
      }
      
      const BASE_STAGES = ['Production', 'Bridge Cutting', 'Polishing', 'Packing', 'Dispatch'];
      const stageIdx = BASE_STAGES.indexOf(stageName);

      let completedCount = 0;
      pieces.forEach((p: any) => {
        if (p.status === 'pending' || p.status === 'not_started') {
          return; // If Not Started, do not count as completed!
        }
        const pStage = (p.stage || 'Production').split(' - ')[0].replace(' Work', '').trim();
        const pIdx = BASE_STAGES.indexOf(pStage);
        
        const hasLog = p.logs && p.logs.some((l: any) => {
          const lStage = (l.stage || '').split(' - ')[0].replace(' Work', '').trim();
          return (lStage === stageName || lStage.startsWith(stageName)) && 
                 (l.status === 'completed' || l.status === 'approved');
        });
        
        if (hasLog || (pStage === stageName && p.status === 'completed') || pIdx > stageIdx) {
          completedCount++;
        }
      });
      return Math.min(1.0, completedCount / totalSubPieces);
    };

    const cProd = hasProduction ? (slab.status === 'completed' ? 1.0 : getStageCompletionRatio('Production')) : 0;
    const cBridge = hasBridgeCutting ? getStageCompletionRatio('Bridge Cutting') : 0;
    const cPoli = hasPolishing ? getStageCompletionRatio('Polishing') : 0;
    const cPack = hasPacking ? getStageCompletionRatio('Packing') : 0;
    const cDisp = hasDispatch ? getStageCompletionRatio('Dispatch') : 0;

    totalProductionEquivalent += cProd;
    const slabProgress = (wProd * cProd) + (wBridge * cBridge) + (wPoli * cPoli) + (wPack * cPack) + (wDisp * cDisp);
    totalSlabPercentSum += slabProgress;
  });

  let overallProgressPercent = Math.round(totalSlabPercentSum / totalProductRows);
  if (totalProductionEquivalent >= totalProductRows || project.status === 'completed') {
    overallProgressPercent = 100;
  }

  return {
    totalProductRows,
    productionEquivalentCompleted: totalProductionEquivalent,
    productionProgressDisplay: totalProductionEquivalent.toFixed(2) + " / " + totalProductRows,
    overallProgressPercent: Math.min(100, Math.max(0, overallProgressPercent))
  };
};
