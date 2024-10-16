// Event listener for starting or restarting an activity
const startActivityButton = document.getElementById('start-activity');
const stopActivityButton = document.getElementById('stop-activity');

// Function to send a request to the server
const sendRequest = (url, method, data) => fetch(url, {
    method,
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(data)
}).then(response => {
    if (!response.ok) throw new Error(`Error: ${response.status} - ${response.statusText}`);
    return response.json();
});

// Function to update the UI with the current activity details
const updateActivityUI = (activity) => {
    sessionStorage.setItem('currentActivity', JSON.stringify(activity));
    startCountdown(activity.startTime, activity.endTime);
    startProgressBar(activity.startTime, activity.endTime);
    updateCurrentActivityDetails(activity.name, activity.startTime, activity.endTime);
};

// Function to handle button clicks for starting or stopping activities
const handleButtonClick = (button, url, data, callback) => {
    button.disabled = true;
    sendRequest(url, 'POST', data)
        .then(callback)
        .catch(error => alert(`Failed to process request: ${error.message}`))
        .finally(() => button.disabled = false);
};

// Event listener for starting or restarting an activity
if (startActivityButton) {
    startActivityButton.addEventListener('click', (event) => {
        event.preventDefault();
        const selectedDay = document.getElementById('day').value;
        const userId = sessionStorage.getItem('user_id');
        const currentActivity = JSON.parse(sessionStorage.getItem('currentActivity'));

        if (currentActivity && currentActivity.status === 'stopped') {
            // Restart the stopped activity
            handleButtonClick(startActivityButton, '/start_activity', { activity_id: currentActivity.id, user_id: userId, day: selectedDay }, (data) => {
                if (data.error) throw new Error(data.error);
                updateActivityUI({
                    id: data.activity_id,
                    name: data.name,
                    startTime: data.start_time,
                    endTime: data.end_time,
                    day: selectedDay,
                    status: 'in-progress'
                });
            });
        } else {
            // Start a new activity
            handleButtonClick(startActivityButton, '/start_activity', { day: selectedDay, user_id: userId }, (data) => {
                if (data.error) throw new Error(data.error);
                updateActivityUI({
                    id: data.activity_id,
                    name: data.name,
                    startTime: data.start_time,
                    endTime: data.end_time,
                    day: selectedDay,
                    status: 'in-progress'
                });
            });
        }
    });
}

// Event listener for stopping an activity
if (stopActivityButton) {
    stopActivityButton.addEventListener('click', (event) => {
        event.preventDefault();
        const currentActivity = JSON.parse(sessionStorage.getItem('currentActivity'));
        const userId = sessionStorage.getItem('user_id');
        if (!currentActivity) {
            alert('No activity is currently in progress.');
            return;
        }
        handleButtonClick(stopActivityButton, '/stop_activity', { activity_id: currentActivity.id, user_id: userId }, () => {
            stopCountdown();
            stopProgressBar();
            document.getElementById('current-activity-details').innerHTML = 'No activity in progress';
            currentActivity.status = 'stopped';
            sessionStorage.setItem('currentActivity', JSON.stringify(currentActivity));
        });
    });
}

// Load the current activity from session storage when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const currentActivity = JSON.parse(sessionStorage.getItem('currentActivity'));
    if (currentActivity && currentActivity.status === 'in-progress') {
        updateActivityUI(currentActivity);
    }
});

// Function to start the countdown timer
const startCountdown = (startTime, endTime) => {
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    const updateCountdown = () => {
        const timeRemaining = Math.max(0, endDate - new Date());
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
        document.getElementById('countdown').innerHTML = timeRemaining > 0 ? `Time remaining: ${hours} hours ${minutes} minutes` : 'Activity time has elapsed.';
    };

    updateCountdown();
    window.countdownInterval = setInterval(updateCountdown, 1000);
};

// Function to stop the countdown timer
const stopCountdown = () => {
    clearInterval(window.countdownInterval);
    document.getElementById('countdown').textContent = '';
};

// Function to start the progress bar
const startProgressBar = (startTime, endTime) => {
    const progressBar = document.getElementById('activity-progress-bar');
    if (!progressBar) return;

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    const updateProgressBar = () => {
        const timeElapsed = Math.max(0, new Date() - startDate);
        const totalDuration = endDate - startDate;
        const progressPercentage = Math.min(100, (timeElapsed / totalDuration) * 100);

        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage);
    };

    updateProgressBar();
    window.progressBarInterval = setInterval(updateProgressBar, 1000);
};

// Function to stop the progress bar
const stopProgressBar = () => {
    clearInterval(window.progressBarInterval);
    const progressBar = document.getElementById('activity-progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
    }
};

// Function to update the current activity details in the UI
const updateCurrentActivityDetails = (activityName, startTime, endTime) => {
    document.getElementById('current-activity-details').innerHTML = `${activityName} (Start: ${startTime}, End: ${endTime})`;
};