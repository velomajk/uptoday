const fs = require('fs');
const path = require('path');

const FEEDS_DIR = path.join(__dirname, 'feeds');
const OUTPUT_FILE = path.join(__dirname, 'feeds.json');

// Helper to recursively find files
function findFiles(dir, fileName, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileName, fileList);
    } else if (file === fileName) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Helper to extract tag content
function extractTag(content, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>(.*?)</${tagName}>`, 's');
  const match = content.match(regex);
  return match ? match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : null;
}

// Helper to extract attribute
function extractAttribute(content, tagName, attrName) {
  const regex = new RegExp(`<${tagName}[^>]*${attrName}=["'](.*?)["']`, 's');
  const match = content.match(regex);
  return match ? match[1] : null;
}

function generateManifest() {
  console.log('Scanning for feed.xml files...');
  const feedFiles = findFiles(FEEDS_DIR, 'feed.xml');
  console.log(`Found ${feedFiles.length} feeds.`);

  const feeds = feedFiles.map(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(__dirname, filePath);
    
    // Extract metadata
    // Try standard RSS title/description first
    let title = extractTag(content, 'title');
    let description = extractTag(content, 'description');
    
    // Try itunes:image first, then standard image
    let image = extractAttribute(content, 'itunes:image', 'href');
    if (!image) {
      const imageTag = extractTag(content, 'image');
      if (imageTag) {
        image = extractTag(imageTag, 'url');
      }
    }

    // Get the folder name as an ID or category
    const folder = path.dirname(relativePath).split(path.sep).pop();

    return {
      path: relativePath,
      folder: folder,
      title: title || 'Untitled Podcast',
      description: description || '',
      image: image || ''
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(feeds, null, 2));
  console.log(`Manifest written to ${OUTPUT_FILE}`);
}

generateManifest();
