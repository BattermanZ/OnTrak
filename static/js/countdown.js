// Event listener for starting an activity
document.getElementById('start-activity').addEventListener('click', function(event) {
    event.preventDefault();
    const button = event.target;
    button.disabled = true; // Prevent double triggering

    const activityElements = document.querySelectorAll('tbody tr');
    if (!activityElements.length) {
        console.error('No activities available to start.');
        alert('No activities available to start.');
        button.disabled = false;
        return;
    }

    // Find the next activity that has not yet started
    let activityToStart = null;
    const now = new Date();
    activityElements.forEach(activityElement => {
        const startTime = activityElement.querySelector('td:nth-child(2)').textContent;
        const endTime = activityElement.querySelector('td:nth-child(3)').textContent;

        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        const startDate = new Date();
        startDate.setHours(startHours, startMinutes, 0, 0);

        const endDate = new Date();
        endDate.setHours(endHours, endMinutes, 0, 0);

        // Select the first activity that has not ended
        if (now < endDate && !activityToStart) {
            activityToStart = activityElement;
        }
    });

    if (!activityToStart) {
        console.warn('All activities have already ended.');
        alert('All activities have already ended.');
        button.disabled = false;
        return;
    }

    // Extract start and end times from the selected activity
    const startTime = activityToStart.querySelector('td:nth-child(2)').textContent;
    const endTime = activityToStart.querySelector('td:nth-child(3)').textContent;

    console.info(`Starting activity with start time: ${startTime}, end time: ${endTime}`);

    // Start the activity by sending a request to the server
    const selectedDay = document.getElementById('day').value;
    fetch('/start_activity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest' // Add header to prevent 403 errors
        },
        body: JSON.stringify({ day: selectedDay })
    })
    .then(response => {
        console.info('Received response for start activity request.');
        if (!response.ok) {
            console.error(`Error response received: ${response.status} - ${response.statusText}`);
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            console.error(`Error starting activity: ${data.error}`);
            alert(data.error);
            button.disabled = false;
            return;
        }

        console.info(`Activity started successfully: ${data.name}, Start Time: ${data.start_time}, End Time: ${data.end_time}`);

        // Store current activity details in local storage
        localStorage.setItem('currentActivity', JSON.stringify({
            id: data.activity_id,
            name: data.name,
            startTime: data.start_time,
            endTime: data.end_time,
            day: selectedDay
        }));

        // Start countdown timer
        startCountdown(data.start_time, data.end_time);

        // Start progress bar
        startProgressBar(data.start_time, data.end_time);

        // Update the activity details in the UI
        updateCurrentActivityDetails(data.name, data.start_time, data.end_time);
    })
    .catch(error => {
        console.error('Error starting activity:', error);
        alert('Failed to start activity. Please check the console for more details.');
    })
    .finally(() => {
        button.disabled = false;
    });
});

// Event listener for stopping an activity
document.getElementById('stop-activity').addEventListener('click', function(event) {
    event.preventDefault();
    const button = event.target;
    button.disabled = true; // Prevent double triggering

    // Get current activity details from local storage
    const currentActivity = JSON.parse(localStorage.getItem('currentActivity'));
    if (!currentActivity) {
        console.warn('No activity is currently in progress.');
        alert('No activity is currently in progress.');
        button.disabled = false;
        return;
    }

    console.info(`Stopping activity with ID: ${currentActivity.id}`);

    // Stop the activity by sending a request to the server
    fetch('/stop_activity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest' // Add header to prevent 403 errors
        },
        body: JSON.stringify({ activity_id: currentActivity.id })
    })
    .then(response => {
        console.info('Received response for stop activity request.');
        if (!response.ok) {
            console.error(`Error response received: ${response.status} - ${response.statusText}`);
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            console.error(`Error stopping activity: ${data.error}`);
            alert(data.error);
            button.disabled = false;
            return;
        }

        console.info(`Activity stopped successfully with ID: ${currentActivity.id}`);

        // Clear countdown timer and update UI
        stopCountdown();
        stopProgressBar();
        document.getElementById('current-activity-details').innerHTML = 'No activity in progress';
        localStorage.removeItem('currentActivity');
    })
    .catch(error => {
        console.error('Error stopping activity:', error);
        alert('Failed to stop activity. Please check the console for more details.');
    })
    .finally(() => {
        button.disabled = false;
    });
});

// Event listener for loading the page
document.addEventListener('DOMContentLoaded', function() {
    console.info('Page loaded. Checking for ongoing activity in local storage.');

    // Load current activity details from local storage if available
    const currentActivity = JSON.parse(localStorage.getItem('currentActivity'));
    if (currentActivity) {
        const { startTime, endTime, day, id, name } = currentActivity;
        console.info(`Found ongoing activity in local storage: ID ${id}, Name: ${name}, Start Time: ${startTime}, End Time: ${endTime}, Day: ${day}`);

        document.getElementById('day').value = day;
        startCountdown(startTime, endTime);
        startProgressBar(startTime, endTime);

        // Update the activity details in the UI
        updateCurrentActivityDetails(name, startTime, endTime);
    }
});

// Function to start the countdown timer
function startCountdown(startTime, endTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    function updateCountdown() {
        const currentTime = new Date();
        const timeRemaining = Math.max(0, endDate - currentTime);

        const minutes = Math.floor((timeRemaining / 1000 / 60) % 60);
        const hours = Math.floor((timeRemaining / 1000 / 60 / 60));

        document.getElementById('countdown').innerHTML = timeRemaining > 0
            ? `Time remaining: ${hours} hours ${minutes} minutes`
            : 'Activity time has elapsed.';
    }

    updateCountdown();
    window.countdownInterval = setInterval(updateCountdown, 1000);
}

// Function to stop the countdown timer
function stopCountdown() {
    console.info('Stopping countdown timer.');
    clearInterval(window.countdownInterval);
    document.getElementById('countdown').textContent = '';
}

// Function to update current activity details in the UI
function updateCurrentActivityDetails(activityName, startTime, endTime) {
    const currentActivityDetails = document.getElementById('current-activity-details');
    currentActivityDetails.innerHTML = `${activityName} from ${startTime} to ${endTime}`;
}

// Function to start the progress bar
function startProgressBar(startTime, endTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    const totalDuration = endDate - startDate;

    function updateProgressBar() {
        const currentTime = new Date();
        const elapsedTime = Math.max(0, currentTime - startDate);
        const progress = Math.min(100, (elapsedTime / totalDuration) * 100);

        document.getElementById('activity-progress-bar').style.width = `${progress}%`;
    }

    updateProgressBar();
    window.progressBarInterval = setInterval(updateProgressBar, 1000);
}

// Function to stop the progress bar
function stopProgressBar() {
    console.info('Stopping progress bar.');
    clearInterval(window.progressBarInterval);
    document.getElementById('activity-progress-bar').style.width = '0%';
}

// Event listener for skipping to the next activity
document.getElementById('skip-activity').addEventListener('click', function(event) {
    event.preventDefault();
    const button = event.target;
    button.disabled = true; // Prevent double triggering

    console.info('Skipping to the next activity.');

    // Send a request to the server to skip to the next activity
    const selectedDay = document.getElementById('day').value;
    fetch('/skip_activity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest' // Add header to prevent 403 errors
        },
        body: JSON.stringify({ day: selectedDay })
    })
    .then(response => {
        console.info('Received response for skip activity request.');
        if (!response.ok) {
            console.error(`Error response received: ${response.status} - ${response.statusText}`);
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            console.error(`Error skipping activity: ${data.error}`);
            alert(data.error);
            button.disabled = false;
            return;
        }

        console.info(`Activity skipped to successfully: ${data.name}, Start Time: ${data.start_time}, End Time: ${data.end_time}`);

        // Store current activity details in local storage
        localStorage.setItem('currentActivity', JSON.stringify({
            id: data.activity_id,
            name: data.name,
            startTime: data.start_time,
            endTime: data.end_time,
            day: selectedDay
        }));

        // Start countdown timer
        startCountdown(data.start_time, data.end_time);

        // Start progress bar
        startProgressBar(data.start_time, data.end_time);

        // Update the activity details in the UI
        updateCurrentActivityDetails(data.name, data.start_time, data.end_time);
    })
    .catch(error => {
        console.error('Error skipping activity:', error);
        alert('Failed to skip activity. Please check the console for more details.');
    })
    .finally(() => {
        button.disabled = false;
    });
});