const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Ahsash@123',
    database: 'nicobar_products',
    port: 3306
};

async function createExitIntentTables() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Create exit intent feedback table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS exit_intent_feedback (
                id INT PRIMARY KEY AUTO_INCREMENT,
                session_id VARCHAR(255),
                exit_reason VARCHAR(100),
                purchase_intent VARCHAR(100),
                bring_back_factor VARCHAR(100),
                open_feedback TEXT,
                email VARCHAR(255),
                browsing_time INT,
                user_agent TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_session (session_id),
                INDEX idx_email (email),
                INDEX idx_created (created_at)
            )
        `);

        // Create mailing list table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS mailing_list (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(255) UNIQUE,
                source VARCHAR(100),
                exit_reason VARCHAR(100),
                purchase_intent VARCHAR(100),
                preferences JSON,
                subscribed BOOLEAN DEFAULT TRUE,
                last_email_sent TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_source (source),
                INDEX idx_subscribed (subscribed)
            )
        `);

        console.log('✅ Exit intent feedback tables created successfully');
        console.log('📋 Tables created:');
        console.log('   - exit_intent_feedback (stores all feedback responses)');
        console.log('   - mailing_list (stores emails for follow-up)');

    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the setup
createExitIntentTables(); 