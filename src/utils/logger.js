const fs = require('fs');
const path = require('path');

// Define log directory and file paths
const LOG_DIR = path.join(__dirname, '../../logs');
const APP_LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Ensure log directory exists synchronously on startup
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create logs directory:', err);
}

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format the log message
 * @param {string} level - Log level (INFO, WARN, ERROR)
 * @param {string} message - The main log message
 * @param {any} meta - Additional metadata or error object
 * @returns {string} Formatted log line
 */
function formatLogLine(level, message, meta = null) {
  const timestamp = getTimestamp();
  let metaString = '';

  if (meta) {
    if (meta instanceof Error) {
      metaString = `\nStack: ${meta.stack}`;
    } else if (typeof meta === 'object') {
      try {
        metaString = ` ${JSON.stringify(meta)}`;
      } catch (e) {
        metaString = ' [Circular/Unserializable]';
      }
    } else {
      metaString = ` ${meta}`;
    }
  }

  return `[${timestamp}] [${level}] ${message}${metaString}\n`;
}

/**
 * Append message to a log file
 * @param {string} filePath - Path to the log file
 * @param {string} content - Content to append
 */
function appendToFile(filePath, content) {
  fs.appendFile(filePath, content, (err) => {
    if (err) {
      // Fallback to console if file write fails, to ensure we don't lose the error visibility
      console.error(`FAILED TO WRITE TO LOG FILE: ${filePath}`, err);
    }
  });
}

const logger = {
  /**
   * Log informational messages
   * @param {string} message 
   * @param {any} meta 
   */
  info: (message, meta) => {
    const content = formatLogLine('INFO', message, meta);
    // Also log to console for standard output capture (Docker/PM2)
    console.log(content.trim());
    appendToFile(APP_LOG_FILE, content);
  },

  /**
   * Log warning messages
   * @param {string} message 
   * @param {any} meta 
   */
  warn: (message, meta) => {
    const content = formatLogLine('WARN', message, meta);
    console.warn(content.trim());
    appendToFile(APP_LOG_FILE, content);
  },

  /**
   * Log error messages
   * @param {string} message 
   * @param {Error|any} error 
   */
  error: (message, error) => {
    const content = formatLogLine('ERROR', message, error);
    console.error(content.trim());

    // Write to both the main app log and the dedicated error log
    appendToFile(APP_LOG_FILE, content);
    appendToFile(ERROR_LOG_FILE, content);
  }
};

module.exports = logger;
