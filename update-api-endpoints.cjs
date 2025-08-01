#!/usr/bin/env node
// update-api-endpoints.js
// Script to update all API endpoints to use new multi-user auth system

const fs = require('fs');
const path = require('path');

// Find all API endpoint files
function findApiFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findApiFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.includes('waitlist')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Update a single file
function updateApiFile(filePath) {
  console.log(`Updating: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Revert previous changes to start fresh
  content = content.replace(/import { createServerAuth } from '..\/..\/..\/lib\/auth\/multi-user';/g, "import { createServerClient } from '../../../lib/supabase/server';");
  content = content.replace(/import { createServerAuth } from '..\/..\/..\/..\/lib\/auth\/multi-user';/g, "import { createServerClient } from '../../../../lib/supabase/server';");
  content = content.replace(/const supabase = serverAuth.supabase;/g, 'const supabase = createServerClient(cookies);');
  content = content.replace(/\/\/ Get authenticated user\s+const serverAuth = createServerAuth\(cookies\);\s+const user = await serverAuth.requireAuth\(\);/g, '');

  let updated = false;

  // 1. Update imports
  const oldImport1 = `import { createServerClient } from '../../../lib/supabase/server';`;
  const oldImport2 = `import { createServerClient } from '../../../../lib/supabase/server';`;
  const oldImport3 = `import { createServerClient } from '../../lib/supabase/server';`;
  
  if (content.includes(oldImport1)) {
    content = content.replace(oldImport1, `import { createServerAuth } from '../../../lib/auth/simple-multi-user';`);
    updated = true;
  } else if (content.includes(oldImport2)) {
    content = content.replace(oldImport2, `import { createServerAuth } from '../../../../lib/auth/simple-multi-user';`);
    updated = true;
  } else if (content.includes(oldImport3)) {
    content = content.replace(oldImport3, `import { createServerAuth } from '../../lib/auth/simple-multi-user';`);
    updated = true;
  }

  // 2. Add auth setup
  const exportRegex = /(export const (?:POST|GET|PUT|DELETE): APIRoute = async \({[^}]*cookies[^}]*\}\) => \{)/;
  const match = content.match(exportRegex);

  if (match) {
    const functionBody = content.substring(match.index + match[0].length);
    if (!functionBody.includes('createServerAuth')) {
      const authSetup = `
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;`;
      
      content = content.replace(match[0], match[0] + authSetup);
      
      // Remove old supabase client creation
      content = content.replace(/const supabase = createServerClient\(cookies\);/g, '');
      
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Updated successfully`);
  } else {
    console.log(`  - No changes needed`);
  }
}

// Main execution
const apiDir = path.join(__dirname, 'src/pages/api');

if (!fs.existsSync(apiDir)) {
  console.error('API directory not found. Make sure you run this from the project root.');
  process.exit(1);
}

console.log('🔄 Updating API endpoints to use multi-user auth...\n');

const apiFiles = findApiFiles(apiDir);
console.log(`Found ${apiFiles.length} API files to update\n`);

for (const file of apiFiles) {
  updateApiFile(file);
}

console.log('\n✅ All API endpoints updated!');
console.log('\n📋 Next steps:');
console.log('1. Test the API endpoints');
console.log('2. Update frontend auth to use new system');
console.log('3. Run database migration script');
console.log('4. Deploy landing page with waitlist');
