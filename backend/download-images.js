#!/usr/bin/env node
/**
 * Download Product Images from External URLs
 * Run this from the backend directory: node download-images.js
 */

// Load environment variables
require('dotenv').config();

const pool = require('./src/db/pool');
const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'products');

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        console.log('✓ Upload directory ready:', UPLOAD_DIR);
    } catch (error) {
        console.error('✗ Failed to create upload directory:', error);
        throw error;
    }
}

/**
 * Download image from URL
 */
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle redirects
                return downloadImage(response.headers.location).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Get file extension from URL
 */
function getExtension(url) {
    // Try to get from URL
    const urlExt = path.extname(url.split('?')[0]).toLowerCase();
    if (urlExt && urlExt.match(/^\.(jpg|jpeg|png|gif|webp|avif)$/)) {
        return urlExt.substring(1);
    }
    
    return 'jpg'; // default
}

/**
 * Download and save image locally
 */
async function downloadAndSaveImage(url, productName) {
    try {
        console.log(`  Downloading: ${url.substring(0, 80)}...`);
        
        const imageBuffer = await downloadImage(url);
        
        // Generate unique filename
        const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
        const sanitizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
        const extension = getExtension(url);
        const filename = `${sanitizedName}-${hash}.${extension}`;
        const filepath = path.join(UPLOAD_DIR, filename);
        
        // Save file
        await fs.writeFile(filepath, imageBuffer);
        
        console.log(`  ✓ Saved (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
        
        // Return relative path from public directory
        return `uploads/products/${filename}`;
    } catch (error) {
        console.error(`  ✗ Failed:`, error.message);
        return null;
    }
}

/**
 * Process all product images
 */
async function processProductImages() {
    try {
        // Get all product images that are external URLs
        const result = await pool.query(`
            SELECT pi.id, pi.product_id, pi.url, pi.is_primary, pi.display_order, p.name as product_name
            FROM product_images pi
            JOIN products p ON pi.product_id = p.id
            WHERE pi.url LIKE 'http%'
            ORDER BY pi.product_id, pi.display_order
        `);
        
        console.log(`\nFound ${result.rows.length} external images to download\n`);
        
        if (result.rows.length === 0) {
            console.log('No external images found. All images are already local!\n');
            return;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (const row of result.rows) {
            console.log(`\nProcessing: ${row.product_name}`);
            console.log(`  Current URL: ${row.url.substring(0, 60)}...`);
            
            const localPath = await downloadAndSaveImage(row.url, row.product_name);
            
            if (localPath) {
                // Update database with local path
                await pool.query(
                    'UPDATE product_images SET url = $1 WHERE id = $2',
                    [localPath, row.id]
                );
                console.log(`  ✓ Updated database: ${localPath}`);
                successCount++;
            } else {
                failCount++;
            }
            
            // Small delay to avoid overwhelming servers
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log('\n=================================');
        console.log(`✓ Successfully downloaded: ${successCount}`);
        console.log(`✗ Failed: ${failCount}`);
        console.log('=================================\n');
        
    } catch (error) {
        console.error('Error processing images:', error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('\n=================================');
    console.log('Product Image Download Script');
    console.log('=================================\n');
    
    try {
        await ensureUploadDir();
        await processProductImages();
        
        console.log('Done! All images have been processed.\n');
    } catch (error) {
        console.error('\nScript failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

// Run the script
main();
