const fs = require('fs');
const code = fs.readFileSync('src/pages/ProjectDetailsOverview.tsx', 'utf8');

let depth = 0;
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const QuickActions =')) {
    console.log(`QuickActions starts at ${i + 1}`);
    depth = 0;
  }
  
  // Very naive counting, ignoring strings/comments but should give a hint
  // A better way is to just look for the first line where depth hits 0 after QuickActions starts
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') depth++;
    if (line[j] === '}') {
      depth--;
      if (depth === 0 && line.includes('}')) {
        console.log(`Depth reached 0 at line ${i + 1}: ${line}`);
      }
    }
  }
}
