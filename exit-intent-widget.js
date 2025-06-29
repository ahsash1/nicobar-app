/**
 * Nicobar Exit Intent Widget
 * Easy integration script for any website
 * 
 * Usage:
 * <script src="path/to/exit-intent-widget.js"></script>
 * <script>
 *   NicobarExitIntent.init({
 *     apiUrl: 'https://your-api-domain.com',
 *     brandName: 'Your Brand',
 *     emailPlaceholder: 'Enter your email for special offers'
 *   });
 * </script>
 */

(function(window, document) {
    'use strict';

    const NicobarExitIntent = {
        config: {
            apiUrl: '',
            brandName: 'Nicobar',
            emailPlaceholder: 'your@email.com (optional)',
            exitIntentDelay: 100,
            theme: {
                primaryColor: '#d4a574',
                secondaryColor: '#c19660'
            }
        },

        init: function(options = {}) {
            // Merge options with default config
            this.config = { ...this.config, ...options };
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        },

        setup: function() {
            this.injectCSS();
            this.injectHTML();
            this.initExitIntentManager();
        },

        injectCSS: function() {
            const css = `
                .nicobar-exit-popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    display: none;
                    justify-content: center;
                    align-items: center;
                    z-index: 999999;
                    animation: fadeIn 0.3s ease;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }

                .nicobar-exit-popup-overlay.show {
                    display: flex;
                }

                .nicobar-exit-popup-content {
                    background-color: white;
                    border-radius: 20px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                    height: 450px;
                    position: relative;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideIn 0.4s ease;
                    overflow: hidden;
                }

                .nicobar-exit-popup-close {
                    position: absolute;
                    top: 15px;
                    right: 20px;
                    background: none;
                    border: none;
                    font-size: 28px;
                    color: #999;
                    cursor: pointer;
                    transition: color 0.3s ease;
                }

                .nicobar-exit-popup-close:hover {
                    color: #333;
                }

                .nicobar-exit-progress {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-bottom: 25px;
                }

                .nicobar-progress-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background-color: #e0e0e0;
                    transition: background-color 0.3s ease;
                    cursor: pointer;
                }

                .nicobar-progress-dot.active {
                    background-color: ${this.config.theme.primaryColor};
                }

                .nicobar-progress-dot.completed {
                    background-color: #90c695;
                }

                .nicobar-popup-slider {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }

                .nicobar-popup-page {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.4s ease;
                    padding: 10px 0;
                    overflow-y: auto;
                }

                .nicobar-popup-page.active {
                    opacity: 1;
                    transform: translateX(0);
                }

                .nicobar-popup-page.prev {
                    transform: translateX(-100%);
                }

                .nicobar-popup-header h2 {
                    color: #333;
                    font-size: 24px;
                    margin-bottom: 10px;
                    text-align: center;
                    font-weight: 300;
                }

                .nicobar-popup-header p {
                    color: #666;
                    font-size: 16px;
                    text-align: center;
                    margin-bottom: 20px;
                    line-height: 1.5;
                }

                .nicobar-feedback-options {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 20px;
                    padding: 0 10px;
                }

                .nicobar-feedback-btn {
                    background-color: #f8f8f8;
                    border: 2px solid #e0e0e0;
                    padding: 16px 20px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 14px;
                    color: #333;
                    font-weight: 500;
                    text-align: left;
                    width: 100%;
                    position: relative;
                    min-height: 52px;
                    display: flex;
                    align-items: center;
                }

                .nicobar-feedback-btn:hover {
                    background-color: #f0f0f0;
                    border-color: ${this.config.theme.primaryColor};
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(212, 165, 116, 0.2);
                }

                .nicobar-feedback-btn.selected {
                    background-color: ${this.config.theme.primaryColor};
                    border-color: ${this.config.theme.primaryColor};
                    color: white;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3);
                    animation: selectPulse 0.3s ease;
                }

                .nicobar-feedback-btn.selected::after {
                    content: '✓';
                    position: absolute;
                    right: 15px;
                    font-size: 16px;
                    font-weight: bold;
                }

                .nicobar-popup-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 20px;
                }

                .nicobar-stay-btn, .nicobar-next-btn, .nicobar-prev-btn, .nicobar-submit-btn {
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    border: none;
                    flex: 1;
                }

                .nicobar-stay-btn, .nicobar-next-btn, .nicobar-submit-btn {
                    background-color: ${this.config.theme.primaryColor};
                    color: white;
                }

                .nicobar-stay-btn:hover, .nicobar-next-btn:hover, .nicobar-submit-btn:hover {
                    background-color: ${this.config.theme.secondaryColor};
                }

                .nicobar-next-btn:disabled, .nicobar-submit-btn:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .nicobar-prev-btn {
                    background-color: transparent;
                    color: #666;
                    border: 2px solid #e0e0e0;
                }

                .nicobar-prev-btn:hover {
                    border-color: ${this.config.theme.primaryColor};
                    color: ${this.config.theme.primaryColor};
                }

                .nicobar-email-section {
                    background-color: #f9f9f9;
                    padding: 15px;
                    border-radius: 15px;
                    margin-bottom: 20px;
                    text-align: center;
                }

                .nicobar-email-section h3 {
                    color: ${this.config.theme.primaryColor};
                    font-size: 16px;
                    margin-bottom: 8px;
                    font-weight: 600;
                }

                .nicobar-email-section p {
                    color: #666;
                    font-size: 13px;
                    margin-bottom: 12px;
                    line-height: 1.4;
                }

                .nicobar-user-email, .nicobar-open-feedback {
                    width: 100%;
                    padding: 10px 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.3s ease;
                    background-color: white;
                    font-family: inherit;
                }

                .nicobar-user-email:focus, .nicobar-open-feedback:focus {
                    outline: none;
                    border-color: ${this.config.theme.primaryColor};
                }

                .nicobar-open-feedback {
                    min-height: 60px;
                    resize: vertical;
                    margin-bottom: 15px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideIn {
                    from { 
                        opacity: 0; 
                        transform: translateY(-50px) scale(0.9); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                }

                @keyframes selectPulse {
                    0% { transform: translateY(-2px) scale(1); }
                    50% { transform: translateY(-2px) scale(1.02); }
                    100% { transform: translateY(-2px) scale(1); }
                }
            `;

            const styleSheet = document.createElement('style');
            styleSheet.textContent = css;
            document.head.appendChild(styleSheet);
        },

        injectHTML: function() {
            const html = `
                <div id="nicobar-exit-intent-popup" class="nicobar-exit-popup-overlay">
                    <div class="nicobar-exit-popup-content">
                        <button class="nicobar-exit-popup-close">&times;</button>
                        
                        <div class="nicobar-exit-progress">
                            <div class="nicobar-progress-dot active" data-step="0"></div>
                            <div class="nicobar-progress-dot" data-step="1"></div>
                            <div class="nicobar-progress-dot" data-step="2"></div>
                            <div class="nicobar-progress-dot" data-step="3"></div>
                        </div>

                        <div class="nicobar-popup-slider">
                            <div class="nicobar-popup-page active" data-page="0">
                                <div class="nicobar-popup-header">
                                    <h2>Hey, what made you think about leaving? 🤔</h2>
                                    <p>No judgment here - we just want to understand!</p>
                                </div>
                                <div class="nicobar-feedback-options">
                                    <button class="nicobar-feedback-btn" data-question="exit_reason" data-answer="price">Prices feel too high</button>
                                    <button class="nicobar-feedback-btn" data-question="exit_reason" data-answer="not_found">Couldn't find what I was looking for</button>
                                    <button class="nicobar-feedback-btn" data-question="exit_reason" data-answer="just_browsing">Just browsing, not buying today</button>
                                    <button class="nicobar-feedback-btn" data-question="exit_reason" data-answer="confusing">Site feels confusing</button>
                                    <button class="nicobar-feedback-btn" data-question="exit_reason" data-answer="other">Something else</button>
                                </div>
                                <div class="nicobar-popup-actions">
                                    <button class="nicobar-stay-btn">Actually, let me keep browsing!</button>
                                    <button class="nicobar-next-btn" disabled>Next →</button>
                                </div>
                            </div>

                            <div class="nicobar-popup-page" data-page="1">
                                <div class="nicobar-popup-header">
                                    <h2>How close were you to buying something? 🛍️</h2>
                                </div>
                                <div class="nicobar-feedback-options">
                                    <button class="nicobar-feedback-btn" data-question="purchase_intent" data-answer="ready">I was ready to buy</button>
                                    <button class="nicobar-feedback-btn" data-question="purchase_intent" data-answer="considering">Still considering</button>
                                    <button class="nicobar-feedback-btn" data-question="purchase_intent" data-answer="early">Just starting to look</button>
                                    <button class="nicobar-feedback-btn" data-question="purchase_intent" data-answer="not_today">Not shopping today</button>
                                </div>
                                <div class="nicobar-popup-actions">
                                    <button class="nicobar-prev-btn">← Back</button>
                                    <button class="nicobar-next-btn" disabled>Next →</button>
                                </div>
                            </div>

                            <div class="nicobar-popup-page" data-page="2">
                                <div class="nicobar-popup-header">
                                    <h2>What would bring you back to complete a purchase? 💭</h2>
                                </div>
                                <div class="nicobar-feedback-options">
                                    <button class="nicobar-feedback-btn" data-question="bring_back" data-answer="discount">A discount or special offer</button>
                                    <button class="nicobar-feedback-btn" data-question="bring_back" data-answer="better_selection">More product options</button>
                                    <button class="nicobar-feedback-btn" data-question="bring_back" data-answer="easier_browse">Easier browsing experience</button>
                                    <button class="nicobar-feedback-btn" data-question="bring_back" data-answer="time">Just need more time to think</button>
                                    <button class="nicobar-feedback-btn" data-question="bring_back" data-answer="reviews">More customer reviews</button>
                                </div>
                                <div class="nicobar-popup-actions">
                                    <button class="nicobar-prev-btn">← Back</button>
                                    <button class="nicobar-next-btn" disabled>Next →</button>
                                </div>
                            </div>

                            <div class="nicobar-popup-page" data-page="3">
                                <div class="nicobar-popup-header">
                                    <h2>Before you go... 💙</h2>
                                </div>
                                <div class="nicobar-feedback-section">
                                    <h3>Anything specific that stopped you today?</h3>
                                    <textarea class="nicobar-open-feedback" placeholder="Tell us what we missed... (totally optional!)"></textarea>
                                </div>
                                <div class="nicobar-email-section">
                                    <h3>Want us to send you something special? ✨</h3>
                                    <p>We can curate pieces just for you and maybe throw in a little surprise!</p>
                                    <input type="email" class="nicobar-user-email" placeholder="${this.config.emailPlaceholder}">
                                </div>
                                <div class="nicobar-popup-actions">
                                    <button class="nicobar-prev-btn">← Back</button>
                                    <button class="nicobar-submit-btn">Thanks for helping us! 💙</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
        },

        initExitIntentManager: function() {
            new ExitIntentManager(this.config);
        }
    };

    // Exit Intent Manager (adapted for widget)
    class ExitIntentManager {
        constructor(config) {
            this.config = config;
            this.popup = document.getElementById('nicobar-exit-intent-popup');
            this.hasShownPopup = false;
            this.browsingStartTime = Date.now();
            this.exitIntentDelay = config.exitIntentDelay;
            this.userResponses = {};
            this.currentPage = 0;
            this.totalPages = 4;
            
            this.init();
        }

        init() {
            this.attachEventListeners();
        }

        attachEventListeners() {
            // Exit intent detection
            document.addEventListener('mouseleave', (e) => {
                if (e.clientY <= 0 || e.clientY <= 5) {
                    this.handleExitIntent();
                }
            });

            document.addEventListener('mouseout', (e) => {
                if (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML') {
                    if (e.clientY <= 10) {
                        this.handleExitIntent();
                    }
                }
            });

            // Close button
            const closeBtn = this.popup.querySelector('.nicobar-exit-popup-close');
            closeBtn.addEventListener('click', () => this.closePopup());

            // Stay button
            const stayBtn = this.popup.querySelector('.nicobar-stay-btn');
            stayBtn.addEventListener('click', () => this.handleStay());

            // Navigation buttons
            const nextBtns = this.popup.querySelectorAll('.nicobar-next-btn');
            nextBtns.forEach(btn => {
                btn.addEventListener('click', () => this.nextPage());
            });

            const prevBtns = this.popup.querySelectorAll('.nicobar-prev-btn');
            prevBtns.forEach(btn => {
                btn.addEventListener('click', () => this.prevPage());
            });

            // Submit button
            const submitBtn = this.popup.querySelector('.nicobar-submit-btn');
            submitBtn.addEventListener('click', () => this.handleFeedbackSubmit());

            // Feedback buttons
            const feedbackBtns = this.popup.querySelectorAll('.nicobar-feedback-btn[data-question]');
            feedbackBtns.forEach(btn => {
                btn.addEventListener('click', () => this.selectFeedbackOption(btn));
            });

            // Progress dots
            const progressDots = this.popup.querySelectorAll('.nicobar-progress-dot');
            progressDots.forEach((dot, index) => {
                dot.addEventListener('click', () => this.goToPage(index));
            });

            // Close on outside click
            this.popup.addEventListener('click', (e) => {
                if (e.target === this.popup) {
                    this.closePopup();
                }
            });

            // Prevent popup from closing when clicking inside
            const popupContent = this.popup.querySelector('.nicobar-exit-popup-content');
            popupContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Keyboard events
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.popup.classList.contains('show')) {
                    this.closePopup();
                }
            });
        }

        handleExitIntent() {
            if (this.shouldShowPopup()) {
                setTimeout(() => {
                    if (!this.hasShownPopup) {
                        this.showPopup();
                    }
                }, this.exitIntentDelay);
            }
        }

        shouldShowPopup() {
            return !this.hasShownPopup;
        }

        showPopup() {
            this.hasShownPopup = true;
            this.currentPage = 0;
            this.popup.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            this.updatePageVisibility();
            this.updateProgressDots();
        }

        closePopup() {
            this.popup.classList.remove('show');
            document.body.style.overflow = 'auto';
            this.clearFeedbackSelection();
        }

        handleStay() {
            this.closePopup();
        }

        async handleFeedbackSubmit() {
            const openFeedback = this.popup.querySelector('.nicobar-open-feedback').value;
            const userEmail = this.popup.querySelector('.nicobar-user-email').value;
            
            const feedbackData = {
                responses: this.userResponses,
                openFeedback: openFeedback,
                email: userEmail,
                browsingTime: Date.now() - this.browsingStartTime,
                sessionId: this.generateSessionId(),
                userAgent: navigator.userAgent,
                currentUrl: window.location.href,
                timestamp: new Date().toISOString()
            };

            // Send to backend if API URL is configured
            if (this.config.apiUrl) {
                try {
                    const response = await fetch(`${this.config.apiUrl}/api/exit-intent-feedback`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(feedbackData)
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        console.log('✅ Feedback saved successfully:', result.feedbackId);
                    } else {
                        console.error('❌ Failed to save feedback:', result.error);
                    }
                } catch (error) {
                    console.error('❌ Error submitting feedback:', error);
                }
            } else {
                console.log('📊 Exit Intent Feedback:', feedbackData);
            }

            this.showThankYouMessage(userEmail);
            
            setTimeout(() => {
                this.closePopup();
            }, 3000);
        }

        selectFeedbackOption(btn) {
            const question = btn.dataset.question;
            const answer = btn.dataset.answer;
            
            const sameQuestionBtns = this.popup.querySelectorAll(`[data-question="${question}"]`);
            sameQuestionBtns.forEach(b => b.classList.remove('selected'));
            
            btn.classList.add('selected');
            this.userResponses[question] = answer;
            
            const submitBtn = this.popup.querySelector('.nicobar-submit-btn');
            if (submitBtn && Object.keys(this.userResponses).length > 0) {
                submitBtn.disabled = false;
            }
            
            if (this.currentPage < this.totalPages - 1) {
                setTimeout(() => {
                    this.nextPage();
                }, 800);
            }
        }

        nextPage() {
            if (this.currentPage < this.totalPages - 1) {
                this.currentPage++;
                this.updatePageVisibility();
                this.updateProgressDots();
            }
        }

        prevPage() {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.updatePageVisibility();
                this.updateProgressDots();
            }
        }

        goToPage(pageIndex) {
            if (pageIndex >= 0 && pageIndex < this.totalPages && pageIndex !== this.currentPage) {
                this.currentPage = pageIndex;
                this.updatePageVisibility();
                this.updateProgressDots();
            }
        }

        updatePageVisibility() {
            const pages = this.popup.querySelectorAll('.nicobar-popup-page');
            pages.forEach((page, index) => {
                page.classList.remove('active', 'prev');
                if (index === this.currentPage) {
                    page.classList.add('active');
                } else if (index < this.currentPage) {
                    page.classList.add('prev');
                }
            });
        }

        updateProgressDots() {
            const dots = this.popup.querySelectorAll('.nicobar-progress-dot');
            dots.forEach((dot, index) => {
                dot.classList.remove('active', 'completed');
                if (index === this.currentPage) {
                    dot.classList.add('active');
                } else if (index < this.currentPage) {
                    dot.classList.add('completed');
                }
            });
        }

        clearFeedbackSelection() {
            const selectedBtns = this.popup.querySelectorAll('.nicobar-feedback-btn.selected');
            selectedBtns.forEach(btn => btn.classList.remove('selected'));
            
            this.userResponses = {};
            
            const openFeedback = this.popup.querySelector('.nicobar-open-feedback');
            const userEmail = this.popup.querySelector('.nicobar-user-email');
            if (openFeedback) openFeedback.value = '';
            if (userEmail) userEmail.value = '';
            
            const nextBtns = this.popup.querySelectorAll('.nicobar-next-btn');
            nextBtns.forEach(btn => btn.disabled = true);
            
            const submitBtn = this.popup.querySelector('.nicobar-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
            }
            
            this.currentPage = 0;
            this.updatePageVisibility();
            this.updateProgressDots();
        }

        showThankYouMessage(email) {
            const popupContent = this.popup.querySelector('.nicobar-exit-popup-content');
            
            let message = `
                <div style="text-align: center; padding: 30px 20px;">
                    <h2 style="color: ${this.config.theme.primaryColor}; margin-bottom: 20px;">You're awesome! 🙏</h2>
                    <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
                        Seriously, thank you for taking the time to help us get better. 
                        Your thoughts mean everything to us.
                    </p>
            `;
            
            if (email && email.trim()) {
                message += `
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 15px; margin-top: 20px;">
                        <p style="color: ${this.config.theme.primaryColor}; font-weight: 600; margin-bottom: 10px;">✨ We'll curate something special for you!</p>
                        <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                            Keep an eye on <strong>${email}</strong> - we'll send you a personalized collection soon!
                        </p>
                    </div>
                `;
            }
            
            message += `</div>`;
            popupContent.innerHTML = message;
        }

        generateSessionId() {
            return `exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    // Expose to global scope
    window.NicobarExitIntent = NicobarExitIntent;

})(window, document); 