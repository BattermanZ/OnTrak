document.addEventListener('DOMContentLoaded', function() {
    const startSessionForm = document.getElementById('start-session-form');
    const activeSessionsContainer = document.getElementById('active-sessions');
    const currentActivityName = document.getElementById('current-activity-name');
    const currentActivityTime = document.getElementById('current-activity-time');
    const currentActivityProgress = document.getElementById('current-activity-progress');
    const nextActivityName = document.getElementById('next-activity-name');
    const nextActivityTime = document.getElementById('next-activity-time');
    const moveToNextActivityBtn = document.getElementById('move-to-next-activity');
    const closeDayBtn = document.getElementById('close-day');
    const undoMoveBtn = document.getElementById('undo-move');
    const dayActivitiesList = document.getElementById('day-activities-list');

    let currentSessionId = null;

    startSessionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(startSessionForm);
        
        fetch('/start_session', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Session started successfully!');
                location.reload();
            } else {
                alert('Failed to start session: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while starting the session');
        });
    });

    activeSessionsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-session')) {
            const sessionId = e.target.getAttribute('data-session-id');
            currentSessionId = sessionId;
            updateSessionDetails(sessionId);
        } else if (e.target.classList.contains('start-day')) {
            const sessionId = e.target.getAttribute('data-session-id');
            startDay(sessionId);
        } else if (e.target.classList.contains('end-day')) {
            const sessionId = e.target.getAttribute('data-session-id');
            endDay(sessionId);
        }
    });

    moveToNextActivityBtn.addEventListener('click', function() {
        if (currentSessionId) {
            moveToNextActivity(currentSessionId);
        } else {
            alert('No active session selected');
        }
    });

    closeDayBtn.addEventListener('click', function() {
        if (currentSessionId) {
            endDay(currentSessionId);
        } else {
            alert('No active session selected');
        }
    });

    undoMoveBtn.addEventListener('click', function() {
        if (currentSessionId) {
            undoMove(currentSessionId);
        } else {
            alert('No active session selected');
        }
    });

    function updateSessionDetails(sessionId) {
        fetch(`/get_session_status/${sessionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.current_activity) {
                currentActivityName.textContent = data.current_activity.name;
                updateActivityTimes(data.current_activity);
            } else {
                currentActivityName.textContent = 'No current activity';
                currentActivityTime.textContent = '';
                currentActivityProgress.style.width = '0%';
                currentActivityProgress.textContent = '';
            }

            if (data.next_activity) {
                nextActivityName.textContent = data.next_activity.name;
                nextActivityTime.textContent = `${data.next_activity.start_time} - ${data.next_activity.duration} minutes`;
                moveToNextActivityBtn.style.display = 'inline-block';
                closeDayBtn.style.display = 'none';
            } else {
                nextActivityName.textContent = 'No next activity';
                nextActivityTime.textContent = '';
                moveToNextActivityBtn.style.display = 'none';
                closeDayBtn.style.display = 'inline-block';
            }

            updateDaySchedule(data.day_activities);
        });
    }

    function updateActivityTimes(activity) {
        const startTime = parseTime(activity.start_time);
        const endTime = addMinutes(startTime, activity.duration);
        const now = new Date();

        currentActivityTime.textContent = `${formatTime(startTime)} - ${formatTime(endTime)}`;

        updateProgressBar(startTime, endTime, now, activity.duration);
    }

    function updateProgressBar(startTime, endTime, now, duration) {
        const totalDuration = duration * 60; // Convert to seconds
        const elapsedTime = (now - startTime) / 1000; // Convert to seconds
        const remainingTime = Math.max(0, totalDuration - elapsedTime);
        const overtime = Math.max(0, elapsedTime - totalDuration);

        let progressPercentage, progressText;

        if (overtime > 0) {
            progressPercentage = 100;
            progressText = `${Math.round(overtime / 60)} min overtime`;
            currentActivityProgress.classList.remove('bg-primary');
            currentActivityProgress.classList.add('bg-danger');
        } else {
            progressPercentage = (elapsedTime / totalDuration) * 100;
            progressText = `${Math.round(remainingTime / 60)} min remaining`;
            currentActivityProgress.classList.remove('bg-danger');
            currentActivityProgress.classList.add('bg-primary');
        }

        currentActivityProgress.style.width = `${progressPercentage}%`;
        currentActivityProgress.textContent = progressText;
        current

ActivityProgress.setAttribute('aria-valuenow', progressPercentage);
    }

    function updateDaySchedule(activities) {
        dayActivitiesList.innerHTML = '';
        activities.forEach(activity => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            if (activity.name.toLowerCase().includes('break')) {
                li.classList.add('activity-break');
            }
            const startTime = parseTime(activity.start_time);
            const endTime = addMinutes(startTime, activity.duration);
            li.innerHTML = `
                <h5>${activity.name}</h5>
                <p>${formatTime(startTime)} - ${formatTime(endTime)}</p>
                <p>${activity.description || 'No description available'}</p>
            `;
            dayActivitiesList.appendChild(li);
        });
    }

    function parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    }

    function addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60000);
    }

    function formatTime(date) {
        return date.toTimeString().slice(0, 5);
    }

    function startDay(sessionId) {
        fetch(`/start_day/${sessionId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Day started successfully!');
                updateSessionDetails(sessionId);
            } else {
                alert(data.message);
            }
        });
    }

    function endDay(sessionId) {
        fetch(`/end_day/${sessionId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Day ended successfully!');
                location.reload();
            } else {
                alert('Failed to end day');
            }
        });
    }

    function moveToNextActivity(sessionId) {
        fetch(`/move_to_next_activity/${sessionId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Moved to next activity successfully!');
                updateSessionDetails(sessionId);
            } else {
                alert(data.message);
            }
        });
    }

    function undoMove(sessionId) {
        fetch(`/undo_move/${sessionId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Undo successful!');
                updateSessionDetails(sessionId);
            } else {
                alert(data.message);
            }
        });
    }

    // Update session details every minute if a session is selected
    setInterval(() => {
        if (currentSessionId) {
            updateSessionDetails(currentSessionId);
        }
    }, 60000);
});