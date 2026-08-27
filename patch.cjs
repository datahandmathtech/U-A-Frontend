const fs = require('fs');
const file = 'src/store/apiSlice.ts';
let content = fs.readFileSync(file, 'utf8');

const toAdd = `
    deleteProjectMaterial: builder.mutation<any, { projectId: string; materialId: string }>({
      query: ({ projectId, materialId }) => ({ url: \`/projects/\${projectId}/materials/\${materialId}\`, method: 'DELETE' }),
      invalidatesTags: ['Project', 'Inventory']
    }),`;

content = content.replace(
  "reserveProjectMaterial: builder.mutation<any, { projectId: string; data: any }>({", 
  toAdd.trim() + "\n    reserveProjectMaterial: builder.mutation<any, { projectId: string; data: any }>({"
);
content = content.replace('useReserveProjectMaterialMutation,', 'useReserveProjectMaterialMutation,\n  useDeleteProjectMaterialMutation,');
fs.writeFileSync(file, content);
console.log('patched');
