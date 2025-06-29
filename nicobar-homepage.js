// Exit Intent Popup Functionality for Nicobar Homepage

class ExitIntentManager {
    constructor() {
        this.popup = document.getElementById('exit-intent-popup');
        this.hasShownPopup = false;
        this.browsingStartTime = Date.now();
        this.exitIntentDelay = 100; // Near-instant popup on exit intent
        this.userResponses = {}; // Store user responses
        this.currentPage = 0;
        this.totalPages = 4;
        
        this.init();
    }

    init() {
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Exit intent detection - trigger when mouse moves to top of screen
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY <= 0 || e.clientY <= 5) {
                this.handleExitIntent();
            }
        });

        // Additional exit intent detection for better coverage
        document.addEventListener('mouseout', (e) => {
            if (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML') {
                if (e.clientY <= 10) {
                    this.handleExitIntent();
                }
            }
        });

        // Close popup events
        const closeBtn = document.querySelector('.popup-close');
        closeBtn.addEventListener('click', () => this.closePopup());

        // Stay button
        const stayBtn = document.querySelector('.stay-btn');
        stayBtn.addEventListener('click', () => this.handleStay());

        // Navigation buttons
        const nextBtns = document.querySelectorAll('.next-btn');
        nextBtns.forEach(btn => {
            btn.addEventListener('click', () => this.nextPage());
        });

        const prevBtns = document.querySelectorAll('.prev-btn');
        prevBtns.forEach(btn => {
            btn.addEventListener('click', () => this.prevPage());
        });

        // Feedback submission
        const submitBtn = document.querySelector('.feedback-btn-submit');
        submitBtn.addEventListener('click', () => this.handleFeedbackSubmit());

        // Feedback option selection
        const feedbackBtns = document.querySelectorAll('.feedback-btn[data-question]');
        feedbackBtns.forEach(btn => {
            btn.addEventListener('click', () => this.selectFeedbackOption(btn));
        });

        // Progress dot navigation
        const progressDots = document.querySelectorAll('.progress-dot');
        progressDots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToPage(index));
        });

        // Close popup on outside click
        this.popup.addEventListener('click', (e) => {
            if (e.target === this.popup) {
                this.closePopup();
            }
        });

        // Prevent popup from closing when clicking inside
        const popupContent = document.querySelector('.popup-content');
        popupContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.popup.classList.contains('show')) {
                this.closePopup();
            }
        });

        // Log exit attempts
        window.addEventListener('beforeunload', (e) => {
            this.logExitAttempt();
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

    // Page Navigation Methods
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
        const pages = document.querySelectorAll('.popup-page');
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
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            if (index === this.currentPage) {
                dot.classList.add('active');
            } else if (index < this.currentPage) {
                dot.classList.add('completed');
            }
        });
    }

    shouldShowPopup() {
        return !this.hasShownPopup;
    }

    showPopup() {
        this.hasShownPopup = true;
        this.currentPage = 0;
        this.popup.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Reset to first page and update UI
        this.updatePageVisibility();
        this.updateProgressDots();
        
        // Analytics tracking
        this.trackEvent('exit_intent_popup_shown', {
            browsingTime: Date.now() - this.browsingStartTime,
            timestamp: new Date().toISOString()
        });
    }

    closePopup() {
        this.popup.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        // Clear any selected feedback
        this.clearFeedbackSelection();
    }

    handleStay() {
        this.trackEvent('user_chose_to_stay', {
            browsingTime: Date.now() - this.browsingStartTime
        });
        
        this.closePopup();
        
        // Optional: Show a subtle thank you message
        this.showThankYouMessage("Thanks for staying! Happy browsing 🛍️");
    }

    async handleFeedbackSubmit() {
        // Collect all responses
        const openFeedback = document.getElementById('open-feedback').value;
        const userEmail = document.getElementById('user-email').value;
        
        const feedbackData = {
            responses: this.userResponses,
            openFeedback: openFeedback,
            email: userEmail,
            browsingTime: Date.now() - this.browsingStartTime,
            sessionId: this.generateSessionId(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        // Send to backend
        try {
            const response = await fetch('/api/exit-intent-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData)
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Feedback saved successfully:', result.feedbackId);
                this.trackEvent('feedback_saved_to_database', { feedbackId: result.feedbackId });
            } else {
                console.error('❌ Failed to save feedback:', result.error);
            }
        } catch (error) {
            console.error('❌ Error submitting feedback:', error);
        }
        
        this.trackEvent('comprehensive_feedback_submitted', feedbackData);
        
        // Show personalized thank you message
        this.showFeedbackThankYou(userEmail);
        
        // Close popup after delay
        setTimeout(() => {
            this.closePopup();
        }, 3000);
    }

    generateSessionId() {
        return `exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    selectFeedbackOption(btn) {
        const question = btn.dataset.question;
        const answer = btn.dataset.answer;
        
        // Clear previous selections in this question group
        const sameQuestionBtns = document.querySelectorAll(`[data-question="${question}"]`);
        sameQuestionBtns.forEach(b => b.classList.remove('selected'));
        
        // Select current option with animation
        btn.classList.add('selected');
        
        // Store the response
        this.userResponses[question] = answer;
        
        // Enable submit button on final page
        const submitBtn = document.querySelector('.feedback-btn-submit');
        if (submitBtn && Object.keys(this.userResponses).length > 0) {
            submitBtn.disabled = false;
        }
        
        // Auto-advance to next page after a short delay (except on final page)
        if (this.currentPage < this.totalPages - 1) {
            setTimeout(() => {
                this.nextPage();
            }, 800); // 800ms delay for smooth UX
        }
    }

    clearFeedbackSelection() {
        const selectedBtns = document.querySelectorAll('.feedback-btn.selected');
        selectedBtns.forEach(btn => btn.classList.remove('selected'));
        
        // Clear stored responses
        this.userResponses = {};
        
        // Clear text inputs
        const openFeedback = document.getElementById('open-feedback');
        const userEmail = document.getElementById('user-email');
        if (openFeedback) openFeedback.value = '';
        if (userEmail) userEmail.value = '';
        
        // Reset all next buttons
        const nextBtns = document.querySelectorAll('.next-btn');
        nextBtns.forEach(btn => btn.disabled = true);
        
        // Reset submit button
        const submitBtn = document.querySelector('.feedback-btn-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
        
        // Reset to first page
        this.currentPage = 0;
        this.updatePageVisibility();
        this.updateProgressDots();
    }

    showThankYouMessage(message) {
        const thankYouDiv = document.createElement('div');
        thankYouDiv.className = 'thank-you-message';
        thankYouDiv.textContent = message;
        thankYouDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #d4a574;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10001;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(thankYouDiv);
        
        setTimeout(() => {
            thankYouDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(thankYouDiv);
            }, 300);
        }, 3000);
    }

    showFeedbackThankYou(email) {
        const popupContent = document.querySelector('.popup-content');
        
        let message = `
            <div style="text-align: center; padding: 30px 20px;">
                <h2 style="color: #d4a574; margin-bottom: 20px;">You're awesome! 🙏</h2>
                <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
                    Seriously, thank you for taking the time to help us get better. 
                    Your thoughts mean everything to us.
                </p>
        `;
        
        if (email && email.trim()) {
            message += `
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 15px; margin-top: 20px;">
                    <p style="color: #d4a574; font-weight: 600; margin-bottom: 10px;">✨ We'll curate something special for you!</p>
                    <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                        Keep an eye on <strong>${email}</strong> - we'll send you a personalized collection soon!
                    </p>
                </div>
            `;
        }
        
        message += `</div>`;
        popupContent.innerHTML = message;
    }

    trackEvent(eventName, data) {
        // Analytics tracking - you can integrate with your analytics service
        console.log(`Event: ${eventName}`, data);
        
        // Example: Send to analytics service
        // analytics.track(eventName, data);
        
        // Or send to your backend
        // fetch('/api/analytics', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ event: eventName, data })
        // });
    }

    logExitAttempt() {
        this.trackEvent('exit_attempt', {
            browsingTime: Date.now() - this.browsingStartTime,
            popupShown: this.hasShownPopup
        });
    }
}

// Additional CSS for animations
const additionalStyles = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ExitIntentManager();
    
    // Optional: Add some interactive elements to make the page feel more alive
    addInteractiveElements();
});

function addInteractiveElements() {
    // Add hover effects to navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            link.style.transform = 'translateY(-2px)';
        });
        
        link.addEventListener('mouseleave', () => {
            link.style.transform = 'translateY(0)';
        });
    });
    
    // Add click effect to the gift shop badge
    const giftBadge = document.querySelector('.gift-shop-badge');
    if (giftBadge) {
        giftBadge.addEventListener('click', () => {
            giftBadge.style.transform = 'translateX(-50%) scale(0.95)';
            setTimeout(() => {
                giftBadge.style.transform = 'translateX(-50%) scale(1)';
            }, 150);
        });
    }
} 