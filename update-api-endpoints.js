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
  let updated = false;
  
  // Skip if already updated
  if (content.includes('createServerAuth')) {
    console.log(`  ✓ Already updated`);
    return;
  }
  
  // 1. Update imports
  const oldImport = `import { createServerClient } from '../../../lib/supabase/server';`;
  const oldImport2 = `import { createServerClient } from '../../../../lib/supabase/server';`;
  const oldImport3 = `import { createServerClient } from '../../lib/supabase/server';`;
  
  if (content.includes(oldImport)) {
    content = content.replace(oldImport, `import { createServerAuth } from '../../../lib/auth/multi-user';`);
    updated = true;
  } else if (content.includes(oldImport2)) {
    content = content.replace(oldImport2, `import { createServerAuth } from '../../../../lib/auth/multi-user';`);
    updated = true;
  } else if (content.includes(oldImport3)) {
    content = content.replace(oldImport3, `import { createServerAuth } from '../../lib/auth/multi-user';`);
    updated = true;
  }
  
  // 2. Add auth setup after export const POST/GET = async
  const exportRegex = /(export const (?:POST|GET|PUT|DELETE): APIRoute = async \(\{ (?:request, )?cookies[^}]*\}\) => \{[\s\S]*?try \{)/;
  const match = content.match(exportRegex);
  
  if (match) {
    const beforeTry = match[1];
    if (!beforeTry.includes('createServerAuth')) {
      const authSetup = `
    // Get authenticated user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();`;
      
      content = content.replace(match[1], match[1] + authSetup);
      updated = true;
    }
  }
  
  // 3. Replace supabase client creation
  content = content.replace(/const supabase = createServerClient\(cookies\);/g, 'const supabase = serverAuth.supabase;');
  
  // 4. Add error handling
  const catchRegex = /} catch \(error[^}]*\) \{/;
  if (content.match(catchRegex) && !content.includes('Authentication required')) {
    content = content.replace(catchRegex, `} catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);`);
    updated = true;
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