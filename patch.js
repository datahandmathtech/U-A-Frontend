const fs = require('fs');
const file = 'src/store/apiSlice.ts';
let content = fs.readFileSync(file, 'utf8');

const toFind = `    reserveProjectMaterial: builder.mutation<any, { projectId: string; data: any }>({
      query: ({ projectId, data }) => ({ url: \`/projects/\${projectId}/materials\`, method: 'POST', body: data }),
      invalidatesTags: ['Project', 'Inventory']
    }),`;

const toAdd = `
    deleteProjectMaterial: builder.mutation<any, { projectId: string; materialId: string }>({
      query: ({ projectId, materialId }) => ({ url: \`/projects/\${projectId}/materials/\${materialId}\`, method: 'DELETE' }),
      invalidatesTags: ['Project', 'Inventory']
    }),`;

if (content.includes(toFind)) {
  content = content.replace(toFind, toFind + toAdd);
  content = content.replace('useReserveProjectMaterialMutation,', 'useReserveProjectMaterialMutation, useDeleteProjectMaterialMutation,');
  fs.writeFileSync(file, content);
  console.log('patched');
} else {
  console.log('not found');
}
