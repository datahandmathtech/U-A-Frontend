import { calculateOrderProgress } from './progressCalculator';

const fakeProject = {
  slabs: [
    {
      requiredStages: null,
      pieces: []
    }
  ]
};

console.log(calculateOrderProgress(fakeProject));
