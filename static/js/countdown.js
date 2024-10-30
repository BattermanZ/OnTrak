document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    const startButton = document.getElementById('start-activity');
    const stopButton = document.getElementById('stop-activity');
    const skipButton = document.getElementById('skip-activity');
    const daySelect = document.getElementById('day');
    const progressBar = document.getElementById('activity-progress-bar');
    const countdownDisplay = document.getElementById('countdown');
    const currentActivityDetails = document.getElementById('current-activity-details');
    
    // Clear any existing intervals
    if (window.countdownInterval) clearInterval(window.countdownInterval);
    if (window.progressInterval) clearInterval(window.progressInterval);
    if (window.checkActivityInterval) clearInterval(window.checkActivityInterval);

    // Activity state
    let currentActivity = null;
    let isActivityRunning = false;

    // Helper function to show error modal
    function showError(message) {
        const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
        document.getElementById('errorMessage').textContent = message;
        errorModal.show();
    }

    // Helper function to make API requests
    async function makeRequest(url, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };
            if (data) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Function to update UI elements
    function updateUI(currentActivity, upcomingActivity) {
        const currentActivityName = document.getElementById('current-activity-name');
        const currentActivityTime = document.getElementById('current-activity-time');
        const upcomingActivityName = document.getElementById('upcoming-activity-name');
        const upcomingActivityTime = document.getElementById('upcoming-activity-time');

        // Update current activity display
        if (currentActivity && isActivityRunning) {
            currentActivityName.textContent = currentActivity.name;
            currentActivityTime.textContent = `${currentActivity.start_time} - ${currentActivity.end_time}`;
            currentActivityDetails.textContent = 
                `${currentActivity.name} (Start: ${currentActivity.start_time}, End: ${currentActivity.end_time})`;
            startButton.disabled = true;
            stopButton.disabled = false;
            skipButton.disabled = !upcomingActivity;
        } else {
            currentActivityName.textContent = 'No activity in progress';
            currentActivityTime.textContent = '';
            currentActivityDetails.textContent = 'No activity in progress';
            startButton.disabled = false;
            stopButton.disabled = true;
            skipButton.disabled = true;
            progressBar.style.width = '0%';
            countdownDisplay.textContent = 'No activity in progress';
        }

        // Update upcoming activity display
        if (upcomingActivity) {
            upcomingActivityName.textContent = upcomingActivity.name;
            upcomingActivityTime.textContent = `Starts at ${upcomingActivity.start_time}`;
            if (isActivityRunning) {
                skipButton.disabled = false;
            }
        } else {
            upcomingActivityName.textContent = 'No upcoming activity';
            upcomingActivityTime.textContent = '';
            skipButton.disabled = true;
        }
    }

    // Function to start countdown
    function startCountdown(endTime) {
        if (window.countdownInterval) {
            clearInterval(window.countdownInterval);
        }

        function updateCountdown() {
            const now = new Date();
            const end = new Date();
            const [endHours, endMinutes] = endTime.split(':').map(Number);
            end.setHours(endHours, endMinutes, 0, 0);

            if (end < now) {
                end.setDate(end.getDate() + 1);
            }

            const diff = end - now;
            if (diff <= 0) {
                countdownDisplay.textContent = 'Activity time has elapsed';
                clearInterval(window.countdownInterval);
                checkCurrentActivity();
                return false;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            countdownDisplay.textContent = `Time remaining: ${hours} hours ${minutes} minutes`;
            return true;
        }

        updateCountdown();
        window.countdownInterval = setInterval(updateCountdown, 1000);
    }

    // Function to update progress bar
    function updateProgress(startTime, endTime) {
        if (window.progressInterval) {
            clearInterval(window.progressInterval);
        }

        function calculateProgress() {
            const now = new Date();
            const start = new Date();
            const end = new Date();
            
            const [startHours, startMinutes] = startTime.split(':').map(Number);
            const [endHours, endMinutes] = endTime.split(':').map(Number);
            
            start.setHours(startHours, startMinutes, 0, 0);
            end.setHours(endHours, endMinutes, 0, 0);

            if (end < start) {
                end.setDate(end.getDate() + 1);
            }

            const total = end - start;
            const elapsed = now - start;
            const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
            
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
        }

        calculateProgress();
        window.progressInterval = setInterval(calculateProgress, 1000);
    }

    // Function to check current activity status
    async function checkCurrentActivity() {
        try {
            const response = await makeRequest(`/get_current_activity?day=${daySelect.value}`);
            const { current_activity, upcoming_activity } = response;

            if (current_activity && isActivityRunning) {
                currentActivity = current_activity;
                
                updateUI(current_activity, upcoming_activity);
                startCountdown(current_activity.end_time);
                updateProgress(current_activity.start_time, current_activity.end_time);
            } else if (!current_activity && isActivityRunning) {
                isActivityRunning = false;
                currentActivity = null;
                updateUI(null, upcoming_activity);
            } else {
                updateUI(null, upcoming_activity);
            }
        } catch (error) {
            console.error('Failed to check current activity:', error);
            showError('Failed to check activity status');
        }
    }

    // Function to start activity
    async function startActivity() {
        try {
            const response = await makeRequest('/start_activity', 'POST', {
                day: daySelect.value
            });

            currentActivity = response;
            isActivityRunning = true;
            
            // Fetch updated activity status
            const statusResponse = await makeRequest(`/get_current_activity?day=${daySelect.value}`);
            updateUI(response, statusResponse.upcoming_activity);
            startCountdown(response.end_time);
            updateProgress(response.start_time, response.end_time);
        } catch (error) {
            showError('Failed to start activity: ' + error.message);
        }
    }

    // Function to stop activity
    async function stopActivity() {
        if (!currentActivity) return;

        try {
            await makeRequest('/stop_activity', 'POST', {
                activity_id: currentActivity.id
            });

            isActivityRunning = false;
            currentActivity = null;
            
            // Fetch updated activity status
            const response = await makeRequest(`/get_current_activity?day=${daySelect.value}`);
            updateUI(null, response.upcoming_activity);
            
            if (window.countdownInterval) clearInterval(window.countdownInterval);
            if (window.progressInterval) clearInterval(window.progressInterval);
        } catch (error) {
            showError('Failed to stop activity: ' + error.message);
        }
    }

    // Function to skip to next activity
    async function skipActivity() {
        try {
            const response = await makeRequest('/skip_activity', 'POST', {
                day: daySelect.value
            });

            currentActivity = response;
            isActivityRunning = true;
            
            // Fetch updated activity status
            const statusResponse = await makeRequest(`/get_current_activity?day=${daySelect.value}`);
            updateUI(response, statusResponse.upcoming_activity);
            startCountdown(response.end_time);
            updateProgress(response.start_time, response.end_time);
        } catch (error) {
            showError('Failed to skip activity: ' + error.message);
        }
    }

    // Event listeners
    startButton.addEventListener('click', startActivity);
    stopButton.addEventListener('click', stopActivity);
    skipButton.addEventListener('click', skipActivity);
    
    daySelect.addEventListener('change', () => {
        document.getElementById('selected-day-display').textContent = daySelect.value;
        isActivityRunning = false;
        currentActivity = null;
        checkCurrentActivity();
    });

    // Start periodic checks
    window.checkActivityInterval = setInterval(checkCurrentActivity, 60000); // Check every minute
    
    // Initial check
    checkCurrentActivity();
});