class NicobarAdminDashboard {
    constructor() {
        this.allProducts = [];
        this.selectedProduct = null;
        this.searchTimeout = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Nicobar Admin Dashboard...');
        
        // Load initial data
        await this.loadAllProducts();
        await this.loadGeneralStats();
        await this.loadGeneralAnalytics();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Admin Dashboard initialized successfully');
    }

    setupEventListeners() {
        const searchInput = document.getElementById('product-search');
        const suggestions = document.getElementById('search-suggestions');

        // Product search with debouncing
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.handleProductSearch(e.target.value);
            }, 300);
        });

        // Handle suggestion clicks
        suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                const productId = e.target.dataset.productId;
                const productName = e.target.textContent;
                searchInput.value = productName;
                this.selectProduct(parseInt(productId));
                suggestions.style.display = 'none';
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box')) {
                suggestions.style.display = 'none';
            }
        });

        // Keyboard navigation for suggestions
        searchInput.addEventListener('keydown', (e) => {
            const suggestions = document.getElementById('search-suggestions');
            const items = suggestions.querySelectorAll('.suggestion-item');
            const activeItem = suggestions.querySelector('.suggestion-item.active');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextItem = activeItem ? activeItem.nextElementSibling : items[0];
                if (nextItem) {
                    if (activeItem) activeItem.classList.remove('active');
                    nextItem.classList.add('active');
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevItem = activeItem ? activeItem.previousElementSibling : items[items.length - 1];
                if (prevItem) {
                    if (activeItem) activeItem.classList.remove('active');
                    prevItem.classList.add('active');
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeItem) {
                    activeItem.click();
                }
            } else if (e.key === 'Escape') {
                suggestions.style.display = 'none';
            }
        });
    }

    async loadAllProducts() {
        try {
            const response = await fetch('/api/admin/products/all');
            const data = await response.json();
            
            if (data.success) {
                this.allProducts = data.products;
                console.log(`📦 Loaded ${this.allProducts.length} products for search`);
            } else {
                throw new Error(data.message || 'Failed to load products');
            }
        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.showError('Failed to load products for search');
        }
    }

    async loadGeneralStats() {
        try {
            const response = await fetch('/api/analytics/sessions');
            const data = await response.json();
            
            if (data.success) {
                const stats = data.analytics;
                
                // Update stats cards
                document.getElementById('total-sessions').textContent = stats.total_sessions || 0;
                document.getElementById('total-interactions').textContent = '-';
                document.getElementById('avg-products-viewed').textContent = 
                    stats.avg_products_viewed ? Math.round(stats.avg_products_viewed * 10) / 10 : 0;
                document.getElementById('moodboard-reach-rate').textContent = 
                    stats.total_sessions > 0 
                        ? Math.round((stats.sessions_reached_moodboard / stats.total_sessions) * 100) + '%'
                        : '0%';
                
                // Load interaction stats separately
                await this.loadInteractionStats();
            }
        } catch (error) {
            console.error('❌ Error loading general stats:', error);
            this.showError('Failed to load general statistics');
        }
    }

    async loadInteractionStats() {
        try {
            const response = await fetch('/api/analytics/interactions');
            const data = await response.json();
            
            if (data.success) {
                // Calculate total interactions
                const totalInteractions = data.interactions_by_type.reduce((sum, item) => sum + item.count, 0);
                document.getElementById('total-interactions').textContent = totalInteractions;
            }
        } catch (error) {
            console.error('❌ Error loading interaction stats:', error);
        }
    }

    async loadGeneralAnalytics() {
        try {
            const response = await fetch('/api/analytics/interactions');
            const data = await response.json();
            
            if (data.success) {
                this.displayInteractionAnalytics(data.interactions_by_type);
                this.displayTopProducts(data.top_products);
                
                // Load general feedback analytics
                await this.loadGeneralFeedbackAnalytics();
                
                // Load exit survey analytics
                await this.loadExitSurveyAnalytics();
            }
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            this.showError('Failed to load analytics data');
        }
    }

    async loadGeneralFeedbackAnalytics() {
        try {
            const response = await fetch('/api/analytics/feedback/breakdown');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.displayGeneralFeedbackBreakdown(data.breakdown);
            } else {
                throw new Error(data.error || 'Failed to load feedback data');
            }
        } catch (error) {
            console.error('❌ Error loading feedback analytics:', error);
            this.displayGeneralFeedbackBreakdown({
                price: 0,
                style: 0,
                expectations: 0,
                quality: 0,
                total: 0
            });
        }
    }

    displayGeneralFeedbackBreakdown(breakdown) {
        const container = document.getElementById('general-feedback-analytics');
        
        if (!breakdown || breakdown.total === 0) {
            container.innerHTML = '<div class="no-data">No feedback data available yet</div>';
            return;
        }

        container.innerHTML = `
            <div class="feedback-breakdown">
                <div class="breakdown-item">
                    <span class="breakdown-label">Too Expensive</span>
                    <span class="breakdown-count">${breakdown.price}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Not My Style</span>
                    <span class="breakdown-count">${breakdown.style}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Didn't Meet Expectations</span>
                    <span class="breakdown-count">${breakdown.expectations}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Quality Concerns</span>
                    <span class="breakdown-count">${breakdown.quality}</span>
                </div>
            </div>
        `;
    }

    displayInteractionAnalytics(interactions) {
        const container = document.getElementById('interaction-analytics');
        
        if (!interactions || interactions.length === 0) {
            container.innerHTML = '<div class="no-data">No interaction data available yet</div>';
            return;
        }

        let html = '<div class="table-container"><table class="data-table">';
        html += '<thead><tr><th>Interaction Type</th><th>Count</th><th>Avg Time (seconds)</th></tr></thead><tbody>';
        
        interactions.forEach(item => {
            const avgTime = item.avg_time_spent ? Math.round(item.avg_time_spent) : 0;
            html += `
                <tr>
                    <td>${this.formatInteractionType(item.interaction_type)}</td>
                    <td>${item.count}</td>
                    <td>${avgTime}s</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    displayTopProducts(products) {
        const container = document.getElementById('top-products');
        
        if (!products || products.length === 0) {
            container.innerHTML = '<div class="no-data">No product interaction data available yet</div>';
            return;
        }

        let html = '<div class="table-container"><table class="data-table">';
        html += '<thead><tr><th>Product</th><th>Category</th><th>Likes</th><th>Dislikes</th><th>Like Rate</th></tr></thead><tbody>';
        
        products.slice(0, 5).forEach(product => {
            const likeRate = product.total_interactions > 0 
                ? Math.round((product.likes / product.total_interactions) * 100) 
                : 0;
            html += `
                <tr style="cursor: pointer;" onclick="window.adminDashboard.searchAndSelectProduct('${product.product_name}')">
                    <td>${this.truncateText(product.product_name, 30)}</td>
                    <td>${product.product_category}</td>
                    <td style="color: var(--success-color); font-weight: 600;">${product.likes}</td>
                    <td style="color: var(--error-color); font-weight: 600;">${product.dislikes}</td>
                    <td><strong>${likeRate}%</strong></td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    handleProductSearch(query) {
        const suggestions = document.getElementById('search-suggestions');
        
        if (!query || query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }

        // Filter products based on search query
        const filteredProducts = this.allProducts.filter(product =>
            product.product_name.toLowerCase().includes(query.toLowerCase()) ||
            product.product_category.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);

        if (filteredProducts.length === 0) {
            suggestions.style.display = 'none';
            return;
        }

        // Generate suggestions HTML
        let html = '';
        filteredProducts.forEach(product => {
            html += `
                <div class="suggestion-item" data-product-id="${product.id}">
                    <div style="font-weight: 600;">${product.product_name}</div>
                    <div style="font-size: 0.85rem; color: #718096;">${product.product_category} • ${product.product_price}</div>
                </div>
            `;
        });

        suggestions.innerHTML = html;
        suggestions.style.display = 'block';
    }

    async selectProduct(productId) {
        try {
            // Show loading state
            const productDetails = document.getElementById('product-details');
            productDetails.style.display = 'block';
            productDetails.innerHTML = '<div class="loading">Loading product analytics...</div>';

            // Fetch product details and analytics
            const [productResponse, analyticsResponse] = await Promise.all([
                fetch(`/api/products/${productId}`),
                fetch(`/api/admin/products/${productId}/analytics`)
            ]);

            const productData = await productResponse.json();
            const analyticsData = await analyticsResponse.json();

            if (productData.success && analyticsData.success) {
                this.selectedProduct = productData.product;
                this.displayProductDetails(productData.product, analyticsData);
            } else {
                throw new Error('Failed to load product data');
            }
        } catch (error) {
            console.error('❌ Error loading product details:', error);
            this.showError('Failed to load product details');
        }
    }

    displayProductDetails(product, analytics) {
        const container = document.getElementById('product-details');
        
        // Calculate analytics
        const totalInteractions = analytics.likes.length + analytics.dislikes.length + analytics.feedback.length;
        const likeRate = totalInteractions > 0 ? Math.round((analytics.likes.length / totalInteractions) * 100) : 0;

        // Calculate feedback breakdown
        const feedbackBreakdown = this.calculateFeedbackBreakdown(analytics.feedback);

        container.innerHTML = `
            <div class="product-header">
                <img class="product-image" src="${product.image || '/placeholder-image.jpg'}" 
                     alt="${product.name}" onerror="this.src='/placeholder-image.jpg'">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-meta">
                        <div class="meta-item">
                            <div class="meta-label">Category</div>
                            <div class="meta-value">${product.category}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Price</div>
                            <div class="meta-value">${product.price}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Like Rate</div>
                            <div class="meta-value">${likeRate}%</div>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: rgba(245, 245, 240, 0.8); border-radius: 8px;">
                        <div class="meta-label">Description</div>
                        <div style="color: var(--text-secondary); line-height: 1.5; margin-top: 5px;">
                            ${product.description || 'No description available'}
                        </div>
                    </div>
                </div>
            </div>

            ${feedbackBreakdown.total > 0 ? `
                <div class="feedback-analytics">
                    <h4>Feedback Analytics</h4>
                    <div class="feedback-breakdown">
                        <div class="breakdown-item">
                            <span class="breakdown-label">Too Expensive</span>
                            <span class="breakdown-count">${feedbackBreakdown.price}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Not My Style</span>
                            <span class="breakdown-count">${feedbackBreakdown.style}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Didn't Meet Expectations</span>
                            <span class="breakdown-count">${feedbackBreakdown.expectations}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Quality Concerns</span>
                            <span class="breakdown-count">${feedbackBreakdown.quality}</span>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="feedback-section">
                <div class="feedback-panel">
                    <h4>Likes (${analytics.likes.length})</h4>
                    <div class="feedback-list" id="likes-list">
                        ${this.renderInteractionList(analytics.likes, 'like')}
                    </div>
                </div>

                <div class="feedback-panel">
                    <h4>Dislikes (${analytics.dislikes.length})</h4>
                    <div class="feedback-list" id="dislikes-list">
                        ${this.renderInteractionList(analytics.dislikes, 'dislike')}
                    </div>
                </div>

                <div class="feedback-panel">
                    <h4>Detailed Feedback (${analytics.feedback.length})</h4>
                    <div class="feedback-list" id="feedback-list">
                        ${this.renderFeedbackList(analytics.feedback)}
                    </div>
                </div>

                <div class="feedback-panel">
                    <h4>Moodboard Actions (${analytics.moodboard.length})</h4>
                    <div class="feedback-list" id="moodboard-list">
                        ${this.renderMoodboardList(analytics.moodboard)}
                    </div>
                </div>
            </div>
        `;
    }

    renderInteractionList(interactions, type) {
        if (!interactions || interactions.length === 0) {
            return `<div class="no-data">No ${type}s yet</div>`;
        }

        return interactions.map(item => `
            <div class="feedback-item">
                <div class="feedback-meta">
                    <span class="feedback-date">${this.formatDate(item.timestamp)}</span>
                    <span class="feedback-type">${type}</span>
                </div>
                <div class="feedback-text">
                    Session: ${item.session_id} • Position: ${item.position_in_sequence} • 
                    Time viewed: ${item.time_spent_viewing || 0}s
                </div>
            </div>
        `).join('');
    }

    renderFeedbackList(feedback) {
        if (!feedback || feedback.length === 0) {
            return '<div class="no-data">No feedback yet</div>';
        }

        return feedback.map(item => `
            <div class="feedback-item">
                <div class="feedback-meta">
                    <span class="feedback-date">${this.formatDate(item.timestamp)}</span>
                    <span class="feedback-type">${this.formatFeedbackType(item.feedback_type)}</span>
                </div>
                <div class="feedback-text">
                    <strong>${this.getFeedbackMessage(item.feedback_type)}</strong>
                    ${item.additional_notes ? `<br><em>"${item.additional_notes}"</em>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderMoodboardList(moodboard) {
        if (!moodboard || moodboard.length === 0) {
            return '<div class="no-data">No moodboard interactions yet</div>';
        }

        return moodboard.map(item => `
            <div class="feedback-item">
                <div class="feedback-meta">
                    <span class="feedback-date">${this.formatDate(item.timestamp)}</span>
                    <span class="feedback-type">${item.action_type === 'heart' ? '❤️ Heart' : '✕ Cross'}</span>
                </div>
                <div class="feedback-text">
                    ${item.action_type === 'heart' 
                        ? `💝 Customer loved this! Store section: ${item.store_section || 'N/A'}`
                        : '🗑️ Customer removed from moodboard'
                    }
                </div>
            </div>
        `).join('');
    }

    calculateFeedbackBreakdown(feedback) {
        const breakdown = {
            price: 0,
            style: 0,
            expectations: 0,
            quality: 0,
            total: 0
        };

        feedback.forEach(item => {
            if (breakdown.hasOwnProperty(item.feedback_type)) {
                breakdown[item.feedback_type]++;
                breakdown.total++;
            }
        });

        return breakdown;
    }

    getFeedbackMessage(feedbackType) {
        const messages = {
            'price': 'Too expensive for me',
            'style': 'Not my style/vibe',
            'expectations': 'Didn\'t meet my expectations',
            'quality': 'Quality concerns',
            'other': 'Other reason'
        };
        return messages[feedbackType] || 'General feedback';
    }

    formatFeedbackType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    formatInteractionType(type) {
        const types = {
            'like': 'Likes',
            'dislike': 'Dislikes',
            'feedback_request': 'Feedback Requests'
        };
        return types[type] || type;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }

    searchAndSelectProduct(productName) {
        const searchInput = document.getElementById('product-search');
        searchInput.value = productName;
        
        // Find product by name
        const product = this.allProducts.find(p => p.product_name === productName);
        if (product) {
            this.selectProduct(product.id);
        }
    }

    async loadExitSurveyAnalytics() {
        try {
            const response = await fetch('/api/analytics/exit-survey');
            const data = await response.json();
            
            if (data.success) {
                this.displayExitSurveyAnalytics(data.analytics);
                
                // Update stats cards
                document.getElementById('exit-survey-responses').textContent = data.analytics.total_responses || 0;
                document.getElementById('email-signups').textContent = data.analytics.total_emails || 0;
            } else {
                throw new Error(data.error || 'Failed to load exit survey data');
            }
        } catch (error) {
            console.error('❌ Error loading exit survey analytics:', error);
            document.getElementById('exit-survey-analytics').innerHTML = 
                '<div class="no-data">No exit survey data available yet</div>';
            document.getElementById('exit-survey-responses').textContent = '0';
            document.getElementById('email-signups').textContent = '0';
        }
    }

    displayExitSurveyAnalytics(analytics) {
        const container = document.getElementById('exit-survey-analytics');
        
        if (!analytics || analytics.total_responses === 0) {
            container.innerHTML = '<div class="no-data">No exit survey responses yet</div>';
            return;
        }

        container.innerHTML = `
            <div class="exit-survey-grid">
                <div class="exit-survey-section">
                    <h3>🚪 Exit Reasons</h3>
                    <div class="exit-breakdown">
                        ${this.renderExitReasonBreakdown(analytics.exit_reasons)}
                    </div>
                </div>
                
                <div class="exit-survey-section">
                    <h3>🛒 Purchase Intent</h3>
                    <div class="exit-breakdown">
                        ${this.renderPurchaseIntentBreakdown(analytics.purchase_intent)}
                    </div>
                </div>
                
                <div class="exit-survey-section">
                    <h3>💫 What Would Bring Users Back</h3>
                    <div class="exit-breakdown">
                        ${this.renderBringBackBreakdown(analytics.bring_back_factors)}
                    </div>
                </div>
                
                <div class="exit-survey-section">
                    <h3>📧 Recent Email Signups</h3>
                    <div class="recent-emails">
                        ${this.renderRecentEmails(analytics.recent_emails)}
                    </div>
                </div>
            </div>
            
            <div class="exit-survey-insights">
                <h3>💡 Key Insights</h3>
                <div class="insights-grid">
                    <div class="insight-card">
                        <div class="insight-number">${Math.round(analytics.price_sensitivity_rate * 100)}%</div>
                        <div class="insight-label">Price Sensitive Users</div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-number">${Math.round(analytics.ready_buyer_rate * 100)}%</div>
                        <div class="insight-label">Ready to Purchase</div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-number">${Math.round(analytics.email_conversion_rate * 100)}%</div>
                        <div class="insight-label">Email Conversion Rate</div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-number">${Math.round(analytics.avg_browsing_time / 1000)}s</div>
                        <div class="insight-label">Avg Browsing Time</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderExitReasonBreakdown(exitReasons) {
        if (!exitReasons || exitReasons.length === 0) {
            return '<div class="no-data">No data</div>';
        }

        return exitReasons.map(item => `
            <div class="breakdown-item">
                <span class="breakdown-label">${this.formatExitReason(item.exit_reason)}</span>
                <span class="breakdown-count">${item.count}</span>
            </div>
        `).join('');
    }

    renderPurchaseIntentBreakdown(purchaseIntent) {
        if (!purchaseIntent || purchaseIntent.length === 0) {
            return '<div class="no-data">No data</div>';
        }

        return purchaseIntent.map(item => `
            <div class="breakdown-item">
                <span class="breakdown-label">${this.formatPurchaseIntent(item.purchase_intent)}</span>
                <span class="breakdown-count">${item.count}</span>
            </div>
        `).join('');
    }

    renderBringBackBreakdown(bringBackFactors) {
        if (!bringBackFactors || bringBackFactors.length === 0) {
            return '<div class="no-data">No data</div>';
        }

        return bringBackFactors.map(item => `
            <div class="breakdown-item">
                <span class="breakdown-label">${this.formatBringBackFactor(item.bring_back_factor)}</span>
                <span class="breakdown-count">${item.count}</span>
            </div>
        `).join('');
    }

    renderRecentEmails(recentEmails) {
        if (!recentEmails || recentEmails.length === 0) {
            return '<div class="no-data">No recent signups</div>';
        }

        return `
            <div class="email-list">
                ${recentEmails.slice(0, 10).map(email => `
                    <div class="email-item">
                        <div class="email-address">${email.email}</div>
                        <div class="email-meta">
                            <span class="email-date">${this.formatDate(email.created_at)}</span>
                            <span class="email-reason">${this.formatExitReason(email.exit_reason)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatExitReason(reason) {
        const reasons = {
            'price': '💰 Price Concerns',
            'not_found': '🔍 Couldn\'t Find Product',
            'browsing': '👀 Just Browsing',
            'confusing': '🤔 Site Confusing',
            'other': '🔄 Other'
        };
        return reasons[reason] || reason;
    }

    formatPurchaseIntent(intent) {
        const intents = {
            'ready': '🛒 Ready to Buy',
            'considering': '🤔 Considering',
            'early': '👀 Early Stage',
            'not_interested': '❌ Not Interested'
        };
        return intents[intent] || intent;
    }

    formatBringBackFactor(factor) {
        const factors = {
            'discount': '💸 Better Prices/Discounts',
            'better_selection': '👗 Better Product Selection',
            'easier_navigation': '🧭 Easier Navigation',
            'reviews': '⭐ More Reviews/Info',
            'other': '🔄 Other'
        };
        return factors[factor] || factor;
    }

    showError(message) {
        console.error('Error:', message);
        // You could show a toast notification or modal here
        alert('Error: ' + message);
    }
}

// Global functions for onclick handlers
function loadGeneralAnalytics() {
    if (window.adminDashboard) {
        window.adminDashboard.loadGeneralAnalytics();
        window.adminDashboard.loadGeneralStats();
    }
}

function loadExitSurveyAnalytics() {
    if (window.adminDashboard) {
        window.adminDashboard.loadExitSurveyAnalytics();
    }
}

async function sendAnalyticsSummary() {
    const emailInput = document.getElementById('summary-email');
    const sendBtn = document.getElementById('send-summary-btn');
    const statusDiv = document.getElementById('email-summary-status');
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showEmailStatus('Please enter an email address', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showEmailStatus('Please enter a valid email address', 'error');
        return;
    }
    
    // Show loading state
    sendBtn.disabled = true;
    sendBtn.innerHTML = '📨 Sending...';
    showEmailStatus('Generating comprehensive analytics summary...', 'loading');
    
    try {
        const response = await fetch('/api/admin/send-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showEmailStatus(`✅ Analytics summary sent successfully to ${email}!`, 'success');
            emailInput.value = '';
        } else {
            throw new Error(data.error || 'Failed to send summary');
        }
        
    } catch (error) {
        console.error('Error sending analytics summary:', error);
        showEmailStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        // Reset button state
        sendBtn.disabled = false;
        sendBtn.innerHTML = '📨 Send Summary';
    }
}

function showEmailStatus(message, type) {
    const statusDiv = document.getElementById('email-summary-status');
    statusDiv.textContent = message;
    statusDiv.className = type;
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new NicobarAdminDashboard();
});

console.log('📊 Admin Dashboard JavaScript loaded successfully'); 