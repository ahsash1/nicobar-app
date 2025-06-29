document.addEventListener('DOMContentLoaded', () => {
    const totalPointsElement = document.getElementById('total-points');
    const medalImage = document.getElementById('medal-image');
    const medalLevel = document.getElementById('medal-level');
    const profileImage = document.getElementById('profile-image');
    const profileUploadInput = document.getElementById('profile-upload-input');
    const uploadButton = document.getElementById('upload-button');
    const removeButton = document.getElementById('remove-button');
    const welcomeMessage = document.getElementById('welcome-message');
    
    function updateDashboard() {
        const totalPoints = parseInt(localStorage.getItem('totalPoints')) || 0;
        totalPointsElement.textContent = totalPoints;
        
        let medalSrc = '';
        let level = '';
        
        if (totalPoints >= 1 && totalPoints <= 24) {
            medalSrc = 'https://img.freepik.com/premium-vector/bronze-medal-with-red-ribbon-vector-seal-award-bronze-medal-badge-icons-premium-blank-template_751264-292.jpg';
            level = 'Bronze Level (1-24 points)';
        } else if (totalPoints >= 25 && totalPoints <= 49) {
            medalSrc = 'https://th.bing.com/th/id/OIP.TooixhNVJvDsroBLYOq4OAHaI0?w=157&h=187&c=7&r=0&o=7&dpr=1.6&pid=1.7&rm=3';
            level = 'Silver Level (25-49 points)';
        } else if (totalPoints >= 50) {
            medalSrc = 'https://th.bing.com/th/id/OIP.69EzuZ58JKXpGUmOrOH_iwHaHk?w=197&h=200&c=7&r=0&o=7&dpr=1.6&pid=1.7&rm=3';
            level = 'Gold Level (50+ points)';
        } else {
            medalSrc = '';
            level = 'Complete tasks to earn points!';
        }
        
        if (medalSrc) {
            medalImage.src = medalSrc;
            medalImage.style.display = 'block';
        } else {
            medalImage.style.display = 'none';
        }
        
        medalLevel.textContent = level;
    }
    
    function loadWelcomeMessage() {
        const storedUserData = localStorage.getItem('currentUser');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (storedUserData && isLoggedIn === 'true') {
            const userData = JSON.parse(storedUserData);
            welcomeMessage.textContent = `Welcome, ${userData.username}!`;
        } else {
            welcomeMessage.textContent = 'Welcome to FinSmart!';
        }
    }
    
    function loadProfilePicture() {
        const savedProfilePicture = localStorage.getItem('profilePicture');
        if (savedProfilePicture) {
            profileImage.src = savedProfilePicture;
            removeButton.style.display = 'inline-block';
        } else {
            profileImage.src = 'https://via.placeholder.com/150/cccccc/666666?text=Profile';
            removeButton.style.display = 'none';
        }
    }
    
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            // Check file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                alert('Please select a valid image file');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageData = e.target.result;
                profileImage.src = imageData;
                localStorage.setItem('profilePicture', imageData);
                removeButton.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        }
    }
    
    function removeProfilePicture() {
        localStorage.removeItem('profilePicture');
        profileImage.src = 'https://via.placeholder.com/150/cccccc/666666?text=Profile';
        removeButton.style.display = 'none';
        profileUploadInput.value = '';
    }
    
    // Event listeners
    uploadButton.addEventListener('click', () => {
        profileUploadInput.click();
    });
    
    profileUploadInput.addEventListener('change', handleFileUpload);
    removeButton.addEventListener('click', removeProfilePicture);
    
    // Initialize dashboard
    updateDashboard();
    loadWelcomeMessage();
    loadProfilePicture();
    
    // Listen for storage changes to update dashboard when tasks are completed
    window.addEventListener('storage', updateDashboard);
    
    // Also update periodically in case tasks are completed in the same tab
    setInterval(updateDashboard, 1000);
}); 