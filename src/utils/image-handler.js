const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Checks if a string is a base64 encoded image
 * @param {string} str - The string to check
 * @returns {boolean} - True if it's a base64 image
 */
function isBase64Image(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:image/');
}

/**
 * Checks if a string is a URL
 * @param {string} str - The string to check
 * @returns {boolean} - True if it's a URL
 */
function isUrl(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts file extension from base64 data URL
 * @param {string} base64Data - The base64 data URL
 * @returns {string} - The file extension
 */
function getExtensionFromBase64(base64Data) {
  const match = base64Data.match(/data:image\/([a-zA-Z0-9]+);/);
  return match ? match[1] : 'jpg';
}

/**
 * Saves a base64 image to the public/images directory
 * @param {string} base64Data - The base64 image data
 * @param {string} symbol - The company symbol to use in filename
 * @returns {string} - The URL path to the saved image
 */
function saveBase64Image(base64Data, symbol) {
  if (!isBase64Image(base64Data)) {
    throw new Error('Invalid base64 image data');
  }

  // Extract the actual base64 data (remove data:image/...;base64, part)
  const base64Content = base64Data.split(',')[1];
  if (!base64Content) {
    throw new Error('Invalid base64 format');
  }

  // Get file extension
  const extension = getExtensionFromBase64(base64Data);

  // Create filename using just the symbol (will overwrite existing files)
  const filename = `${symbol}.${extension}`;  // Ensure public/images directory exists
  const imagesDir = path.join(process.cwd(), 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Save the file
  const filePath = path.join(imagesDir, filename);
  const buffer = Buffer.from(base64Content, 'base64');
  fs.writeFileSync(filePath, buffer);

  // Return the URL path
  return `/images/${filename}`;
}

/**
 * Processes an image URL - saves base64 images to disk, leaves URLs as-is
 * @param {string} imageData - The image data (URL or base64)
 * @param {string} symbol - The company symbol
 * @returns {string|null} - The processed image URL or null if invalid
 */
function processImageData(imageData, symbol) {
  if (!imageData || typeof imageData !== 'string') {
    return null;
  }

  // Check for base64 image first (before URL check, since base64 data URIs are technically URLs)
  if (isBase64Image(imageData)) {
    try {
      const result = saveBase64Image(imageData, symbol);
      console.log(`💾 ${symbol}: Saved image to ${result}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to save base64 image for ${symbol}:`, error.message);
      return null;
    }
  }

  // If it's a URL (but not base64), return null (as per requirement, don't save URLs)
  if (isUrl(imageData)) {
    return null;
  }

  // Neither URL nor base64 image
  return null;
}

module.exports = {
  isBase64Image,
  isUrl,
  saveBase64Image,
  processImageData
};