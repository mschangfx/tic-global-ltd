const fs = require('fs');
const path = require('path');

console.log('🔧 Starting comprehensive TypeScript error fix...');

// Function to recursively get all .ts files in a directory
function getAllTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsFiles(filePath));
    } else if (file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Get all TypeScript files in the API directory
const apiDir = path.join(__dirname, 'src', 'app', 'api');
const tsFiles = getAllTsFiles(apiDir);

let totalFiles = 0;
let fixedFiles = 0;

tsFiles.forEach(filePath => {
  totalFiles++;
  
  try {
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix pattern 1: error instanceof Error ? error.message : 'Unknown error'
    content = content.replace(
      /error instanceof Error \? error\.message/g,
      'error instanceof Error ? (error as Error).message'
    );
    
    // Fix pattern 2: userError instanceof Error ? userError.message : 'Unknown error'
    content = content.replace(
      /userError instanceof Error \? userError\.message/g,
      'userError instanceof Error ? (userError as Error).message'
    );
    
    // Fix pattern 3: distError instanceof Error ? distError.message : 'Unknown error'
    content = content.replace(
      /distError instanceof Error \? distError\.message/g,
      'distError instanceof Error ? (distError as Error).message'
    );
    
    // Fix pattern 4: walletError instanceof Error ? walletError.message : 'Unknown error'
    content = content.replace(
      /walletError instanceof Error \? walletError\.message/g,
      'walletError instanceof Error ? (walletError as Error).message'
    );
    
    // Fix pattern 5: subsError instanceof Error ? subsError.message : 'Unknown error'
    content = content.replace(
      /subsError instanceof Error \? subsError\.message/g,
      'subsError instanceof Error ? (subsError as Error).message'
    );
    
    // Fix pattern 6: Any other error variable instanceof Error ? error.message
    content = content.replace(
      /(\w+Error) instanceof Error \? \1\.message/g,
      '$1 instanceof Error ? ($1 as Error).message'
    );
    
    // Fix pattern 7: Generic error instanceof Error ? error.message
    content = content.replace(
      /(\w+) instanceof Error \? \1\.message/g,
      '$1 instanceof Error ? ($1 as Error).message'
    );
    
    // If content changed, write it back
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      const relativePath = path.relative(__dirname, filePath);
      console.log(`✅ Fixed: ${relativePath}`);
      fixedFiles++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('🎉 TypeScript error fix completed!');
console.log(`📊 Total files processed: ${totalFiles}`);
console.log(`🔧 Files fixed: ${fixedFiles}`);

if (fixedFiles > 0) {
  console.log('✅ All TypeScript instanceof Error patterns have been fixed!');
} else {
  console.log('ℹ️ No files needed fixing.');
}
