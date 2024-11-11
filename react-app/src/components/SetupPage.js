import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';

export default function SetupPage() {
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState({
    name: '',
    description: '',
    duration: 1,
    activities: [],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTemplate({ ...template, [name]: value });
  };

  const addActivity = () => {
    setTemplate({
      ...template,
      activities: [
        ...template.activities,
        { id: Date.now(), name: '', description: '', startTime: '', duration: 30, day: 1 },
      ],
    });
  };

  const updateActivity = (index, field, value) => {
    const updatedActivities = [...template.activities];
    updatedActivities[index][field] = value;
    setTemplate({ ...template, activities: updatedActivities });
  };

  const removeActivity = (index) => {
    const updatedActivities = template.activities.filter((_, i) => i !== index);
    setTemplate({ ...template, activities: updatedActivities });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(template.activities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTemplate({ ...template, activities: items });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Basic Information</h2>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Template Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={template.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={template.description}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Duration (days)
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={template.duration}
                onChange={handleInputChange}
                min={1}
                max={28}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Activities</h2>
            <button
              onClick={addActivity}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Activity
            </button>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="activities">
                {(provided) => (
                  <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {template.activities.map((activity, index) => (
                      <Draggable key={activity.id} draggableId={activity.id.toString()} index={index}>
                        {(provided) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white shadow-sm rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-medium">Activity {index + 1}</h3>
                              <button
                                onClick={() => removeActivity(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                  type="text"
                                  value={activity.name}
                                  onChange={(e) => updateActivity(index, 'name', e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Day</label>
                                <input
                                  type="number"
                                  value={activity.day}
                                  onChange={(e) => updateActivity(index, 'day', parseInt(e.target.value))}
                                  min={1}
                                  max={template.duration}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                                <input
                                  type="time"
                                  value={activity.startTime}
                                  onChange={(e) => updateActivity(index, 'startTime', e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                                <input
                                  type="number"
                                  value={activity.duration}
                                  onChange={(e) => updateActivity(index, 'duration', parseInt(e.target.value))}
                                  min={1}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                  required
                                />
                              </div>
                            </div>
                            <div className="mt-2">
                              <label className="block text-sm font-medium text-gray-700">Description</label>
                              <textarea
                                value={activity.description}
                                onChange={(e) => updateActivity(index, 'description', e.target.value)}
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                              />
                            </div>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Preview</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{template.name}</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">{template.description}</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Duration</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{template.duration} days</dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Activities</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                        {template.activities.map((activity, index) => (
                          <li key={activity.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                            <div className="w-0 flex-1 flex items-center">
                              <span className="ml-2 flex-1 w-0 truncate">
                                Day {activity.day}: {activity.name} ({activity.startTime}, {activity.duration} min)
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the template data to your backend
    console.log('Submitting template:', template);
    // Reset form or redirect user after successful submission
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Training Template</h1>
        <form onSubmit={handleSubmit} className="space-y-8">
          {renderStep()}
          <div className="flex justify-between">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ChevronLeft className="mr-2 h-5 w-5" /> Previous
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Next <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Template
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}