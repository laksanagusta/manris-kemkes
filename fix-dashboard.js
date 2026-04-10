const fs = require('fs');
let content = fs.readFileSync('frontend/src/lib/dashboard-insights.ts', 'utf-8');
content = content.replace(/const grouped = new Map<string, \{ high: number; extreme: number; total: number \}>\(\);/g, 'const grouped = new Map<string, { medium: number; high: number; extreme: number; total: number }>();');
fs.writeFileSync('frontend/src/lib/dashboard-insights.ts', content);
