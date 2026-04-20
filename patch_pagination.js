const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('frontend/src/app');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('Menampilkan ')) {
    const rx = /<div className="flex items-center justify-between border-t border-border\/30 px-4 py-3">\s*<p className="text-xs text-muted-foreground">\s*Menampilkan \{([a-zA-Z0-9]+) === 0 \? 0 : \(page - 1\) \* limit \+ 1\} - \{" "\}\s*\{Math\.min\(page \* limit, \1\)\} dari \{\1\}([^<]*)\s*<\/p>/gm;
    
    let patched = false;
    content = content.replace(rx, (match, totalVar, suffix) => {
      patched = true;
      return `<div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Baris per halaman:</span>
                  <Select
                    value={limit.toString()}
                    onValueChange={(val) => {
                      setLimit(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[65px] text-xs bg-muted/30 border-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Menampilkan {${totalVar} === 0 ? 0 : (page - 1) * limit + 1} -{" "}
                  {Math.min(page * limit, ${totalVar})} dari {${totalVar}}${suffix}
                </p>
              </div>`;
    });
    
    if (patched) {
      console.log('Patched:', file);
      
      // check if Select is imported
      if (!content.includes('SelectContent')) {
         const selectImport = `import {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from "@/components/ui/select";\n`;
         // naive injection near import
         content = content.replace(/import .*? from "react";/g, match => `${match}\n${selectImport}`);
      }
      fs.writeFileSync(file, content, 'utf8');
    }
  }
}
