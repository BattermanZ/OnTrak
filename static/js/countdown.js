// Event listener for starting an activity
document.getElementById('start-activity').addEventListener('click', function(event) {
    event.preventDefault();
    const button = event.target;
    button.disabled = true; // Prevent double triggering

    const firstActivityElement = document.querySelector('tbody tr');
    if (!firstActivityElement) {
        console.error('No activities available to start.');
        alert('No activities available to start.');
        button.disabled = false;
        return;
    }

    // Extract start and end times from the first activity
    const startTime = firstActivityElement.querySelector('td:nth-child(2)').textContent;
    const endTime = firstActivityElement.querySelector('td:nth-child(3)').textContent;

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    // Set start and end times as Date objects
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    // Check if the current time is past the end time
    const now = new Date();
    if (now > endDate) {
        console.warn('The first activity has already ended.');
        alert('The first activity has already ended.');
        button.disabled = false;
        return;
    }

    console.info(`Starting activity with start time: ${startTime}, end time: ${endTime}`);

    // Start the activity by sending a request to the server
    const selectedDay = document.getElementById('day').value;
    fetch('/start_activity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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
            startTime: data.start_time,
            endTime: data.end_time,
            day: selectedDay
        }));

        // Start countdown timer
        let countdownInterval;
        function updateCountdown() {
            const currentTime = new Date();
            const timeRemaining = Math.max(0, endDate - currentTime);

            const minutes = Math.floor((timeRemaining / 1000 / 60) % 60);
            const hours = Math.floor((timeRemaining / 1000 / 60 / 60));

            document.getElementById('countdown').textContent = timeRemaining > 0
                ? `Time remaining: ${hours} hours ${minutes} minutes`
                : `Time elapsed: ${-hours} hours ${-minutes} minutes over`;
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);

        // Update the activity details in the UI
        const currentActivityDetails = document.getElementById('current-activity-details');
        currentActivityDetails.innerHTML = `Start Time: ${data.start_time}<br>End Time: ${data.end_time}`;
        currentActivityDetails.setAttribute('data-activity-id', data.activity_id);

        window.countdownInterval = countdownInterval;
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
        clearInterval(window.countdownInterval);
        document.getElementById('countdown').textContent = 'Activity has been stopped.';
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
        const { startTime, endTime, day, id } = currentActivity;
        console.info(`Found ongoing activity in local storage: ID ${id}, Start Time: ${startTime}, End Time: ${endTime}, Day: ${day}`);

        document.getElementById('day').value = day;
        document.getElementById('countdown').textContent = 'Time remaining: calculating...';

        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        // Set start and end times as Date objects
        const startDate = new Date();
        startDate.setHours(startHours, startMinutes, 0, 0);

        const endDate = new Date();
        endDate.setHours(endHours, endMinutes, 0, 0);

        // Start countdown timer
        let countdownInterval;
        function updateCountdown() {
            const currentTime = new Date();
            const timeRemaining = Math.max(0, endDate - currentTime);

            const minutes = Math.floor((timeRemaining / 1000 / 60) % 60);
            const hours = Math.floor((timeRemaining / 1000 / 60 / 60));

            document.getElementById('countdown').textContent = timeRemaining > 0
                ? `Time remaining: ${hours} hours ${minutes} minutes`
                : `Time elapsed: ${-hours} hours ${-minutes} minutes over`;
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);

        // Update the activity details in the UI
        const currentActivityDetails = document.getElementById('current-activity-details');
        currentActivityDetails.innerHTML = `Start Time: ${startTime}<br>End Time: ${endTime}`;
        currentActivityDetails.setAttribute('data-activity-id', id);

        window.countdownInterval = countdownInterval;
    } else {
