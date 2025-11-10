// Quick script to remove framer-motion props
const fs = require('fs');
const path = require('path');

const crossModuleDir = 'src/components/cross-module';
const files = fs.readdirSync(crossModuleDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(crossModuleDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove motion props
  content = content.replace(/\s*initial=\{[^}]+\}/g, '');
  content = content.replace(/\s*animate=\{[^}]+\}/g, '');
  content = content.replace(/\s*transition=\{[^}]+\}/g, '');
  content = content.replace(/\s*exit=\{[^}]+\}/g, '');
  content = content.replace(/\s*whileHover=\{[^}]+\}/g, '');
  content = content.replace(/\s*whileTap=\{[^}]+\}/g, '');
  
  // Add CSS animation classes where needed
  if (content.includes('className="') && !content.includes('animate-')) {
    content = content.replace(/className="([^"]*)"/, 'className="$1 animate-fade-in-up"');
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
});

console.log('All motion props removed!');