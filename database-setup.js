const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class NicobarDatabaseSetup {
    constructor() {
        this.connection = null;
        this.csvDirectory = 'C:\\Users\\ahsas\\Downloads\\nicobar stuff\\';
        this.dbConfig = {
            host: 'localhost',
            user: 'root', // Change if your MySQL user is different
            password: 'Ahsash@123', // Add your MySQL password here
            database: 'nicobar_products',
            port: 3306
        };
    }

    async initialize() {
        try {
            // First connect without database to create it
            const tempConnection = await mysql.createConnection({
                host: this.dbConfig.host,
                user: this.dbConfig.user,
                password: this.dbConfig.password,
                port: this.dbConfig.port
            });

            // Create database if it doesn't exist
            await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${this.dbConfig.database}`);
            await tempConnection.end();

            // Now connect to the specific database
            this.connection = await mysql.createConnection(this.dbConfig);
            console.log('✅ MySQL database connection established');
            
        } catch (error) {
            console.error('❌ Error connecting to MySQL:', error.message);
            console.log('\n💡 Make sure MySQL is running and check your credentials in database-setup.js');
            throw error;
        }
    }

    async createTables() {
        try {
            // Products table
            const createProductsTableSQL = `
                CREATE TABLE IF NOT EXISTS products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_name VARCHAR(500) NOT NULL,
                    product_sub_category VARCHAR(255),
                    product_price VARCHAR(100),
                    product_category VARCHAR(255),
                    product_image TEXT,
                    product_available_colors VARCHAR(255),
                    product_description TEXT,
                    source_file VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_category (product_category),
                    INDEX idx_subcategory (product_sub_category),
                    INDEX idx_price (product_price),
                    INDEX idx_name (product_name(100))
                );
            `;

            // User sessions table
            const createUserSessionsTableSQL = `
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100) UNIQUE NOT NULL,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP NULL,
                    total_products_viewed INT DEFAULT 0,
                    total_likes INT DEFAULT 0,
                    total_dislikes INT DEFAULT 0,
                    reached_moodboard BOOLEAN DEFAULT FALSE,
                    user_agent TEXT,
                    ip_address VARCHAR(45),
                    INDEX idx_session (session_id),
                    INDEX idx_started (started_at)
                );
            `;

            // Product interactions table (likes/dislikes)
            const createProductInteractionsTableSQL = `
                CREATE TABLE IF NOT EXISTS product_interactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    product_id INT NOT NULL,
                    interaction_type ENUM('like', 'dislike', 'feedback_request') NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    swipe_direction ENUM('left', 'right', 'up') NULL,
                    position_in_sequence INT,
                    time_spent_viewing INT DEFAULT 0,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    INDEX idx_session (session_id),
                    INDEX idx_product (product_id),
                    INDEX idx_interaction (interaction_type),
                    INDEX idx_timestamp (timestamp)
                );
            `;

            // Feedback responses table (structured feedback)
            const createFeedbackResponsesTableSQL = `
                CREATE TABLE IF NOT EXISTS feedback_responses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    product_id INT NOT NULL,
                    feedback_type ENUM('price', 'style', 'expectations', 'quality', 'other') NOT NULL,
                    feedback_context ENUM('swipe_feedback', 'moodboard_feedback') NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    additional_notes TEXT,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    INDEX idx_session (session_id),
                    INDEX idx_product (product_id),
                    INDEX idx_feedback_type (feedback_type),
                    INDEX idx_timestamp (timestamp)
                );
            `;

            // Open-ended feedback table
            const createOpenFeedbackTableSQL = `
                CREATE TABLE IF NOT EXISTS open_feedback (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    feedback_text TEXT NOT NULL,
                    feedback_context ENUM('general_feedback', 'improvement_suggestions', 'experience_feedback') NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    sentiment_score DECIMAL(3,2) NULL,
                    INDEX idx_session (session_id),
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_context (feedback_context)
                );
            `;

            // Moodboard interactions table
            const createMoodboardInteractionsTableSQL = `
                CREATE TABLE IF NOT EXISTS moodboard_interactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    product_id INT NOT NULL,
                    action_type ENUM('heart', 'cross', 'employee_call') NOT NULL,
                    position_in_moodboard INT,
                    store_section VARCHAR(255),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    INDEX idx_session (session_id),
                    INDEX idx_product (product_id),
                    INDEX idx_action (action_type),
                    INDEX idx_timestamp (timestamp)
                );
            `;

            // Employee calls table
            const createEmployeeCallsTableSQL = `
                CREATE TABLE IF NOT EXISTS employee_calls (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    product_id INT NOT NULL,
                    product_name VARCHAR(500),
                    store_section VARCHAR(255),
                    call_context ENUM('moodboard_heart', 'direct_call') NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    employee_responded BOOLEAN DEFAULT FALSE,
                    response_time_minutes INT NULL,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    INDEX idx_session (session_id),
                    INDEX idx_product (product_id),
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_section (store_section)
                );
            `;

            // User preferences analysis table
            const createUserPreferencesTableSQL = `
                CREATE TABLE IF NOT EXISTS user_preferences_analysis (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    preferred_categories JSON,
                    preferred_colors JSON,
                    preferred_price_range JSON,
                    disliked_categories JSON,
                    style_profile VARCHAR(100),
                    confidence_score DECIMAL(3,2),
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_session (session_id),
                    INDEX idx_generated (generated_at)
                );
            `;

            // Execute all table creation statements
            await this.connection.execute(createProductsTableSQL);
            console.log('✅ Products table created successfully');

            await this.connection.execute(createUserSessionsTableSQL);
            console.log('✅ User sessions table created successfully');

            await this.connection.execute(createProductInteractionsTableSQL);
            console.log('✅ Product interactions table created successfully');

            await this.connection.execute(createFeedbackResponsesTableSQL);
            console.log('✅ Feedback responses table created successfully');

            await this.connection.execute(createOpenFeedbackTableSQL);
            console.log('✅ Open feedback table created successfully');

            await this.connection.execute(createMoodboardInteractionsTableSQL);
            console.log('✅ Moodboard interactions table created successfully');

            await this.connection.execute(createEmployeeCallsTableSQL);
            console.log('✅ Employee calls table created successfully');

            await this.connection.execute(createUserPreferencesTableSQL);
            console.log('✅ User preferences analysis table created successfully');
            
        } catch (error) {
            console.error('❌ Error creating tables:', error);
            throw error;
        }
    }

    async loadCSVFile(filename) {
        return new Promise((resolve, reject) => {
            const filePath = path.join(this.csvDirectory, filename);
            const products = [];

            console.log(`📁 Loading ${filename}...`);

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Clean up the data
                    const product = {
                        product_name: row.product_name?.replace(/"/g, '').trim() || '',
                        product_sub_category: row.product_sub_category?.replace(/"/g, '').trim() || '',
                        product_price: row.product_price?.replace(/"/g, '').trim() || '',
                        product_category: row.product_category?.replace(/"/g, '').trim() || '',
                        product_image: row.product_image?.replace(/"/g, '').trim() || '',
                        product_available_colors: row.product_available_colors?.replace(/"/g, '').trim() || '',
                        product_description: row.product_description?.replace(/"/g, '').replace(/\n/g, ' ').trim() || '',
                        source_file: filename
                    };

                    // Only add products with required fields
                    if (product.product_name && product.product_category) {
                        products.push(product);
                    }
                })
                .on('end', async () => {
                    console.log(`📦 Parsed ${products.length} products from ${filename}`);
                    try {
                        await this.insertProducts(products);
                        resolve(products.length);
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (err) => {
                    console.error(`❌ Error reading ${filename}:`, err);
                    reject(err);
                });
        });
    }

    async insertProducts(products) {
        if (products.length === 0) return;

        try {
            const insertSQL = `
                INSERT INTO products (
                    product_name, product_sub_category, product_price, 
                    product_category, product_image, product_available_colors, 
                    product_description, source_file
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // Use batch insert for better performance
            const batchSize = 100;
            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);
                
                for (const product of batch) {
                    await this.connection.execute(insertSQL, [
                        product.product_name,
                        product.product_sub_category,
                        product.product_price,
                        product.product_category,
                        product.product_image,
                        product.product_available_colors,
                        product.product_description,
                        product.source_file
                    ]);
                }
                
                console.log(`   ✓ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)}`);
            }
            
        } catch (error) {
            console.error('❌ Error inserting products:', error);
            throw error;
        }
    }

    async loadAllCSVFiles() {
        try {
            const files = fs.readdirSync(this.csvDirectory);
            const csvFiles = files.filter(file => file.endsWith('.csv'));
            
            console.log(`🔍 Found ${csvFiles.length} CSV files:`);
            csvFiles.forEach(file => console.log(`   - ${file}`));

            if (csvFiles.length === 0) {
                console.log('❌ No CSV files found in directory:', this.csvDirectory);
                throw new Error('No CSV files found');
            }

            // Clear existing data
            console.log('\n🗑️  Clearing existing product data...');
            await this.connection.execute('DELETE FROM products');
            await this.connection.execute('ALTER TABLE products AUTO_INCREMENT = 1');

            let totalProducts = 0;

            for (const file of csvFiles) {
                try {
                const count = await this.loadCSVFile(file);
                totalProducts += count;
                console.log(`   ✅ ${file}: ${count} products loaded\n`);
                } catch (fileError) {
                    console.error(`❌ Error loading ${file}:`, fileError.message);
                    console.log(`   ⚠️  Continuing with other files...\n`);
                }
            }

            console.log(`\n🧹 Removing duplicate products...`);
            const duplicatesRemoved = await this.removeDuplicates();

            console.log(`\n🎉 TOTAL PRODUCTS LOADED: ${totalProducts} from ${csvFiles.length} CSV files`);
            console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`);
            
            // Verify the count
            const [countResult] = await this.connection.execute('SELECT COUNT(*) as total FROM products');
            console.log(`📊 Database verification: ${countResult[0].total} products in database`);

            return totalProducts;
            
        } catch (error) {
            console.error('❌ Error loading CSV files:', error);
            throw error;
        }
    }

    async removeDuplicates() {
        try {
            // Find duplicates based on product_name and product_category
            const [duplicates] = await this.connection.execute(`
                SELECT product_name, product_category, COUNT(*) as count, GROUP_CONCAT(id) as ids
                FROM products 
                GROUP BY product_name, product_category 
                HAVING COUNT(*) > 1
            `);

            let totalRemoved = 0;

            for (const duplicate of duplicates) {
                const ids = duplicate.ids.split(',').map(id => parseInt(id));
                // Keep the first one, remove the rest
                const idsToRemove = ids.slice(1);
                
                if (idsToRemove.length > 0) {
                    await this.connection.execute(
                        `DELETE FROM products WHERE id IN (${idsToRemove.map(() => '?').join(',')})`,
                        idsToRemove
                    );
                    totalRemoved += idsToRemove.length;
                    console.log(`   🗑️  Removed ${idsToRemove.length} duplicates of "${duplicate.product_name}"`);
                }
            }

            return totalRemoved;
            
        } catch (error) {
            console.error('❌ Error removing duplicates:', error);
            throw error;
        }
    }

    async getDetailedStats() {
        try {
            // Get overall stats
            const [totalCount] = await this.connection.execute('SELECT COUNT(*) as total FROM products');
            
            // Get category breakdown
            const [categoryStats] = await this.connection.execute(`
                SELECT 
                    product_category,
                    COUNT(*) as count,
                    GROUP_CONCAT(DISTINCT source_file) as source_files
                FROM products 
                GROUP BY product_category 
                ORDER BY count DESC
            `);

            // Get file breakdown
            const [fileStats] = await this.connection.execute(`
                SELECT 
                    source_file,
                    COUNT(*) as count,
                    COUNT(DISTINCT product_category) as categories
                FROM products 
                GROUP BY source_file 
                ORDER BY count DESC
            `);

            return {
                total: totalCount[0].total,
                by_category: categoryStats,
                by_file: fileStats
            };
            
        } catch (error) {
            console.error('❌ Error getting detailed stats:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            const [rows] = await this.connection.execute(`
                SELECT 
                    product_category,
                    COUNT(*) as count,
                    source_file
                FROM products 
                GROUP BY product_category, source_file
                ORDER BY product_category, count DESC
            `);
            
            return rows;
            
        } catch (error) {
            console.error('❌ Error getting stats:', error);
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Main setup function
async function setupDatabase() {
    const dbSetup = new NicobarDatabaseSetup();
    
    try {
        console.log('🚀 Starting Nicobar database setup...\n');
        
        await dbSetup.initialize();
        await dbSetup.createTables();
        
        console.log('\n📊 Loading ALL products from CSV files...');
        const totalProducts = await dbSetup.loadAllCSVFiles();
        
        console.log('\n📈 Generating detailed statistics...');
        const detailedStats = await dbSetup.getDetailedStats();
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL DATABASE STATISTICS');
        console.log('='.repeat(60));
        console.log(`Total Products: ${detailedStats.total}`);
        
        console.log('\n📁 Products by CSV File:');
        detailedStats.by_file.forEach(file => {
            console.log(`   ${file.source_file}: ${file.count} products (${file.categories} categories)`);
        });
        
        console.log('\n🏷️  Products by Category:');
        detailedStats.by_category.forEach(cat => {
            console.log(`   ${cat.product_category}: ${cat.count} products`);
        });
        
        console.log('\n✅ Database setup completed successfully!');
        console.log('🎯 All user interactions will now be tracked and stored.');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        await dbSetup.close();
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { NicobarDatabaseSetup, setupDatabase }; 
