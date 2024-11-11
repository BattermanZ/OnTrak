document.addEventListener('DOMContentLoaded', function() {
    const templateForm = document.getElementById('template-form');
    const templateList = document.getElementById('template-list');
    const newTemplateBtn = document.getElementById('new-template-btn');
    const addActivityBtn = document.getElementById('add-activity');
    const activitiesContainer = document.getElementById('activities-container');
    const dayEditor = document.getElementById('day-editor');
    const daySelect = document.getElementById('day-select');
    const saveDayBtn = document.getElementById('save-day');
    const clearDayBtn = document.getElementById('clear-day');

    let currentTemplateId = null;
    let currentDay = 1;
    let unsavedChanges = false;

    function createActivityFields(activity = {}) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-fields mb-3 border p-3';
        activityDiv.innerHTML = `
            <div class="mb-2">
                <label class="form-label">Name</label>
                <input type="text" class="form-control activity-name" value="${activity.name || ''}" required>
            </div>
            <div class="mb-2">
                <label class="form-label">Description</label>
                <textarea class="form-control activity-description">${activity.description || ''}</textarea>
            </div>
            <div class="mb-2">
                <label class="form-label">Start Time</label>
                <input type="time" class="form-control activity-start-time" value="${activity.start_time || ''}" required>
            </div>
            <div class="mb-2">
                <label class="form-label">Duration (minutes)</label>
                <input type="number" class="form-control activity-duration" value="${activity.duration || ''}" required min="1">
            </div>
            <button type="button" class="btn btn-danger remove-activity">Remove</button>
        `;
        activitiesContainer.appendChild(activityDiv);

        activityDiv.querySelector('.remove-activity').addEventListener('click', function() {
            activitiesContainer.removeChild(activityDiv);
            unsavedChanges = true;
        });

        activityDiv.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('change', () => {
                unsavedChanges = true;
            });
        });
    }

    addActivityBtn.addEventListener('click', function() {
        createActivityFields();
        unsavedChanges = true;
    });

    templateForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const templateData = {
            name: document.getElementById('template-name').value,
            description: document.getElementById('template-description').value,
            duration: parseInt(document.getElementById('template-duration').value)
        };

        if (currentTemplateId) {
            templateData.id = currentTemplateId;
        }

        fetch('/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(templateData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                currentTemplateId = data.id;
                showDayEditor(templateData.duration);
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('An error occurred while saving the template');
        });
    });

    templateList.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-template')) {
            const templateId = e.target.getAttribute('data-template-id');
            editTemplate(templateId);
        } else if (e.target.classList.contains('delete-template')) {
            const templateId = e.target.getAttribute('data-template-id');
            deleteTemplate(templateId);
        }
    });

    newTemplateBtn.addEventListener('click', function() {
        currentTemplateId = null;
        templateForm.reset();
        activitiesContainer.innerHTML = '';
        dayEditor.style.display = 'none';
    });

    daySelect.addEventListener('change', function() {
        if (unsavedChanges) {
            if (confirm('You have unsaved changes. Do you want to discard them?')) {
                loadDayActivities(this.value);
            } else {
                this.value = currentDay;
            }
        } else {
            loadDayActivities(this.value);
        }
    });

    saveDayBtn.addEventListener('click', function() {
        saveDayActivities();
    });

    clearDayBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all activities for this day?')) {
            activitiesContainer.innerHTML = '';
            unsavedChanges = true;
        }
    });

    function showDayEditor(duration) {
        dayEditor.style.display = 'block';
        daySelect.innerHTML = '';
        for (let i = 1; i <= duration; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Day ${i}`;
            daySelect.appendChild(option);
        }
        currentDay = 1;
        loadDayActivities(currentDay);
    }

    function loadDayActivities(day) {
        fetch(`/get_template/${currentTemplateId}`)
            .then(response => response.json())
            .then(template => {
                activitiesContainer.innerHTML = '';
                const dayActivities = template.activities.filter(activity => activity.day == day);
                dayActivities.forEach(activity => createActivityFields(activity));
                currentDay = day;
                unsavedChanges = false;
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while fetching the template');
            });
    }

    function saveDayActivities() {
        const activities = Array.from(activitiesContainer.children).map(activityDiv => ({
            name: activityDiv.querySelector('.activity-name').value,
            description: activityDiv.querySelector('.activity-description').value,
            start_time: activityDiv.querySelector('.activity-start-time').value,
            duration: parseInt(activityDiv.querySelector('.activity-duration').value)
        }));

        fetch(`/save_day_activities/${currentTemplateId}/${currentDay}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ activities: activities }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                unsavedChanges = false;
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('An error occurred while saving the activities');
        });
    }

    function editTemplate(templateId) {
        fetch(`/get_template/${templateId}`)
            .then(response => response.json())
            .then(template => {
                currentTemplateId = template.id;
                document.getElementById('template-id').value = template.id;
                document.getElementById('template-name').value = template.name;
                document.getElementById('template-description').value = template.description;
                document.getElementById('template-duration').value = template.duration;
                showDayEditor(template.duration);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while fetching the template');
            });
    }

    function deleteTemplate(templateId) {
        if (confirm('Are you sure you want to delete this template?')) {
            fetch(`/delete_template/${templateId}`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('An error occurred while deleting the template');
            });
        }
    }
});