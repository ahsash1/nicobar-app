console.log('Nicobar App initialized');

class NicobarApp {
    constructor() {
        this.currentScreen = 'welcome-screen';
        this.currentCardIndex = 0;
        this.products = [];
        this.allNicobarProducts = [];
        this.productsByCategory = {};
        this.userPreferences = {
            likes: [],
            dislikes: [],
            feedback: []
        };
        this.swipeThreshold = 100;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isDragging = false;
        
        // Track negative interactions (dislikes + feedback) separately
        this.negativeInteractions = 0;  // Count of left swipes + up swipes
        this.positiveInteractions = 0;  // Count of right swipes
        
        this.init();
    }

    async init() {
        await this.loadNicobarProducts();
        this.loadUserPreferences();
        this.bindEvents();
        this.showScreen('welcome-screen');
    }

    async loadNicobarProducts() {
        try {
            // Load products from database API
            const response = await fetch('/api/products');
            const data = await response.json();
            
            if (data.success && data.products) {
                this.allNicobarProducts = data.products;

                // Debug: Log first product to verify data structure
                console.log('🔍 First product from database:', this.allNicobarProducts[0]);

                // Group products by category
                this.allNicobarProducts.forEach(product => {
                    const category = product.category;
                    if (!this.productsByCategory[category]) {
                        this.productsByCategory[category] = [];
                    }
                    this.productsByCategory[category].push(product);
                });

                // Select diverse products for swipe interface (mix of categories)
                this.products = this.selectDiverseProducts(this.allNicobarProducts, 25);
                this.shuffleArray(this.products);

                console.log(`✅ Loaded ${this.allNicobarProducts.length} products from database with ${Object.keys(this.productsByCategory).length} categories`);
                console.log('🔍 First selected product for swiping:', this.products[0]);
            } else {
                throw new Error('Failed to load products from database');
            }
        } catch (error) {
            console.log('❌ Could not load products from database, using fallback:', error);
            this.loadSampleData();
        }
    }

    // Local Storage Functions
    loadUserPreferences() {
        const savedPreferences = localStorage.getItem('nicobar_user_preferences');
        if (savedPreferences) {
            this.userPreferences = JSON.parse(savedPreferences);
        }
    }

    saveUserPreferences() {
        localStorage.setItem('nicobar_user_preferences', JSON.stringify(this.userPreferences));
    }

    saveFeedbackData(feedbackData) {
        const existingFeedback = JSON.parse(localStorage.getItem('nicobar_feedback_data') || '[]');
        existingFeedback.push({
            ...feedbackData,
            timestamp: new Date().toISOString(),
            sessionId: this.getSessionId()
        });
        localStorage.setItem('nicobar_feedback_data', JSON.stringify(existingFeedback));
    }

    getSessionId() {
        let sessionId = localStorage.getItem('nicobar_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('nicobar_session_id', sessionId);
            // Start new session in database
            this.startDatabaseSession(sessionId);
        }
        return sessionId;
    }

    // === DATABASE LOGGING FUNCTIONS ===

    async startDatabaseSession(sessionId) {
        try {
            await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    userAgent: navigator.userAgent,
                    ipAddress: null // Will be detected server-side if needed
                })
            });
            console.log(`🚀 Database session started: ${sessionId}`);
        } catch (error) {
            console.error('❌ Failed to start database session:', error);
        }
    }

    async updateDatabaseSession() {
        try {
            const sessionData = {
                sessionId: this.getSessionId(),
                totalProductsViewed: this.currentCardIndex + 1,
                totalLikes: this.userPreferences.likes.length,
                totalDislikes: this.userPreferences.dislikes.length,
                reachedMoodboard: this.positiveInteractions >= 4 // Track if they reached moodboard
            };

            const response = await fetch('/api/session/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });

            if (!response.ok) {
                console.error('Failed to update session:', response.statusText);
            }
        } catch (error) {
            console.error('Error updating session:', error);
        }
    }

    async endDatabaseSession() {
        try {
            const response = await fetch('/api/session/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId: this.getSessionId() })
            });

            if (!response.ok) {
                console.error('Failed to end session:', response.statusText);
            }
        } catch (error) {
            console.error('Error ending session:', error);
        }
    }

    async logProductInteraction(productId, interactionType, swipeDirection = null, timeSpentViewing = 0) {
        try {
            const interactionData = {
                sessionId: this.getSessionId(),
                productId: productId,
                interactionType: interactionType,
                swipeDirection: swipeDirection,
                positionInSequence: this.currentCardIndex + 1,
                timeSpentViewing: timeSpentViewing
            };

            const response = await fetch('/api/interaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(interactionData)
            });

            if (!response.ok) {
                console.error('Failed to log interaction:', response.statusText);
            }
        } catch (error) {
            console.error('Error logging interaction:', error);
        }
    }

    async logFeedbackResponse(productId, feedbackType, feedbackContext, additionalNotes = null) {
        try {
            const feedbackData = {
                sessionId: this.getSessionId(),
                productId: productId,
                feedbackType: feedbackType,
                feedbackContext: feedbackContext,
                additionalNotes: additionalNotes
            };

            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });

            if (!response.ok) {
                console.error('Failed to log feedback:', response.statusText);
            }
        } catch (error) {
            console.error('Error logging feedback:', error);
        }
    }

    async logOpenFeedback(feedbackText, feedbackContext) {
        try {
            const feedbackData = {
                sessionId: this.getSessionId(),
                feedbackText: feedbackText,
                feedbackContext: feedbackContext
            };

            const response = await fetch('/api/feedback/open', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });

            if (!response.ok) {
                console.error('Failed to log open feedback:', response.statusText);
            }
        } catch (error) {
            console.error('Error logging open feedback:', error);
        }
    }

    async logMoodboardInteraction(productId, actionType, positionInMoodboard, storeSection) {
        try {
            const interactionData = {
                sessionId: this.getSessionId(),
                productId: productId,
                actionType: actionType,
                positionInMoodboard: positionInMoodboard,
                storeSection: storeSection
            };

            const response = await fetch('/api/moodboard/interaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(interactionData)
            });

            if (!response.ok) {
                console.error('Failed to log moodboard interaction:', response.statusText);
            }
        } catch (error) {
            console.error('Error logging moodboard interaction:', error);
        }
    }

    async logEmployeeCall(productId, productName, storeSection, callContext) {
        try {
            const callData = {
                sessionId: this.getSessionId(),
                productId: productId,
                productName: productName,
                storeSection: storeSection,
                callContext: callContext
            };

            const response = await fetch('/api/employee/call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(callData)
            });

            if (!response.ok) {
                console.error('Failed to log employee call:', response.statusText);
            }
        } catch (error) {
            console.error('Error logging employee call:', error);
        }
    }

    async analyzeUserPreferences() {
        const preferences = {
            preferred_categories: this.countFrequency(this.userPreferences.likes.map(p => p.category)),
            liked_colors: this.countFrequency(this.userPreferences.likes.flatMap(p => p.colors ? p.colors.split(',') : [])),
            price_range: {
                min: Math.min(...this.userPreferences.likes.map(p => parseFloat(p.price.replace(/[₹,]/g, '')) || 0)),
                max: Math.max(...this.userPreferences.likes.map(p => parseFloat(p.price.replace(/[₹,]/g, '')) || 0)),
                avg: this.userPreferences.likes.reduce((sum, p) => sum + (parseFloat(p.price.replace(/[₹,]/g, '')) || 0), 0) / this.userPreferences.likes.length
            },
            disliked_categories: this.countFrequency(this.userPreferences.dislikes.map(p => p.category)),
            session_patterns: {
                total_likes: this.userPreferences.likes.length,
                total_dislikes: this.userPreferences.dislikes.length,
                like_rate: this.userPreferences.likes.length / (this.userPreferences.likes.length + this.userPreferences.dislikes.length)
            }
        };

        try {
            const response = await fetch('/api/preferences/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.getSessionId(),
                    preferences: preferences
                })
            });

            if (!response.ok) {
                console.error('Failed to analyze preferences:', response.statusText);
            }
        } catch (error) {
            console.error('Error analyzing preferences:', error);
        }
    }

    // Legacy function for backwards compatibility and localStorage backup
    logUserAction(action, data) {
        const actionLog = {
            timestamp: new Date().toISOString(),
            action: action,
            data: data
        };

        // Store action logs in localStorage for persistence
        const existingLogs = JSON.parse(localStorage.getItem('nicobar_action_logs') || '[]');
        existingLogs.push(actionLog);
        localStorage.setItem('nicobar_action_logs', JSON.stringify(existingLogs));

        console.log(`🔍 User Action: ${action}`, data);
    }

    // Improved product selection for better variety
    selectDiverseProducts(allProducts, count) {
        const categories = [...new Set(allProducts.map(p => p.category))];
        const selected = [];
        const productsPerCategory = Math.ceil(count / categories.length);

        categories.forEach(category => {
            const categoryProducts = allProducts.filter(p => p.category === category);
            // Shuffle within category for variety
            this.shuffleArray(categoryProducts);
            
            // Take products from this category up to the limit
            const categorySelection = categoryProducts.slice(0, productsPerCategory);
            selected.push(...categorySelection);
        });

        // If we don't have enough, fill with random products
        if (selected.length < count) {
            const remaining = allProducts.filter(p => !selected.includes(p));
            this.shuffleArray(remaining);
            selected.push(...remaining.slice(0, count - selected.length));
        }

        // Final shuffle for good measure
        this.shuffleArray(selected);
        return selected.slice(0, count);
    }

    loadSampleData() {
        // Fallback sample Nicobar products if data loading fails
        this.allNicobarProducts = [
            {
                name: "Mandarin Collar Top - White",
                description: "Your new workwear staple! Classic and timeless workwear piece perfect for any work environment.",
                price: "₹ 3,250",
                category: "Tops",
                image: "https://www.nicobar.com/cdn/shop/files/NBI033518_1.jpg?v=1710436004",
                colors: "White"
            },
            {
                name: "Double Layer Dress - Ivory",
                description: "Built to be a staple for all seasons, great for work or a meal with friends.",
                price: "₹ 6,500",
                category: "Dresses & Overlays",
                image: "https://www.nicobar.com/cdn/shop/files/1_2fc40652-86a5-4405-b903-cb3c7063a3a0.jpg?v=1710436001",
                colors: "Ivory"
            },
            {
                name: "High Slit Top - Navy",
                description: "Easy to pair with every piece in your closet, features high side slits for a sophisticated look.",
                price: "₹ 4,250",
                category: "Tops",
                image: "https://www.nicobar.com/cdn/shop/files/NBI029896_2_4074ac4d-6c6e-4300-abef-0ff3045143f5.jpg?v=1710436002",
                colors: "Navy"
            }
        ];

        // Start with a diverse selection for better variety
        this.products = this.selectDiverseProducts(this.allNicobarProducts, 60);
        this.shuffleArray(this.products);
        
        this.productsByCategory = {
            "Tops": this.allNicobarProducts.filter(p => p.category === "Tops"),
            "Dresses & Overlays": this.allNicobarProducts.filter(p => p.category === "Dresses & Overlays")
        };
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getStoreSection(category) {
        const storeSections = {
            'Tops': 'Section A1',
            'Dresses & Overlays': 'Section B1',
            'Bottoms': 'Section C1',
            'Kurtas': 'Section D1',
            'Shirts': 'Section E1',
            'Decor': 'Section F1',
            'Dinnerware': 'Section G1',
            'Drinkware': 'Section G2',
            'Textile': 'Section H1',
            'Gifting': 'Section I1'
        };
        
        return storeSections[category] || 'Section A1';
    }

    bindEvents() {
        // Screen navigation
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startDiscovery();
        });

        // Feedback options
        document.querySelectorAll('.feedback-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.processFeedback(e.target.dataset.feedback);
            });
        });

        document.getElementById('skip-feedback').addEventListener('click', () => {
            this.showScreen('swipe-screen');
            setTimeout(() => {
                this.nextCard();
            }, 100);
        });

        // Moodboard actions
        document.getElementById('call-salesperson-btn').addEventListener('click', () => {
            this.callSalesperson();
        });

        document.getElementById('section-info-btn').addEventListener('click', () => {
            this.showSectionInfo();
        });

        document.getElementById('new-user-btn').addEventListener('click', () => {
            this.startNewUserSession();
        });

        document.getElementById('exit-app-btn').addEventListener('click', () => {
            this.exitApp();
        });

        // Open feedback
        document.getElementById('submit-feedback').addEventListener('click', () => {
            this.submitOpenFeedback();
        });

        document.getElementById('skip-open-feedback').addEventListener('click', () => {
            this.showScreen('thank-you-screen');
        });

        // Restart from thank you
        document.getElementById('restart-discovery').addEventListener('click', () => {
            this.restartDiscovery();
        });
    }

    startDiscovery() {
        this.logUserAction('start_discovery', { timestamp: new Date().toISOString() });
        this.showScreen('swipe-screen');
        this.updateInteractionCounters(); // Initialize counters
        this.loadCards();
    }

    loadCards() {
        const cardStack = document.getElementById('card-stack');
        cardStack.innerHTML = '';

        // Load next 3 cards for smooth swiping
        for (let i = 0; i < Math.min(3, this.products.length - this.currentCardIndex); i++) {
            const product = this.products[this.currentCardIndex + i];
            if (product) {
                const card = this.createProductCard(product, i);
                cardStack.appendChild(card);
            }
        }

        this.updateProgress();
    }

    createProductCard(product, zIndex) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.zIndex = 10 - zIndex;
        card.style.transform = `scale(${1 - zIndex * 0.05}) translateY(${zIndex * 10}px)`;

        // Clean up price formatting
        const price = product.price || '₹ 0';
        const cleanPrice = price.replace(/["]/g, '');

        // Debug: Log product data being used for card creation
        console.log('🖼️ Creating card for product:', product.name, 'Image URL:', product.image);

        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" 
                 crossorigin="anonymous"
                 onerror="console.log('❌ Image failed to load:', this.src); this.style.display='none'; this.nextElementSibling.style.display='block';"
                 onload="console.log('✅ Image loaded successfully:', this.src);">
            <div class="image-fallback" style="display:none; width:100%; height:300px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; text-align:center; padding:20px;">
                <div>
                    <div style="font-size:18px; margin-bottom:10px;">🎨</div>
                    <div style="font-weight:bold;">${product.name}</div>
                    <div style="font-size:12px; opacity:0.8; margin-top:5px;">Nicobar Product</div>
                </div>
            </div>
            <div class="product-info">
                <div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-description">${product.description || ''}</div>
                </div>
                <div class="product-price">${cleanPrice}</div>
            </div>
        `;

        if (zIndex === 0) {
            this.addSwipeHandlers(card, product);
        }

        return card;
    }

    truncateDescription(description, maxLength) {
        if (!description) return '';
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength) + '...';
    }

    addSwipeHandlers(card, product) {
        let startX, startY, currentX, currentY;

        const onStart = (e) => {
            this.isDragging = true;
            card.classList.add('dragging');
            
            const point = e.touches ? e.touches[0] : e;
            startX = point.clientX;
            startY = point.clientY;
            currentX = startX;
            currentY = startY;
        };

        const onMove = (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            const point = e.touches ? e.touches[0] : e;
            currentX = point.clientX;
            currentY = point.clientY;
            
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            const rotation = deltaX * 0.1;
            
            card.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
            
            // Visual feedback
            const opacity = Math.max(0.3, 1 - Math.abs(deltaX) / 300);
            card.style.opacity = opacity;
        };

        const onEnd = (e) => {
            if (!this.isDragging) return;
            
            this.isDragging = false;
            card.classList.remove('dragging');
            
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            
            // Prioritize vertical swipes over horizontal if both exceed threshold
            if (Math.abs(deltaY) > this.swipeThreshold && deltaY < 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
                // Swipe up - show feedback options (only if vertical movement is dominant)
                this.showFeedbackOptions(product);
            } else if (Math.abs(deltaX) > this.swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) {
                    // Swipe right - like
                    this.handleSwipe('right', product);
                } else {
                    // Swipe left - dislike
                    this.handleSwipe('left', product);
                }
            } else {
                // Snap back
                card.style.transform = '';
                card.style.opacity = '';
            }
        };

        // Touch events
        card.addEventListener('touchstart', onStart, { passive: false });
        card.addEventListener('touchmove', onMove, { passive: false });
        card.addEventListener('touchend', onEnd);

        // Mouse events
        card.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    }

    handleSwipe(direction, product) {
        const card = document.querySelector('.product-card');
        
        if (direction === 'right') {
            card.classList.add('swiped-right');
            this.userPreferences.likes.push(product);
            this.positiveInteractions++;
            this.logUserAction('product_liked', { product: product.name, category: product.category });
            this.logProductInteraction(product.id, 'like', 'right');
        } else {
            card.classList.add('swiped-left');
            this.userPreferences.dislikes.push(product);
            this.negativeInteractions++;
            this.logUserAction('product_disliked', { product: product.name, category: product.category });
            this.logProductInteraction(product.id, 'dislike', 'left');
        }

        this.saveUserPreferences();

        setTimeout(() => {
            this.nextCard();
        }, 300);
    }

    showFeedbackOptions(product) {
        this.currentFeedbackProduct = product;
        this.logUserAction('feedback_requested', { product: product.name });
        this.logProductInteraction(product.id, 'feedback_request', 'up');
        this.showScreen('feedback-screen');
    }

    processFeedback(feedbackType) {
        this.userPreferences.feedback.push({
            product: this.currentFeedbackProduct,
            feedback: feedbackType
        });
        
        this.userPreferences.dislikes.push(this.currentFeedbackProduct);
        this.negativeInteractions++;  // Count feedback as negative interaction
        
        this.logUserAction('feedback_provided', { 
            product: this.currentFeedbackProduct.name, 
            feedback: feedbackType 
        });

        // Log structured feedback to database
        this.logFeedbackResponse(
            this.currentFeedbackProduct.id, 
            feedbackType, 
            'swipe_feedback',
            null
        );

        this.saveFeedbackData({
            product: this.currentFeedbackProduct,
            feedbackType: feedbackType,
            screen: 'feedback_options'
        });

        this.saveUserPreferences();
        this.showScreen('swipe-screen');
        
        setTimeout(() => {
            this.nextCard();
        }, 100);
    }

    nextCard() {
        this.currentCardIndex++;
        
        if (this.currentCardIndex >= this.products.length) {
            this.showResults();
            return;
        }

        // Check for patterns based on new counting system
        if (this.positiveInteractions >= 4) {
            this.logUserAction('threshold_reached', { 
                type: 'positive_interactions', 
                count: this.positiveInteractions,
                likes: this.userPreferences.likes.length 
            });
            this.showMoodboard();
            return;
        }
        
        if (this.negativeInteractions >= 4) {
            this.logUserAction('threshold_reached', { 
                type: 'negative_interactions', 
                count: this.negativeInteractions,
                dislikes: this.userPreferences.dislikes.length,
                feedback: this.userPreferences.feedback.length 
            });
            this.showOpenFeedback();
            return;
        }

        this.loadCards();
        this.updateProgress();
    }

    showResults() {
        if (this.positiveInteractions >= 4) {
            this.showMoodboard();
        } else {
            this.showOpenFeedback();
        }
    }

    showMoodboard() {
        this.logUserAction('moodboard_shown', { 
            likes_count: this.userPreferences.likes.length,
            categories_liked: [...new Set(this.userPreferences.likes.map(p => p.category))]
        });
        
        // Update session to indicate moodboard reached - set flag first
        this.positiveInteractions = 4; // Ensure moodboard reached flag is set
        this.updateDatabaseSession();
        
        // Clear local storage after reaching moodboard level
        this.clearSessionData();
        
        this.showScreen('moodboard-screen');
        this.generatePersonalizedMoodboard();
    }

    generatePersonalizedMoodboard() {
        const moodboardGrid = document.getElementById('moodboard-grid');
        moodboardGrid.innerHTML = '';

        // Enhanced recommendation algorithm based on user preferences
        const likedProducts = this.userPreferences.likes;
        this.moodboardRecommendations = this.getPersonalizedRecommendations(likedProducts, 8);

        this.moodboardRecommendations.forEach((product, index) => {
            const item = document.createElement('div');
            item.className = 'moodboard-item';
            item.dataset.productIndex = index;
            
            const price = product.price ? product.price.replace(/["]/g, '') : '₹ 0';
            
            item.innerHTML = `
                <img src="${product.image}" alt="${product.name}" 
                     onerror="this.src='https://via.placeholder.com/200x200/667eea/ffffff?text=${encodeURIComponent(product.name.substring(0, 15))}'">
                <div class="moodboard-item-info">
                    <div class="moodboard-item-name">${this.truncateText(product.name, 25)}</div>
                    <div class="moodboard-item-price">${price}</div>
                    <div class="moodboard-actions-item">
                        <button class="heart-btn" onclick="window.nicobarApp.handleMoodboardHeart(${index})">♡</button>
                        <button class="cross-btn" onclick="window.nicobarApp.handleMoodboardCross(${index})">✕</button>
                    </div>
                </div>
            `;
            
            moodboardGrid.appendChild(item);
        });
    }

    handleMoodboardHeart(index) {
        const product = this.moodboardRecommendations[index];
        const storeSection = this.getStoreSection(product.category);
        
        // Log the action
        this.logUserAction('moodboard_heart', {
            product: product.name,
            category: product.category,
            section: storeSection,
            position: index
        });
        
        // Log to database
        this.logMoodboardInteraction(product.id, 'heart', index, storeSection);

        // Update the heart button to show it's been selected
        const heartBtn = document.querySelector(`[data-product-index="${index}"] .heart-btn`);
        heartBtn.style.background = '#c0392b';
        heartBtn.innerHTML = '♥';
        heartBtn.disabled = true;

        // Show employee call notification with store section
        this.showEmployeeCallOption(product.name, storeSection);
    }

    handleMoodboardCross(index) {
        const product = this.moodboardRecommendations[index];
        
        // Log the action
        this.logUserAction('moodboard_cross', {
            product: product.name,
            category: product.category,
            position: index
        });
        
        // Log to database
        this.logMoodboardInteraction(product.id, 'cross', index, null);

        // Remove the product item from the grid (no replacement)
        const productItem = document.querySelector(`[data-product-index="${index}"]`);
        if (productItem) {
            productItem.style.transition = 'all 0.3s ease';
            productItem.style.transform = 'scale(0)';
            productItem.style.opacity = '0';
            
            setTimeout(() => {
                productItem.remove();
            }, 300);
        }

        // Remove from recommendations array
        this.moodboardRecommendations.splice(index, 1);
    }

    showEmployeeCallOption(productName, storeSection) {
        // Show a notification with call employee option
        const notification = document.createElement('div');
        notification.className = 'employee-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>💝 Product Liked!</h3>
                <p><strong>"${productName}"</strong></p>
                <p>📍 Location: <strong>${storeSection}</strong></p>
                <div class="notification-buttons">
                    <button class="call-employee-btn" onclick="window.nicobarApp.callEmployeeForProduct('${productName}', '${storeSection}'); this.parentElement.parentElement.parentElement.remove();">
                        📞 Call Employee
                    </button>
                    <button class="continue-btn" onclick="this.parentElement.parentElement.parentElement.remove();">
                        Continue Browsing
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
    }

    callEmployeeForProduct(productName, storeSection) {
        // Show a confirmation that employee has been called
        const confirmation = document.createElement('div');
        confirmation.className = 'employee-notification';
        confirmation.innerHTML = `
            <div class="notification-content">
                <h3>📞 Employee Called</h3>
                <p>An employee from <strong>${storeSection}</strong> will assist you with:</p>
                <p><strong>"${productName}"</strong></p>
                <p>They will be with you shortly!</p>
                <button onclick="this.parentElement.parentElement.remove()">Continue</button>
            </div>
        `;
        
        document.body.appendChild(confirmation);
        
        // Show the "shortly" popup after a short delay
        setTimeout(() => {
            const shortlyPopup = document.createElement('div');
            shortlyPopup.className = 'employee-notification';
            shortlyPopup.innerHTML = `
                <div class="notification-content">
                    <h3>✨ Request Processed</h3>
                    <p>An employee will be with you shortly!</p>
                    <button onclick="this.parentElement.parentElement.remove()">Got it</button>
                </div>
            `;
            document.body.appendChild(shortlyPopup);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (shortlyPopup.parentElement) {
                    shortlyPopup.remove();
                }
            }, 3000);
        }, 1500);
        
        this.logUserAction('employee_called', { 
            product: productName, 
            section: storeSection 
        });
        
        // Find the product ID for database logging
        const product = this.moodboardRecommendations.find(p => p.name === productName);
        if (product) {
            this.logEmployeeCall(product.id, productName, storeSection, 'moodboard_heart');
        }
    }

    getPersonalizedRecommendations(likedProducts, count) {
        if (likedProducts.length === 0) {
            // If no likes, return diverse selection
            return this.selectDiverseProducts(this.allNicobarProducts, count);
        }

        // Analyze liked products
        const likedCategories = likedProducts.map(p => p.product_category);
        const likedSubCategories = likedProducts.map(p => p.product_sub_category).filter(Boolean);
        const likedColors = likedProducts.map(p => p.product_available_colors).filter(Boolean);

        // Count preferences
        const categoryScore = this.countFrequency(likedCategories);
        const subCategoryScore = this.countFrequency(likedSubCategories);
        const colorScore = this.countFrequency(likedColors);

        // Score all products
        const scoredProducts = this.allNicobarProducts
            .filter(product => !likedProducts.includes(product)) // Exclude already liked
            .map(product => ({
                ...product,
                score: this.calculateProductScore(product, categoryScore, subCategoryScore, colorScore)
            }))
            .sort((a, b) => b.score - a.score);

        // Get top recommendations ensuring category diversity
        const recommendations = [];
        const usedCategories = new Set();
        
        // First pass: get best from each liked category
        scoredProducts.forEach(product => {
            if (recommendations.length < count) {
                const category = product.category;
                if (categoryScore[category] && !usedCategories.has(category)) {
                    recommendations.push(product);
                    usedCategories.add(category);
                }
            }
        });

        // Second pass: fill remaining slots with highest scoring
        scoredProducts.forEach(product => {
            if (recommendations.length < count && !recommendations.includes(product)) {
                recommendations.push(product);
            }
        });

        return recommendations.slice(0, count);
    }

    countFrequency(array) {
        return array.reduce((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
    }

    calculateProductScore(product, categoryScore, subCategoryScore, colorScore) {
        let score = 0;
        
        // Category match (highest weight)
        if (categoryScore[product.category]) {
            score += categoryScore[product.category] * 10;
        }
        
        // Sub-category match
        if (product.subcategory && subCategoryScore[product.subcategory]) {
            score += subCategoryScore[product.subcategory] * 5;
        }
        
        // Color match
        if (product.colors && colorScore[product.colors]) {
            score += colorScore[product.colors] * 3;
        }
        
        // Add small random factor for diversity
        score += Math.random() * 2;
        
        return score;
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }

    showOpenFeedback() {
        this.logUserAction('open_feedback_shown', { 
            dislikes_count: this.userPreferences.dislikes.length 
        });
        
        // Clear local storage after reaching open feedback level
        this.clearSessionData();
        
        this.showScreen('open-feedback-screen');
    }

    submitOpenFeedback() {
        const feedback = document.getElementById('open-feedback').value;
        if (feedback.trim()) {
            this.saveFeedbackData({
                openFeedback: feedback,
                screen: 'open_feedback',
                userPreferences: this.userPreferences
            });
            
            this.logUserAction('open_feedback_submitted', { 
                feedback_length: feedback.length 
            });
            
            // Log to database
            this.logOpenFeedback(feedback, 'experience_feedback');
        }
        
        // Analyze and save user preferences
        this.analyzeUserPreferences();
        
        this.showScreen('thank-you-screen');
    }

    updateProgress() {
        // Calculate progress based on total interactions or card index, whichever is higher
        const totalInteractions = this.positiveInteractions + this.negativeInteractions;
        const interactionProgress = Math.min((totalInteractions / 8) * 100, 100); // Max 8 interactions before ending
        const cardProgress = (this.currentCardIndex / this.products.length) * 100;
        
        const progress = Math.max(interactionProgress, cardProgress);
        document.getElementById('progress').style.width = `${progress}%`;
        
        // Update interaction counters
        this.updateInteractionCounters();
    }

    updateInteractionCounters() {
        const likesElement = document.getElementById('likes-count');
        const feedbackElement = document.getElementById('feedback-count');
        
        if (likesElement) {
            likesElement.textContent = this.positiveInteractions;
        }
        if (feedbackElement) {
            feedbackElement.textContent = this.negativeInteractions;
        }
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    restartDiscovery() {
        this.logUserAction('discovery_restarted', { 
            previous_likes: this.userPreferences.likes.length,
            previous_dislikes: this.userPreferences.dislikes.length
        });
        
        this.currentCardIndex = 0;
        this.negativeInteractions = 0;  // Reset counters
        this.positiveInteractions = 0;  // Reset counters
        this.userPreferences = {
            likes: [],
            dislikes: [],
            feedback: []
        };
        this.saveUserPreferences();
        
        // Get new diverse selection for variety - increased count for more variety
        this.products = this.selectDiverseProducts(this.allNicobarProducts, 50);
        this.shuffleArray(this.products);
        this.showScreen('welcome-screen');
    }

    // Moodboard action methods
    callSalesperson() {
        this.logUserAction('call_salesperson_requested', { timestamp: new Date().toISOString() });
        
        // In a real implementation, this could:
        // - Trigger a notification system
        // - Send alert to store staff
        // - Open a communication channel
        
        // Show initial confirmation
        const confirmation = document.createElement('div');
        confirmation.className = 'employee-notification';
        confirmation.innerHTML = `
            <div class="notification-content">
                <h3>📞 Calling Salesperson</h3>
                <p>A Nicobar style expert has been notified!</p>
                <p>Please wait at this display section.</p>
                <button onclick="this.parentElement.parentElement.remove()">Continue</button>
            </div>
        `;
        document.body.appendChild(confirmation);
        
        // Show the "shortly" popup after a short delay
        setTimeout(() => {
            const shortlyPopup = document.createElement('div');
            shortlyPopup.className = 'employee-notification';
            shortlyPopup.innerHTML = `
                <div class="notification-content">
                    <h3>✨ Request Processed</h3>
                    <p>An employee will be with you shortly!</p>
                    <button onclick="this.parentElement.parentElement.remove()">Got it</button>
                </div>
            `;
            document.body.appendChild(shortlyPopup);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (shortlyPopup.parentElement) {
                    shortlyPopup.remove();
                }
            }, 3000);
        }, 1500);
        
        // Show a confirmation screen or return to welcome for next user
        setTimeout(() => {
            this.startNewUserSession();
        }, 5000);
    }

    showSectionInfo() {
        this.logUserAction('section_info_requested', { timestamp: new Date().toISOString() });
        
        // This would display current section information
        const sectionInfo = `📍 Section Information\n\n` +
                          `Location: Women's Apparel - Section A2\n` +
                          `Floor: Ground Floor\n` +
                          `Collection: Summer 2024\n\n` +
                          `Featured Categories:\n` +
                          `• Dresses & Overlays\n` +
                          `• Tops & Shirts\n` +
                          `• Bottoms & Kurtas\n` +
                          `• Home Decor & Gifting`;
        
        alert(sectionInfo);
    }

    startNewUserSession() {
        this.logUserAction('new_user_session_started', { timestamp: new Date().toISOString() });
        
        // Clear all data and restart fresh
        this.clearSessionData();
        this.restartDiscovery();
    }

    exitApp() {
        this.logUserAction('app_exit_requested', { timestamp: new Date().toISOString() });
        
        // End database session
        this.endDatabaseSession();
        
        // Clear session data
        this.clearSessionData();
        
        // Show exit confirmation
        const confirmed = confirm('❌ Exit Nicobar Style Discovery?\n\nThank you for exploring our collection!\n\nClick OK to exit or Cancel to stay.');
        
        if (confirmed) {
            // In a kiosk/iPad setup, this might:
            // - Return to store's main screen
            // - Lock the device
            // - Close the browser
            
            document.body.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-family: 'Inter', sans-serif; text-align: center;">
                    <h1 style="font-size: 3rem; margin-bottom: 1rem;">Thank You!</h1>
                    <p style="font-size: 1.5rem; margin-bottom: 2rem;">Visit us again to discover more amazing Nicobar collections</p>
                    <div style="font-size: 1rem; opacity: 0.8;">
                        <p>Store Hours: 10 AM - 10 PM</p>
                        <p>For assistance, ask any Nicobar team member</p>
                    </div>
                </div>
            `;
            
            // Auto-restart after 30 seconds for next customer
            setTimeout(() => {
                location.reload();
            }, 30000);
        }
    }

    // Clear session data from local storage
    clearSessionData() {
        localStorage.removeItem('nicobar_user_preferences');
        localStorage.removeItem('nicobar_session_id');
        
        // Reset current session preferences
        this.userPreferences = {
            likes: [],
            dislikes: [],
            feedback: []
        };
        
        console.log('Session data cleared - ready for new user');
    }

    // Debug function to view stored data
    getStoredData() {
        return {
            preferences: JSON.parse(localStorage.getItem('nicobar_user_preferences') || '{}'),
            feedback: JSON.parse(localStorage.getItem('nicobar_feedback_data') || '[]'),
            actionLogs: JSON.parse(localStorage.getItem('nicobar_action_logs') || '[]'),
            sessionId: localStorage.getItem('nicobar_session_id')
        };
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const products = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            if (values.length === headers.length) {
                const product = {};
                headers.forEach((header, index) => {
                    product[header] = values[index] ? values[index].replace(/"/g, '') : '';
                });
                
                // Only add products with required fields
                if (product.product_name && product.product_price && product.product_category) {
                    products.push(product);
                }
            }
        }

        return products;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nicobarApp = new NicobarApp();
});

// Debug function for console access
window.debugNicobar = () => {
    console.log('=== NICOBAR DEBUG DATA ===');
    console.log('Stored Data:', window.nicobarApp.getStoredData());
    console.log('Current Preferences:', window.nicobarApp.userPreferences);
    console.log('Products Loaded:', window.nicobarApp.allNicobarProducts.length);
    console.log('Categories:', Object.keys(window.nicobarApp.productsByCategory));
};

// Utility function to handle CSV file upload (for additional files)
function handleCSVUpload(event, isNicobar = false) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvData = e.target.result;
            const products = window.nicobarApp.parseCSV(csvData);
            window.nicobarApp.allNicobarProducts.push(...products);
            console.log(`Added ${products.length} products from uploaded file`);
        };
        reader.readAsText(file);
    }
}
