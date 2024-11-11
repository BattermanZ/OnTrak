document.addEventListener('DOMContentLoaded', function() {
    const templateForm = document.getElementById('template-form');
    const templateList = document.getElementById('template-list');
    const newTemplateBtn = document.getElementById('new-template-btn');
    const addActivityBtn = document.getElementById('add-activity');
    const activitiesContainer = document.getElementById('activities-container');

    let currentTemplateId = null;

    function createActivityFields(activity = {}) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-fields mb-3 border p-3';
        activityDiv.innerHTML = `
            <div class="mb-2">
                <label class="form-label">Day</label>
                <input type="number" class="form-control activity-day" value="${activity.day || ''}" required min="1">
            </div>
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
        });
    }

    addActivityBtn.addEventListener('click', function() {
        createActivityFields();
    });

    templateForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const activities = Array.from(activitiesContainer.children).map(activityDiv => ({
            day: parseInt(activityDiv.querySelector('.activity-day').value),
            name: activityDiv.querySelector('.activity-name').value,
            description: activityDiv.querySelector('.activity-description').value,
            start_time: activityDiv.querySelector('.activity-start-time').value,
            duration: parseInt(activityDiv.querySelector('.activity-duration').value)
        }));

        const templateData = {
            name: document.getElementById('template-name').value,
            description: document.getElementById('template-description').value,
            duration: parseInt(document.getElementById('template-duration').value),
            activities: activities
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
                location.reload();
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
            fetch(`/get_template/${templateId}`)
                .then(response => response.json())
                .then(template => {
                    currentTemplateId = template.id;
                    document.getElementById('template-id').value = template.id;
                    document.getElementById('template-name').value = template.name;
                    document.getElementById('template-description').value = template.description;
                    document.getElementById('template-duration').value = template.duration;
                    
                    activitiesContainer.innerHTML = '';
                    template.activities.forEach(activity => createActivityFields(activity));
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while fetching the template');
                });
        }
    });

    newTemplateBtn.addEventListener('click', function() {
        currentTemplateId = null;
        templateForm.reset();
        activitiesContainer.innerHTML = '';
        createActivityFields();
    });

    // Initialize with one empty activity field
    createActivityFields();
});