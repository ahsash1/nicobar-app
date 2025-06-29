const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const fs = require('fs');
let puppeteer;

// Try to load puppeteer, fallback if not available
try {
    puppeteer = require('puppeteer');
} catch (error) {
    console.log('📄 Puppeteer not available, PDF generation disabled');
    puppeteer = null;
}

const app = express();
const PORT = process.env.PORT || 5000;

// MySQL connection configuration
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Ahsash@123',
    database: process.env.MYSQL_DATABASE || 'nicobar_products',
    port: process.env.MYSQL_PORT || 3306
};

let dbConnection = null;

// Email configuration
const emailTransporter = nodemailer.createTransport({
    // For development: Using Gmail SMTP (you can change this)
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Set in environment variables
        pass: process.env.EMAIL_PASS || 'your-app-password'     // Use app-specific password
    }
});

// For production, you might want to use SendGrid, Mailgun, etc.
// const emailTransporter = nodemailer.createTransport({
//     host: 'smtp.sendgrid.net',
//     port: 587,
//     auth: {
//         user: 'apikey',
//         pass: process.env.SENDGRID_API_KEY
//     }
// });

// Initialize database connection
async function initDatabase() {
    try {
        dbConnection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('💡 Make sure MySQL is running and database is set up');
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve the Nicobar homepage
app.get('/nicobar-homepage', (req, res) => {
    res.sendFile(path.join(__dirname, 'nicobar-homepage.html'));
});

// === EXIT INTENT FEEDBACK API ===

// Save exit intent feedback
app.post('/api/exit-intent-feedback', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { 
            responses, 
            openFeedback, 
            email, 
            browsingTime, 
            sessionId,
            userAgent,
            ipAddress 
        } = req.body;

        // Insert feedback into database
        const [result] = await dbConnection.execute(`
            INSERT INTO exit_intent_feedback 
            (session_id, exit_reason, purchase_intent, bring_back_factor, open_feedback, email, browsing_time, user_agent, ip_address) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            sessionId || `exit_${Date.now()}`,
            responses.exit_reason || null,
            responses.purchase_intent || null,
            responses.bring_back || null,
            openFeedback || null,
            email || null,
            browsingTime || 0,
            userAgent || null,
            ipAddress || req.ip
        ]);

        console.log(`🔄 Exit intent feedback saved: ${result.insertId}`);

        // If email provided, add to mailing list and send personalized email
        if (email && email.trim()) {
            await addToMailingList(email, responses);
            await sendPersonalizedEmail(email, responses, openFeedback);
        }

        res.json({ 
            success: true, 
            message: 'Feedback saved successfully',
            feedbackId: result.insertId 
        });

    } catch (error) {
        console.error('Error saving exit intent feedback:', error);
        res.status(500).json({ 
            error: 'Failed to save feedback',
            message: error.message 
        });
    }
});

// Function to add email to mailing list
async function addToMailingList(email, responses) {
    try {
        // Check if email already exists
        const [existing] = await dbConnection.execute(
            'SELECT id FROM mailing_list WHERE email = ?',
            [email]
        );

        if (existing.length === 0) {
            // Add new email to mailing list
            await dbConnection.execute(`
                INSERT INTO mailing_list 
                (email, source, exit_reason, purchase_intent, preferences, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [
                email,
                'exit_intent_popup',
                responses.exit_reason || null,
                responses.purchase_intent || null,
                JSON.stringify(responses)
            ]);

            console.log(`📧 Email added to mailing list: ${email}`);
        } else {
            console.log(`📧 Email already in mailing list: ${email}`);
        }
    } catch (error) {
        console.error('Error adding to mailing list:', error);
    }
}

// Send personalized email based on user responses
async function sendPersonalizedEmail(email, responses, openFeedback) {
    try {
        // Get curated products for the email
        const curatedProducts = await getCuratedProducts(responses);
        
        const emailContent = generatePersonalizedEmailContent(responses, openFeedback, curatedProducts);
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'hello@nicobar.com',
            to: email,
            subject: emailContent.subject,
            html: emailContent.html
        };

        await emailTransporter.sendMail(mailOptions);
        console.log(`📧 Personalized email with ${curatedProducts.length} products sent to: ${email}`);
        
        // Update mailing list with email sent status
        await dbConnection.execute(
            'UPDATE mailing_list SET last_email_sent = NOW() WHERE email = ?',
            [email]
        );

    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
}

// Get curated products based on user preferences
async function getCuratedProducts(responses) {
    try {
        if (!dbConnection) {
            return [];
        }

        const { exit_reason, purchase_intent, bring_back } = responses;
        
        let categoryFilters = [];
        let priceFilters = [];
        
        // Determine product preferences based on responses
        if (exit_reason === 'price' || bring_back === 'discount') {
            // Price-sensitive: Show lower-priced items
            priceFilters.push('product_price < 3000');
        } else if (purchase_intent === 'ready') {
            // Ready buyers: Show popular/trending items
            categoryFilters.push('product_category IN ("Dresses", "Tops", "Kurtas")');
        } else if (exit_reason === 'not_found') {
            // Couldn't find items: Show diverse selection
            categoryFilters.push('product_category IN ("Dresses", "Tops", "Kurtas", "Bottoms")');
        }

        // Build query with filters
        let query = `
            SELECT 
                id, product_name, product_category, product_price, 
                product_image, product_description
            FROM products 
            WHERE product_image IS NOT NULL 
            AND product_image != '' 
            AND product_name IS NOT NULL
        `;
        
        if (categoryFilters.length > 0) {
            query += ` AND ${categoryFilters.join(' AND ')}`;
        }
        if (priceFilters.length > 0) {
            query += ` AND ${priceFilters.join(' AND ')}`;
        }
        
        query += ` ORDER BY RAND() LIMIT 8`;
        
        const [products] = await dbConnection.execute(query);
        
        return products.map(product => ({
            id: product.id,
            name: product.product_name,
            category: product.product_category,
            price: product.product_price,
            image: product.product_image,
            description: product.product_description
        }));

    } catch (error) {
        console.error('Error getting curated products:', error);
        return [];
    }
}

// Generate personalized email content based on responses
function generatePersonalizedEmailContent(responses, openFeedback, curatedProducts = []) {
    const { exit_reason, purchase_intent, bring_back } = responses;
    
    // Determine email type based on responses
    let emailType = 'general';
    let subject = 'Your curated collection awaits! ✨';
    
    // Customize based on exit reason and purchase intent
    if (exit_reason === 'price' || bring_back === 'discount') {
        emailType = 'price_sensitive';
        subject = 'Special prices just for you! 🎉';
    } else if (purchase_intent === 'ready') {
        emailType = 'ready_buyer';
        subject = 'Your perfect pieces are here! 💎';
    } else if (exit_reason === 'not_found' || bring_back === 'better_selection') {
        emailType = 'product_seeker';
        subject = 'We found what you\'re looking for! 👗';
    } else if (purchase_intent === 'considering') {
        emailType = 'considering';
        subject = 'Curated just for you to explore 💙';
    }

    return {
        subject,
        html: generateEmailHTML(emailType, responses, openFeedback, curatedProducts)
    };
}

// Generate HTML email templates
function generateEmailHTML(emailType, responses, openFeedback, curatedProducts = []) {
    const baseTemplate = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
            <div style="background-color: white; border-radius: 15px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #d4a574; font-size: 32px; margin-bottom: 10px; font-weight: 300;">NICOBAR</h1>
                    <div style="width: 50px; height: 3px; background-color: #d4a574; margin: 0 auto;"></div>
                </div>
                
                {{CONTENT}}
                
                <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                        Follow us for daily style inspiration
                    </p>
                    <div style="margin-bottom: 20px;">
                        <a href="#" style="display: inline-block; margin: 0 10px; color: #d4a574; text-decoration: none;">Instagram</a>
                        <a href="#" style="display: inline-block; margin: 0 10px; color: #d4a574; text-decoration: none;">Facebook</a>
                        <a href="#" style="display: inline-block; margin: 0 10px; color: #d4a574; text-decoration: none;">Pinterest</a>
                    </div>
                    <p style="color: #999; font-size: 12px;">
                        © 2024 Nicobar. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    `;

    let content = '';

    switch (emailType) {
        case 'price_sensitive':
            content = `
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">We heard you! 🎯</h2>
                <p style="color: #666; text-align: center; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    We understand that finding the perfect piece at the right price is important. 
                    Here's a special offer just for you:
                </p>
                <div style="background-color: #d4a574; color: white; text-align: center; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 24px;">15% OFF</h3>
                    <p style="margin: 0; font-size: 14px;">Use code: <strong>WELCOME15</strong></p>
                    <p style="margin: 5px 0 0 0; font-size: 12px;">Valid for 7 days</p>
                </div>
                <div style="text-align: center;">
                    <a href="https://nicobar.com" style="display: inline-block; background-color: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Shop Now with Discount
                    </a>
                </div>
            `;
            break;

        case 'ready_buyer':
            content = `
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Your cart is waiting! 🛍️</h2>
                <p style="color: #666; text-align: center; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    We noticed you were ready to make a purchase. Don't let your perfect pieces slip away!
                </p>
                <div style="background-color: #f8f4e6; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #d4a574;">
                    <h4 style="color: #d4a574; margin: 0 0 10px 0;">Limited Time Offer:</h4>
                    <p style="color: #666; margin: 0; font-size: 14px;">Complete your purchase in the next 24 hours and get free express shipping!</p>
                </div>
                <div style="text-align: center;">
                    <a href="https://nicobar.com" style="display: inline-block; background-color: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px;">
                        Complete Purchase
                    </a>
                    <a href="https://nicobar.com/help" style="display: inline-block; border: 2px solid #d4a574; color: #d4a574; padding: 13px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Need Help?
                    </a>
                </div>
            `;
            break;

        case 'product_seeker':
            content = `
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">We found something special! 👗</h2>
                <p style="color: #666; text-align: center; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Based on your feedback, we've curated a collection that we think you'll love:
                </p>
                <div style="background-color: #f8f4e6; padding: 25px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
                    <h4 style="color: #d4a574; margin: 0 0 15px 0;">Curated Just For You</h4>
                    <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">New arrivals that match your style preferences</p>
                    <div style="display: inline-block; background-color: #d4a574; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        FREE STYLING CONSULTATION
                    </div>
                </div>
                <div style="text-align: center;">
                    <a href="https://nicobar.com/new-arrivals" style="display: inline-block; background-color: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        View Curated Collection
                    </a>
                </div>
            `;
            break;

        case 'considering':
            content = `
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Take your time 💭</h2>
                <p style="color: #666; text-align: center; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    We know choosing the perfect piece takes thought. Here are some resources to help:
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px;">
                    <div style="flex: 1; min-width: 200px; background-color: #f8f4e6; padding: 20px; border-radius: 10px;">
                        <h4 style="color: #d4a574; margin: 0 0 10px 0; font-size: 16px;">Style Guide</h4>
                        <p style="color: #666; margin: 0; font-size: 13px;">Discover your personal style</p>
                    </div>
                    <div style="flex: 1; min-width: 200px; background-color: #f8f4e6; padding: 20px; border-radius: 10px;">
                        <h4 style="color: #d4a574; margin: 0 0 10px 0; font-size: 16px;">Size Guide</h4>
                        <p style="color: #666; margin: 0; font-size: 13px;">Find your perfect fit</p>
                    </div>
                </div>
                <div style="text-align: center;">
                    <a href="https://nicobar.com/style-guide" style="display: inline-block; background-color: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Explore Style Guide
                    </a>
                </div>
            `;
            break;

        default:
            content = `
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Thank you for your feedback! 💙</h2>
                <p style="color: #666; text-align: center; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Your thoughts help us create better experiences. As a thank you, here's something special:
                </p>
                <div style="background-color: #f8f4e6; padding: 25px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
                    <h4 style="color: #d4a574; margin: 0 0 15px 0;">First-Time Visitor?</h4>
                    <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">Get 10% off your first purchase</p>
                    <div style="display: inline-block; background-color: #d4a574; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        Use code: FIRST10
                    </div>
                </div>
                <div style="text-align: center;">
                    <a href="https://nicobar.com" style="display: inline-block; background-color: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Start Shopping
                    </a>
                </div>
            `;
    }

    // Add curated products section
    if (curatedProducts && curatedProducts.length > 0) {
        content += `
            <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #d4a574;">
                <h3 style="color: #d4a574; text-align: center; margin-bottom: 25px; font-size: 24px;">
                    🎨 Curated Just For You
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
                    ${curatedProducts.slice(0, 8).map(product => `
                        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: transform 0.2s;">
                            <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 200px; object-fit: cover;">
                            <div style="padding: 15px;">
                                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: 600;">${product.name}</h4>
                                <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${product.category}</p>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #d4a574; font-weight: 700; font-size: 16px;">₹${product.price}</span>
                                    <a href="https://nicobar.com/product/${product.id}" style="color: #d4a574; text-decoration: none; font-size: 12px; font-weight: 600;">View →</a>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="text-align: center; margin-top: 25px;">
                    <a href="https://nicobar.com" style="display: inline-block; background-color: #d4a574; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Shop Full Collection
                    </a>
                </div>
            </div>
        `;
    }

    // Add open feedback section if provided
    if (openFeedback && openFeedback.trim()) {
        content += `
            <div style="margin-top: 30px; padding: 20px; background-color: #f0f8ff; border-radius: 10px; border-left: 4px solid #d4a574;">
                <h4 style="color: #d4a574; margin: 0 0 10px 0;">Your feedback:</h4>
                <p style="color: #666; margin: 0; font-style: italic;">"${openFeedback}"</p>
                <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">We'll definitely take this into consideration!</p>
            </div>
        `;
    }

    return baseTemplate.replace('{{CONTENT}}', content);
}

// Exit Survey Analytics API
app.get('/api/analytics/exit-survey', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        // Get all exit survey data
        const [responses] = await dbConnection.execute(`
            SELECT * FROM exit_intent_feedback 
            ORDER BY created_at DESC
        `);

        const [emails] = await dbConnection.execute(`
            SELECT * FROM mailing_list 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        // Calculate analytics
        const analytics = {
            total_responses: responses.length,
            total_emails: emails.length,
            exit_reasons: calculateBreakdown(responses, 'exit_reason'),
            purchase_intent: calculateBreakdown(responses, 'purchase_intent'),
            bring_back_factors: calculateBreakdown(responses, 'bring_back_factor'),
            recent_emails: emails.slice(0, 10),
            price_sensitivity_rate: responses.filter(r => r.exit_reason === 'price').length / Math.max(responses.length, 1),
            ready_buyer_rate: responses.filter(r => r.purchase_intent === 'ready').length / Math.max(responses.length, 1),
            email_conversion_rate: emails.length / Math.max(responses.length, 1),
            avg_browsing_time: responses.reduce((sum, r) => sum + (r.browsing_time || 0), 0) / Math.max(responses.length, 1)
        };

        res.json({ success: true, analytics });

    } catch (error) {
        console.error('Error fetching exit survey analytics:', error);
        res.status(500).json({ error: 'Failed to fetch exit survey analytics' });
    }
});

// Admin Analytics Summary API
app.post('/api/admin/send-summary', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email address is required' });
        }

        // Generate comprehensive analytics summary
        const analyticsData = await generateComprehensiveAnalytics();
        
        if (!analyticsData) {
            return res.status(500).json({ error: 'Unable to generate analytics data' });
        }
        
        // Create email content and PDF
        const emailContent = generateAnalyticsSummaryEmail(analyticsData);
        let pdfBuffer = null;
        
        // Generate PDF if puppeteer is available
        if (puppeteer) {
            try {
                pdfBuffer = await generateAnalyticsPDF(analyticsData);
                console.log('📄 PDF generated successfully');
            } catch (error) {
                console.error('PDF generation failed:', error.message);
            }
        }
        
        // Improved email headers for better deliverability
        const mailOptions = {
            from: `"Nicobar Analytics" <${process.env.EMAIL_USER || 'analytics@nicobar.com'}>`,
            to: email,
            subject: `📊 Nicobar Analytics Summary - ${new Date().toLocaleDateString()}`,
            html: emailContent,
            text: generatePlainTextSummary(analyticsData), // Plain text version
            headers: {
                'List-Unsubscribe': '<mailto:unsubscribe@nicobar.com>',
                'X-Mailer': 'Nicobar Analytics Dashboard',
                'X-Priority': '3',
                'Return-Path': process.env.EMAIL_USER
            }
        };
        
        // Add PDF attachment if available
        if (pdfBuffer) {
            mailOptions.attachments = [{
                filename: `Nicobar-Analytics-${new Date().toISOString().split('T')[0]}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }];
        }

        await emailTransporter.sendMail(mailOptions);
        console.log(`📧 Analytics summary ${pdfBuffer ? 'with PDF ' : ''}sent to: ${email}`);

        res.json({ 
            success: true, 
            message: 'Analytics summary sent successfully',
            email: email
        });

    } catch (error) {
        console.error('Error sending analytics summary:', error);
        res.status(500).json({ error: 'Failed to send analytics summary' });
    }
});

// Generate comprehensive analytics data
async function generateComprehensiveAnalytics() {
    try {
        // Get all data sources with proper error handling
        const [sessions] = await dbConnection.execute('SELECT * FROM user_sessions ORDER BY started_at DESC').catch(() => [[]]);
        const [interactions] = await dbConnection.execute('SELECT * FROM product_interactions ORDER BY timestamp DESC').catch(() => [[]]);
        const [feedback] = await dbConnection.execute('SELECT * FROM feedback ORDER BY timestamp DESC').catch(() => [[]]);
        const [exitSurvey] = await dbConnection.execute('SELECT * FROM exit_intent_feedback ORDER BY created_at DESC').catch(() => [[]]);
        const [mailingList] = await dbConnection.execute('SELECT * FROM mailing_list ORDER BY created_at DESC').catch(() => [[]]);
        const [products] = await dbConnection.execute('SELECT COUNT(*) as total FROM products').catch(() => [[{total: 480}]]);

        // Calculate comprehensive metrics
        const totalSessions = sessions.length;
        const totalInteractions = interactions.length;
        const totalFeedback = feedback.length;
        const totalExitResponses = exitSurvey.length;
        const totalEmails = mailingList.length;
        const totalProducts = products[0].total;

        // Session analytics
        const completedSessions = sessions.filter(s => s.completed_at).length;
        const avgProductsViewed = sessions.reduce((sum, s) => sum + (s.total_products_viewed || 0), 0) / Math.max(totalSessions, 1);
        const moodboardReachRate = sessions.filter(s => s.reached_moodboard).length / Math.max(totalSessions, 1);

        // Interaction analytics
        const likes = interactions.filter(i => i.interaction_type === 'like').length;
        const dislikes = interactions.filter(i => i.interaction_type === 'dislike').length;
        const feedbackRequests = interactions.filter(i => i.interaction_type === 'feedback_request').length;

        // Exit survey analytics
        const exitReasons = calculateBreakdown(exitSurvey, 'exit_reason');
        const purchaseIntent = calculateBreakdown(exitSurvey, 'purchase_intent');
        const emailConversionRate = totalEmails / Math.max(totalExitResponses, 1);
        const avgBrowsingTime = exitSurvey.reduce((sum, e) => sum + (e.browsing_time || 0), 0) / Math.max(totalExitResponses, 1);

        // Product performance
        const productInteractionCounts = {};
        interactions.forEach(interaction => {
            const productId = interaction.product_id;
            if (!productInteractionCounts[productId]) {
                productInteractionCounts[productId] = { likes: 0, dislikes: 0, total: 0 };
            }
            productInteractionCounts[productId].total++;
            if (interaction.interaction_type === 'like') {
                productInteractionCounts[productId].likes++;
            } else if (interaction.interaction_type === 'dislike') {
                productInteractionCounts[productId].dislikes++;
            }
        });

        const topProducts = Object.entries(productInteractionCounts)
            .sort(([,a], [,b]) => b.total - a.total)
            .slice(0, 10);

        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentSessions = sessions.filter(s => new Date(s.started_at) > sevenDaysAgo).length;
        const recentExitResponses = exitSurvey.filter(e => new Date(e.created_at) > sevenDaysAgo).length;
        const recentEmails = mailingList.filter(m => new Date(m.created_at) > sevenDaysAgo).length;

        return {
            overview: {
                totalSessions,
                totalInteractions,
                totalFeedback,
                totalExitResponses,
                totalEmails,
                totalProducts,
                completedSessions,
                completionRate: completedSessions / Math.max(totalSessions, 1)
            },
            engagement: {
                avgProductsViewed,
                moodboardReachRate,
                likes,
                dislikes,
                feedbackRequests,
                likeRate: likes / Math.max(totalInteractions, 1),
                dislikeRate: dislikes / Math.max(totalInteractions, 1)
            },
            exitSurvey: {
                totalResponses: totalExitResponses,
                exitReasons,
                purchaseIntent,
                emailConversionRate,
                avgBrowsingTime: Math.round(avgBrowsingTime / 1000) // Convert to seconds
            },
            products: {
                totalProducts,
                topProducts: topProducts.slice(0, 5)
            },
            recent: {
                sessions: recentSessions,
                exitResponses: recentExitResponses,
                emails: recentEmails
            },
            generatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error generating comprehensive analytics:', error);
        
        // Return basic structure with safe defaults
        return {
            generatedAt: new Date().toISOString(),
            overview: {
                totalSessions: 0,
                totalInteractions: 0,
                totalExitResponses: 0,
                totalEmails: 0,
                completionRate: 0
            },
            engagement: {
                avgProductsViewed: 0,
                moodboardReachRate: 0,
                likeRate: 0
            },
            exitSurvey: {
                exitReasons: [],
                purchaseIntent: [],
                emailConversionRate: 0,
                avgBrowsingTime: 0
            },
            recent: {
                sessions: 0,
                exitResponses: 0,
                emails: 0
            }
        };
    }
}

// Generate analytics summary email HTML
function generateAnalyticsSummaryEmail(data) {
    if (!data) {
        return '<p>Unable to generate analytics data.</p>';
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nicobar Analytics Summary</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 20px;">
            <div style="max-width: 800px; margin: 0 auto; background-color: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #d4a574 0%, #c39660 100%); padding: 40px; text-align: center;">
                    <h1 style="color: white; margin: 0 0 10px 0; font-size: 32px; font-weight: 300;">NICOBAR</h1>
                    <div style="width: 50px; height: 3px; background-color: white; margin: 0 auto 20px auto;"></div>
                    <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Analytics Summary Report</h2>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Generated on ${new Date(data.generatedAt).toLocaleDateString()}</p>
                </div>

                <!-- Overview Section -->
                <div style="padding: 40px;">
                    <h3 style="color: #2f4f4f; margin-bottom: 25px; font-size: 20px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">📊 Overview</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 40px;">
                        <div style="background: #f8f4e6; padding: 20px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: #d4a574; margin-bottom: 8px;">${data.overview.totalSessions}</div>
                            <div style="font-size: 14px; color: #666;">Total Sessions</div>
                        </div>
                        <div style="background: #f8f4e6; padding: 20px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: #d4a574; margin-bottom: 8px;">${data.overview.totalInteractions}</div>
                            <div style="font-size: 14px; color: #666;">Total Interactions</div>
                        </div>
                        <div style="background: #f8f4e6; padding: 20px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: #d4a574; margin-bottom: 8px;">${data.overview.totalExitResponses}</div>
                            <div style="font-size: 14px; color: #666;">Exit Survey Responses</div>
                        </div>
                        <div style="background: #f8f4e6; padding: 20px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: #d4a574; margin-bottom: 8px;">${data.overview.totalEmails}</div>
                            <div style="font-size: 14px; color: #666;">Email Signups</div>
                        </div>
                    </div>

                    <!-- Engagement Metrics -->
                    <h3 style="color: #2f4f4f; margin-bottom: 25px; font-size: 20px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">🎯 Engagement Metrics</h3>
                    <div style="background: #f0f8ff; padding: 25px; border-radius: 12px; margin-bottom: 40px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                            <div>
                                <div style="font-size: 24px; font-weight: 700; color: #41698c;">${Math.round(data.engagement.avgProductsViewed * 10) / 10}</div>
                                <div style="font-size: 14px; color: #666;">Avg Products Viewed</div>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 700; color: #41698c;">${Math.round(data.engagement.moodboardReachRate * 100)}%</div>
                                <div style="font-size: 14px; color: #666;">Moodboard Reach Rate</div>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 700; color: #41698c;">${Math.round(data.engagement.likeRate * 100)}%</div>
                                <div style="font-size: 14px; color: #666;">Like Rate</div>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 700; color: #41698c;">${Math.round(data.overview.completionRate * 100)}%</div>
                                <div style="font-size: 14px; color: #666;">Session Completion Rate</div>
                            </div>
                        </div>
                    </div>

                    <!-- Exit Survey Insights -->
                    <h3 style="color: #2f4f4f; margin-bottom: 25px; font-size: 20px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">🚪 Exit Survey Insights</h3>
                    <div style="background: #fff5f5; padding: 25px; border-radius: 12px; margin-bottom: 40px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 25px;">
                            <div>
                                <h4 style="color: #d4a574; margin-bottom: 15px;">Top Exit Reasons</h4>
                                ${data.exitSurvey.exitReasons.slice(0, 3).map(reason => `
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                        <span style="color: #666; font-size: 14px;">${formatExitReasonForEmail(reason.exit_reason)}</span>
                                        <span style="color: #d4a574; font-weight: 600;">${reason.count}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div>
                                <h4 style="color: #d4a574; margin-bottom: 15px;">Purchase Intent</h4>
                                ${data.exitSurvey.purchaseIntent.slice(0, 3).map(intent => `
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                        <span style="color: #666; font-size: 14px;">${formatPurchaseIntentForEmail(intent.purchase_intent)}</span>
                                        <span style="color: #d4a574; font-weight: 600;">${intent.count}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; color: #d4a574;">${Math.round(data.exitSurvey.emailConversionRate * 100)}%</div>
                                    <div style="font-size: 12px; color: #666;">Email Conversion</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; color: #d4a574;">${data.exitSurvey.avgBrowsingTime}s</div>
                                    <div style="font-size: 12px; color: #666;">Avg Browse Time</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <h3 style="color: #2f4f4f; margin-bottom: 25px; font-size: 20px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">📈 Recent Activity (Last 7 Days)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 40px;">
                        <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700; color: #4a9; margin-bottom: 8px;">${data.recent.sessions}</div>
                            <div style="font-size: 14px; color: #666;">New Sessions</div>
                        </div>
                        <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700; color: #4a9; margin-bottom: 8px;">${data.recent.exitResponses}</div>
                            <div style="font-size: 14px; color: #666;">Exit Responses</div>
                        </div>
                        <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700; color: #4a9; margin-bottom: 8px;">${data.recent.emails}</div>
                            <div style="font-size: 14px; color: #666;">Email Signups</div>
                        </div>
                    </div>

                    <!-- Key Insights -->
                    <h3 style="color: #2f4f4f; margin-bottom: 25px; font-size: 20px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">💡 Key Insights</h3>
                    <div style="background: #f0f8ff; padding: 25px; border-radius: 12px;">
                        <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.8;">
                            <li><strong>Engagement:</strong> Users view an average of ${Math.round(data.engagement.avgProductsViewed * 10) / 10} products per session</li>
                            <li><strong>Conversion:</strong> ${Math.round(data.engagement.moodboardReachRate * 100)}% of users reach the moodboard stage</li>
                            <li><strong>Feedback:</strong> ${Math.round(data.engagement.likeRate * 100)}% positive interaction rate</li>
                            <li><strong>Exit Intent:</strong> ${Math.round(data.exitSurvey.emailConversionRate * 100)}% of exit survey users provide email addresses</li>
                            <li><strong>Growth:</strong> ${data.recent.sessions} new sessions in the last week</li>
                        </ul>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #2f4f4f; padding: 30px; text-align: center;">
                    <p style="color: white; margin: 0; font-size: 16px;">Generated by Nicobar Analytics Dashboard</p>
                    <p style="color: rgba(255,255,255,0.7); margin: 10px 0 0 0; font-size: 14px;">For more detailed insights, visit the admin dashboard</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Generate PDF version of analytics
async function generateAnalyticsPDF(data) {
    if (!puppeteer) {
        throw new Error('Puppeteer not available');
    }

    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Create PDF-optimized HTML
        const pdfHTML = generatePDFOptimizedHTML(data);
        
        await page.setContent(pdfHTML, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

// Generate PDF-optimized HTML
function generatePDFOptimizedHTML(data) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Nicobar Analytics Summary</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
                .header { background: #d4a574; color: white; padding: 30px; text-align: center; margin-bottom: 30px; }
                .header h1 { margin: 0; font-size: 28px; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; }
                .section { margin-bottom: 30px; }
                .section h2 { border-bottom: 2px solid #d4a574; padding-bottom: 10px; color: #2f4f4f; }
                .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
                .metric-card { background: #f8f4e6; padding: 15px; text-align: center; border-radius: 8px; }
                .metric-number { font-size: 24px; font-weight: bold; color: #d4a574; }
                .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
                .insights ul { line-height: 1.8; }
                .breakdown { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .breakdown-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
                .page-break { page-break-before: always; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>NICOBAR ANALYTICS SUMMARY</h1>
                <p>Generated on ${new Date(data.generatedAt).toLocaleDateString()}</p>
            </div>

            <div class="section">
                <h2>📊 Overview</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-number">${data.overview.totalSessions}</div>
                        <div class="metric-label">Total Sessions</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${data.overview.totalInteractions}</div>
                        <div class="metric-label">Total Interactions</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${data.overview.totalExitResponses}</div>
                        <div class="metric-label">Exit Survey Responses</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${data.overview.totalEmails}</div>
                        <div class="metric-label">Email Signups</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>🎯 Engagement Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-number">${Math.round(data.engagement.avgProductsViewed * 10) / 10}</div>
                        <div class="metric-label">Avg Products Viewed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${Math.round(data.engagement.moodboardReachRate * 100)}%</div>
                        <div class="metric-label">Moodboard Reach Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${Math.round(data.engagement.likeRate * 100)}%</div>
                        <div class="metric-label">Like Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${Math.round(data.overview.completionRate * 100)}%</div>
                        <div class="metric-label">Session Completion Rate</div>
                    </div>
                </div>
            </div>

            <div class="section page-break">
                <h2>🚪 Exit Survey Insights</h2>
                <div class="breakdown">
                    <div>
                        <h3>Top Exit Reasons</h3>
                        ${data.exitSurvey.exitReasons.slice(0, 5).map(reason => `
                            <div class="breakdown-item">
                                <span>${formatExitReasonForEmail(reason.exit_reason)}</span>
                                <span><strong>${reason.count}</strong></span>
                            </div>
                        `).join('')}
                    </div>
                    <div>
                        <h3>Purchase Intent</h3>
                        ${data.exitSurvey.purchaseIntent.slice(0, 5).map(intent => `
                            <div class="breakdown-item">
                                <span>${formatPurchaseIntentForEmail(intent.purchase_intent)}</span>
                                <span><strong>${intent.count}</strong></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="metrics-grid" style="margin-top: 20px;">
                    <div class="metric-card">
                        <div class="metric-number">${Math.round(data.exitSurvey.emailConversionRate * 100)}%</div>
                        <div class="metric-label">Email Conversion Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${data.exitSurvey.avgBrowsingTime}s</div>
                        <div class="metric-label">Avg Browsing Time</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📈 Recent Activity (Last 7 Days)</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-number">${data.recent.sessions}</div>
                        <div class="metric-label">New Sessions</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${data.recent.exitResponses}</div>
                        <div class="metric-label">Exit Responses</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number">${data.recent.emails}</div>
                        <div class="metric-label">Email Signups</div>
                    </div>
                </div>
            </div>

            <div class="section insights">
                <h2>💡 Key Insights</h2>
                <ul>
                    <li><strong>Engagement:</strong> Users view an average of ${Math.round(data.engagement.avgProductsViewed * 10) / 10} products per session</li>
                    <li><strong>Conversion:</strong> ${Math.round(data.engagement.moodboardReachRate * 100)}% of users reach the moodboard stage</li>
                    <li><strong>Feedback:</strong> ${Math.round(data.engagement.likeRate * 100)}% positive interaction rate</li>
                    <li><strong>Exit Intent:</strong> ${Math.round(data.exitSurvey.emailConversionRate * 100)}% of exit survey users provide email addresses</li>
                    <li><strong>Growth:</strong> ${data.recent.sessions} new sessions in the last week</li>
                </ul>
            </div>
        </body>
        </html>
    `;
}

// Generate plain text summary for better email deliverability
function generatePlainTextSummary(data) {
    return `
NICOBAR ANALYTICS SUMMARY
Generated on ${new Date(data.generatedAt).toLocaleDateString()}

OVERVIEW
--------
Total Sessions: ${data.overview.totalSessions}
Total Interactions: ${data.overview.totalInteractions}
Exit Survey Responses: ${data.overview.totalExitResponses}
Email Signups: ${data.overview.totalEmails}

ENGAGEMENT METRICS
------------------
Average Products Viewed: ${Math.round(data.engagement.avgProductsViewed * 10) / 10}
Moodboard Reach Rate: ${Math.round(data.engagement.moodboardReachRate * 100)}%
Like Rate: ${Math.round(data.engagement.likeRate * 100)}%
Session Completion Rate: ${Math.round(data.overview.completionRate * 100)}%

EXIT SURVEY INSIGHTS
--------------------
Email Conversion Rate: ${Math.round(data.exitSurvey.emailConversionRate * 100)}%
Average Browsing Time: ${data.exitSurvey.avgBrowsingTime} seconds

Top Exit Reasons:
${data.exitSurvey.exitReasons.slice(0, 3).map(reason => 
    `- ${formatExitReasonForEmail(reason.exit_reason)}: ${reason.count}`
).join('\n')}

RECENT ACTIVITY (Last 7 Days)
------------------------------
New Sessions: ${data.recent.sessions}
Exit Responses: ${data.recent.exitResponses}
Email Signups: ${data.recent.emails}

KEY INSIGHTS
------------
- Users view an average of ${Math.round(data.engagement.avgProductsViewed * 10) / 10} products per session
- ${Math.round(data.engagement.moodboardReachRate * 100)}% of users reach the moodboard stage
- ${Math.round(data.engagement.likeRate * 100)}% positive interaction rate
- ${Math.round(data.exitSurvey.emailConversionRate * 100)}% of exit survey users provide email addresses
- ${data.recent.sessions} new sessions in the last week

Generated by Nicobar Analytics Dashboard
    `;
}

// Helper functions for email formatting
function formatExitReasonForEmail(reason) {
    const reasons = {
        'price': 'Price Concerns',
        'not_found': 'Product Not Found',
        'browsing': 'Just Browsing',
        'confusing': 'Site Confusing',
        'other': 'Other'
    };
    return reasons[reason] || reason;
}

function formatPurchaseIntentForEmail(intent) {
    const intents = {
        'ready': 'Ready to Buy',
        'considering': 'Considering',
        'early': 'Early Stage',
        'not_interested': 'Not Interested'
    };
    return intents[intent] || intent;
}

// Helper function for analytics breakdown
function calculateBreakdown(data, field) {
    const breakdown = {};
    data.forEach(item => {
        const value = item[field];
        if (value) {
            breakdown[value] = (breakdown[value] || 0) + 1;
        }
    });
    
    return Object.entries(breakdown).map(([key, count]) => ({
        [field]: key,
        count
    }));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Nicobar Style Discovery App is running',
        database: dbConnection ? 'connected' : 'disconnected'
    });
});

// Get random products from database
app.get('/api/products', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        // Get random products from database
        const [rows] = await dbConnection.execute(`
            SELECT 
                id,
                product_name,
                product_category,
                product_sub_category,
                product_price,
                product_image,
                product_description,
                product_available_colors
            FROM products 
            WHERE product_image IS NOT NULL 
            AND product_image != '' 
            AND product_name IS NOT NULL
            ORDER BY RAND() 
            LIMIT 100
        `);

        // Format products for the app
        const products = rows.map(row => ({
            id: row.id,
            name: row.product_name,
            category: row.product_category,
            subcategory: row.product_sub_category,
            price: row.product_price,
            image: row.product_image || null, // Use actual database image
            description: row.product_description,
            colors: row.product_available_colors
        }));

        res.json({
            success: true,
            count: products.length,
            products: products
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ 
            error: 'Failed to fetch products',
            message: error.message 
        });
    }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const [rows] = await dbConnection.execute(
            'SELECT * FROM products WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = {
            id: rows[0].id,
            name: rows[0].product_name,
            category: rows[0].product_category,
            subcategory: rows[0].product_sub_category,
            price: rows[0].product_price,
            image: rows[0].product_image || null, // Use actual database image
            description: rows[0].product_description,
            colors: rows[0].product_available_colors
        };

        res.json({ success: true, product });

    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ 
            error: 'Failed to fetch product',
            message: error.message 
        });
    }
});

// === USER SESSION MANAGEMENT ===

// Start a new user session
app.post('/api/session/start', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { sessionId, userAgent, ipAddress } = req.body;
        
        await dbConnection.execute(`
            INSERT INTO user_sessions (session_id, user_agent, ip_address) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE started_at = CURRENT_TIMESTAMP
        `, [sessionId, userAgent || null, ipAddress || null]);

        console.log(`🚀 New session started: ${sessionId}`);
        res.json({ success: true, message: 'Session started', sessionId });

    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Update session progress
app.post('/api/session/update', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { sessionId, totalProductsViewed, totalLikes, totalDislikes, reachedMoodboard } = req.body;
        
        await dbConnection.execute(`
            UPDATE user_sessions 
            SET total_products_viewed = ?, total_likes = ?, total_dislikes = ?, reached_moodboard = ?
            WHERE session_id = ?
        `, [totalProductsViewed, totalLikes, totalDislikes, reachedMoodboard, sessionId]);

        res.json({ success: true, message: 'Session updated' });

    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// End user session
app.post('/api/session/end', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { sessionId } = req.body;
        
        await dbConnection.execute(`
            UPDATE user_sessions 
            SET completed_at = CURRENT_TIMESTAMP 
            WHERE session_id = ?
        `, [sessionId]);

        console.log(`✅ Session completed: ${sessionId}`);
        res.json({ success: true, message: 'Session ended' });

    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// === PRODUCT INTERACTIONS ===

// Log product interaction (like/dislike/feedback_request)
app.post('/api/interaction', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { 
            sessionId, 
            productId, 
            interactionType, 
            swipeDirection, 
            positionInSequence, 
            timeSpentViewing 
        } = req.body;

        await dbConnection.execute(`
            INSERT INTO product_interactions 
            (session_id, product_id, interaction_type, swipe_direction, position_in_sequence, time_spent_viewing)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [sessionId, productId, interactionType, swipeDirection, positionInSequence, timeSpentViewing]);

        console.log(`👆 Interaction: ${interactionType} | Product ID: ${productId} | Session: ${sessionId}`);
        res.json({ success: true, message: 'Interaction logged' });

    } catch (error) {
        console.error('Error logging interaction:', error);
        res.status(500).json({ error: 'Failed to log interaction' });
    }
});

// === FEEDBACK RESPONSES ===

// Log structured feedback response
app.post('/api/feedback', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { 
            sessionId, 
            productId, 
            feedbackType, 
            feedbackContext, 
            additionalNotes 
        } = req.body;

        await dbConnection.execute(`
            INSERT INTO feedback_responses 
            (session_id, product_id, feedback_type, feedback_context, additional_notes)
            VALUES (?, ?, ?, ?, ?)
        `, [sessionId, productId, feedbackType, feedbackContext, additionalNotes]);

        console.log(`💬 Feedback: ${feedbackType} | Product ID: ${productId} | Context: ${feedbackContext}`);
        res.json({ success: true, message: 'Feedback logged' });

    } catch (error) {
        console.error('Error logging feedback:', error);
        res.status(500).json({ error: 'Failed to log feedback' });
    }
});

// Log open-ended feedback
app.post('/api/feedback/open', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { sessionId, feedbackText, feedbackContext } = req.body;

        await dbConnection.execute(`
            INSERT INTO open_feedback (session_id, feedback_text, feedback_context)
            VALUES (?, ?, ?)
        `, [sessionId, feedbackText, feedbackContext]);

        console.log(`📝 Open feedback received from session: ${sessionId}`);
        res.json({ success: true, message: 'Open feedback logged' });

    } catch (error) {
        console.error('Error logging open feedback:', error);
        res.status(500).json({ error: 'Failed to log open feedback' });
    }
});

// === MOODBOARD INTERACTIONS ===

// Log moodboard interaction (heart/cross)
app.post('/api/moodboard/interaction', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { 
            sessionId, 
            productId, 
            actionType, 
            positionInMoodboard, 
            storeSection 
        } = req.body;

        await dbConnection.execute(`
            INSERT INTO moodboard_interactions 
            (session_id, product_id, action_type, position_in_moodboard, store_section)
            VALUES (?, ?, ?, ?, ?)
        `, [sessionId, productId, actionType, positionInMoodboard, storeSection]);

        console.log(`❤️ Moodboard ${actionType}: Product ID ${productId} | Session: ${sessionId}`);
        res.json({ success: true, message: 'Moodboard interaction logged' });

    } catch (error) {
        console.error('Error logging moodboard interaction:', error);
        res.status(500).json({ error: 'Failed to log moodboard interaction' });
    }
});

// === EMPLOYEE CALLS ===

// Log employee call request
app.post('/api/employee/call', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { 
            sessionId, 
            productId, 
            productName, 
            storeSection, 
            callContext 
        } = req.body;

        await dbConnection.execute(`
            INSERT INTO employee_calls 
            (session_id, product_id, product_name, store_section, call_context)
            VALUES (?, ?, ?, ?, ?)
        `, [sessionId, productId, productName, storeSection, callContext]);

        console.log(`📞 Employee call: ${productName} | Section: ${storeSection} | Session: ${sessionId}`);
        res.json({ success: true, message: 'Employee call logged' });

    } catch (error) {
        console.error('Error logging employee call:', error);
        res.status(500).json({ error: 'Failed to log employee call' });
    }
});

// === USER PREFERENCES ANALYSIS ===

// Save user preferences analysis
app.post('/api/preferences/analyze', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { 
            sessionId, 
            preferredCategories, 
            preferredColors, 
            preferredPriceRange, 
            dislikedCategories, 
            styleProfile, 
            confidenceScore 
        } = req.body;

        await dbConnection.execute(`
            INSERT INTO user_preferences_analysis 
            (session_id, preferred_categories, preferred_colors, preferred_price_range, 
             disliked_categories, style_profile, confidence_score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            sessionId, 
            JSON.stringify(preferredCategories), 
            JSON.stringify(preferredColors), 
            JSON.stringify(preferredPriceRange), 
            JSON.stringify(dislikedCategories), 
            styleProfile, 
            confidenceScore
        ]);

        console.log(`🎯 Preferences analyzed for session: ${sessionId} | Style: ${styleProfile}`);
        res.json({ success: true, message: 'User preferences analyzed and saved' });

    } catch (error) {
        console.error('Error saving preferences analysis:', error);
        res.status(500).json({ error: 'Failed to save preferences analysis' });
    }
});

// === ANALYTICS ENDPOINTS ===

// Get session analytics
app.get('/api/analytics/sessions', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const [sessions] = await dbConnection.execute(`
            SELECT 
                COUNT(*) as total_sessions,
                AVG(total_products_viewed) as avg_products_viewed,
                AVG(total_likes) as avg_likes,
                AVG(total_dislikes) as avg_dislikes,
                SUM(reached_moodboard) as sessions_reached_moodboard
            FROM user_sessions
        `);

        res.json({ success: true, analytics: sessions[0] });

    } catch (error) {
        console.error('Error fetching session analytics:', error);
        res.status(500).json({ error: 'Failed to fetch session analytics' });
    }
});

// Get interaction analytics
app.get('/api/analytics/interactions', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const [interactions] = await dbConnection.execute(`
            SELECT 
                interaction_type,
                COUNT(*) as count,
                AVG(time_spent_viewing) as avg_time_spent
            FROM product_interactions 
            GROUP BY interaction_type
        `);

        // Fix the most interacted products query to properly count ALL interactions including feedback
        const [topProducts] = await dbConnection.execute(`
            SELECT 
                p.product_name,
                p.product_category,
                COUNT(pi.id) as total_interactions,
                SUM(CASE WHEN pi.interaction_type = 'like' THEN 1 ELSE 0 END) as likes,
                SUM(CASE WHEN pi.interaction_type = 'dislike' THEN 1 ELSE 0 END) as dislikes,
                SUM(CASE WHEN pi.interaction_type = 'feedback_request' THEN 1 ELSE 0 END) as feedback_requests
            FROM products p
            JOIN product_interactions pi ON p.id = pi.product_id
            GROUP BY p.id, p.product_name, p.product_category
            ORDER BY total_interactions DESC
            LIMIT 5
        `);

        res.json({ 
            success: true, 
            interactions_by_type: interactions,
            top_products: topProducts
        });

    } catch (error) {
        console.error('Error fetching interaction analytics:', error);
        res.status(500).json({ error: 'Failed to fetch interaction analytics' });
    }
});

// === ADMIN-SPECIFIC ENDPOINTS ===

// Get all products for admin search
app.get('/api/admin/products/all', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const [rows] = await dbConnection.execute(`
            SELECT 
                id,
                product_name,
                product_category,
                product_sub_category,
                product_price,
                product_image,
                product_description,
                product_available_colors
            FROM products 
            ORDER BY product_name ASC
        `);

        res.json({
            success: true,
            count: rows.length,
            products: rows
        });

    } catch (error) {
        console.error('Error fetching all products:', error);
        res.status(500).json({ 
            error: 'Failed to fetch products',
            message: error.message 
        });
    }
});

// Get detailed analytics for a specific product
app.get('/api/admin/products/:id/analytics', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const productId = req.params.id;

        // Get all likes for this product
        const [likes] = await dbConnection.execute(`
            SELECT 
                pi.*,
                us.session_id,
                us.started_at
            FROM product_interactions pi
            LEFT JOIN user_sessions us ON pi.session_id = us.session_id
            WHERE pi.product_id = ? AND pi.interaction_type = 'like'
            ORDER BY pi.timestamp DESC
        `, [productId]);

        // Get all dislikes for this product
        const [dislikes] = await dbConnection.execute(`
            SELECT 
                pi.*,
                us.session_id,
                us.started_at
            FROM product_interactions pi
            LEFT JOIN user_sessions us ON pi.session_id = us.session_id
            WHERE pi.product_id = ? AND pi.interaction_type = 'dislike'
            ORDER BY pi.timestamp DESC
        `, [productId]);

        // Get all structured feedback for this product
        const [feedback] = await dbConnection.execute(`
            SELECT 
                fr.*,
                us.session_id,
                us.started_at
            FROM feedback_responses fr
            LEFT JOIN user_sessions us ON fr.session_id = us.session_id
            WHERE fr.product_id = ?
            ORDER BY fr.timestamp DESC
        `, [productId]);

        // Get moodboard interactions for this product
        const [moodboard] = await dbConnection.execute(`
            SELECT 
                mi.*,
                us.session_id,
                us.started_at
            FROM moodboard_interactions mi
            LEFT JOIN user_sessions us ON mi.session_id = us.session_id
            WHERE mi.product_id = ?
            ORDER BY mi.timestamp DESC
        `, [productId]);

        // Get employee calls for this product
        const [employeeCalls] = await dbConnection.execute(`
            SELECT 
                ec.*,
                us.session_id,
                us.started_at
            FROM employee_calls ec
            LEFT JOIN user_sessions us ON ec.session_id = us.session_id
            WHERE ec.product_id = ?
            ORDER BY ec.timestamp DESC
        `, [productId]);

        res.json({
            success: true,
            productId: parseInt(productId),
            likes: likes,
            dislikes: dislikes,
            feedback: feedback,
            moodboard: moodboard,
            employeeCalls: employeeCalls,
            summary: {
                total_likes: likes.length,
                total_dislikes: dislikes.length,
                total_feedback: feedback.length,
                total_moodboard_actions: moodboard.length,
                total_employee_calls: employeeCalls.length,
                total_interactions: likes.length + dislikes.length + feedback.length
            }
        });

    } catch (error) {
        console.error('Error fetching product analytics:', error);
        res.status(500).json({ 
            error: 'Failed to fetch product analytics',
            message: error.message 
        });
    }
});

// Get admin dashboard summary
app.get('/api/admin/dashboard/summary', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        // Get summary statistics
        const [totalProducts] = await dbConnection.execute('SELECT COUNT(*) as count FROM products');
        const [totalSessions] = await dbConnection.execute('SELECT COUNT(*) as count FROM user_sessions');
        const [totalInteractions] = await dbConnection.execute('SELECT COUNT(*) as count FROM product_interactions');
        const [totalFeedback] = await dbConnection.execute('SELECT COUNT(*) as count FROM feedback_responses');
        const [totalOpenFeedback] = await dbConnection.execute('SELECT COUNT(*) as count FROM open_feedback');
        const [totalEmployeeCalls] = await dbConnection.execute('SELECT COUNT(*) as count FROM employee_calls');

        // Get recent activity
        const [recentInteractions] = await dbConnection.execute(`
            SELECT 
                pi.interaction_type,
                pi.timestamp,
                p.product_name,
                p.product_category
            FROM product_interactions pi
            JOIN products p ON pi.product_id = p.id
            ORDER BY pi.timestamp DESC
            LIMIT 10
        `);

        // Get category breakdown
        const [categoryBreakdown] = await dbConnection.execute(`
            SELECT 
                p.product_category,
                COUNT(DISTINCT p.id) as total_products,
                COUNT(pi.id) as total_interactions,
                SUM(CASE WHEN pi.interaction_type = 'like' THEN 1 ELSE 0 END) as likes,
                SUM(CASE WHEN pi.interaction_type = 'dislike' THEN 1 ELSE 0 END) as dislikes
            FROM products p
            LEFT JOIN product_interactions pi ON p.id = pi.product_id
            GROUP BY p.product_category
            ORDER BY total_interactions DESC
        `);

        res.json({
            success: true,
            summary: {
                total_products: totalProducts[0].count,
                total_sessions: totalSessions[0].count,
                total_interactions: totalInteractions[0].count,
                total_feedback: totalFeedback[0].count,
                total_open_feedback: totalOpenFeedback[0].count,
                total_employee_calls: totalEmployeeCalls[0].count
            },
            recent_interactions: recentInteractions,
            category_breakdown: categoryBreakdown
        });

    } catch (error) {
        console.error('Error fetching admin dashboard summary:', error);
        res.status(500).json({ 
            error: 'Failed to fetch dashboard summary',
            message: error.message 
        });
    }
});

// Get general feedback breakdown analytics
app.get('/api/analytics/feedback/breakdown', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const [feedbackBreakdown] = await dbConnection.execute(`
            SELECT 
                feedback_type,
                COUNT(*) as count
            FROM feedback_responses 
            GROUP BY feedback_type
            ORDER BY count DESC
        `);

        const breakdown = {
            price: 0,
            style: 0,
            expectations: 0,
            quality: 0,
            total: 0
        };

        feedbackBreakdown.forEach(item => {
            if (breakdown.hasOwnProperty(item.feedback_type)) {
                breakdown[item.feedback_type] = item.count;
                breakdown.total += item.count;
            }
        });

        res.json({
            success: true,
            breakdown: breakdown
        });

    } catch (error) {
        console.error('Error fetching feedback breakdown:', error);
        res.status(500).json({ 
            error: 'Failed to fetch feedback breakdown',
            message: error.message 
        });
    }
});

// Get database stats
app.get('/api/stats', async (req, res) => {
    try {
        if (!dbConnection) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const [totalRows] = await dbConnection.execute('SELECT COUNT(*) as total FROM products');
        const [categoryRows] = await dbConnection.execute(`
            SELECT product_category, COUNT(*) as count 
            FROM products 
            GROUP BY product_category 
            ORDER BY count DESC
        `);

        res.json({
            success: true,
            total_products: totalRows[0].total,
            categories: categoryRows
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch stats',
            message: error.message 
        });
    }
});

// Initialize database and start server
async function startServer() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`🎨 Nicobar Style Discovery App running on http://localhost:${PORT}`);
        console.log(`📱 Open this URL on your iPad or desktop browser`);
        console.log(`💾 Database: ${dbConnection ? '✅ Connected' : '❌ Disconnected'}`);
    });
}

startServer(); 