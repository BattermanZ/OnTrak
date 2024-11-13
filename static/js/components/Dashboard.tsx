'use client'

import React, { useState, useEffect } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as ProgressPrimitive from '@radix-ui/react-progress'

// UI Components
const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`card ${className}`} {...props}>{children}</div>
)

const CardHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`card-header ${className}`} {...props}>{children}</div>
)

const CardTitle = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`card-title ${className}`} {...props}>{children}</h3>
)

const CardContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`card-content ${className}`} {...props}>{children}</div>
)

const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`btn ${className}`} {...props}>{children}</button>
)

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={`input ${className}`}
      ref={ref}
      {...props}
    />
  )
)

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={`progress ${className}`}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="progress-indicator"
      style={{ width: `${value}%` }}
    />
  </ProgressPrimitive.Root>
))

// Types
interface Template {
  id: number
  name: string
  duration: number
}

interface Session {
  id: number
  name: string
  current_day: number
  template_id: number
  day_started: boolean
}

interface Activity {
  id: number
  name: string
  description: string
  start_time: string
  duration: number
  completed: boolean
  actual_start_time?: string
  actual_end_time?: string
  actual_duration?: number
}

// Main Dashboard Component
export default function Dashboard() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [sessionName, setSessionName] = useState<string>('')
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null)
  const [nextActivity, setNextActivity] = useState<Activity | null>(null)
  const [dayActivities, setDayActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
    fetchSessions()
  }, [])

  useEffect(() => {
    if (currentSessionId) {
      updateSessionDetails(currentSessionId)
      const intervalId = setInterval(() => updateSessionDetails(currentSessionId), 60000) // Update every minute
      return () => clearInterval(intervalId)
    }
  }, [currentSessionId])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      if (!response.ok) throw new Error('Failed to fetch templates')
      const data = await response.json()
      setTemplates(Array.isArray(data) ? data : [data])
    } catch (err) {
      setError('Failed to load templates')
      console.error(err)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (!response.ok) throw new Error('Failed to fetch sessions')
      const data = await response.json()
      setSessions(data)
    } catch (err) {
      setError('Failed to load sessions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate || !sessionName) {
      setError('Please select a template and enter a session name')
      return
    }
    try {
      const formData = new FormData()
      formData.append('template_id', selectedTemplate)
      formData.append('session_name', sessionName)

      const response = await fetch('/start_session', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Failed to start session')
      const data = await response.json()
      if (data.success) {
        alert('Session started successfully!')
        fetchSessions()
        setSelectedTemplate('')
        setSessionName('')
      } else {
        throw new Error(data.message)
      }
    } catch (err) {
      setError('Failed to start session: ' + (err instanceof Error ? err.message : String(err)))
      console.error(err)
    }
  }

  const updateSessionDetails = async (sessionId: number) => {
    try {
      const response = await fetch(`/get_session_status/${sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch session status')
      const data = await response.json()
      setCurrentActivity(data.current_activity)
      setNextActivity(data.next_activity)
      setDayActivities(data.day_activities)
    } catch (err) {
      setError('Failed to update session details')
      console.error(err)
    }
  }

  const startDay = async (sessionId: number) => {
    try {
      const response = await fetch(`/start_day/${sessionId}`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to start day')
      const data = await response.json()
      if (data.success) {
        alert('Day started successfully!')
        updateSessionDetails(sessionId)
      } else {
        throw new Error(data.message)
      }
    } catch (err) {
      setError('Failed to start day')
      console.error(err)
    }
  }

  const endDay = async (sessionId: number) => {
    try {
      const response = await fetch(`/end_day/${sessionId}`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to end day')
      const data = await response.json()
      if (data.success) {
        alert('Day ended successfully!')
        fetchSessions()
        setCurrentSessionId(null)
        setCurrentActivity(null)
        setNextActivity(null)
        setDayActivities([])
      } else {
        throw new Error('Failed to end day')
      }
    } catch (err) {
      setError('Failed to end day')
      console.error(err)
    }
  }

  const moveToNextActivity = async () => {
    if (!currentSessionId) return
    try {
      const response = await fetch(`/move_to_next_activity/${currentSessionId}`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to move to next activity')
      const data = await response.json()
      if (data.success) {
        alert('Moved to next activity successfully!')
        updateSessionDetails(currentSessionId)
      } else {
        throw new Error(data.message)
      }
    } catch (err) {
      setError('Failed to move to next activity')
      console.error(err)
    }
  }

  const undoMove = async () => {
    if (!currentSessionId) return
    try {
      const response = await fetch(`/undo_move/${currentSessionId}`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to undo move')
      const data = await response.json()
      if (data.success) {
        alert('Undo successful!')
        updateSessionDetails(currentSessionId)
      } else {
        throw new Error(data.message)
      }
    } catch (err) {
      setError('Failed to undo move')
      console.error(err)
    }
  }

  const calculateProgressBarValue = () => {
    if (!currentActivity) return 0
    const now = new Date()
    const startTime = new Date(now.toDateString() + ' ' + (currentActivity.actual_start_time || currentActivity.start_time))
    const endTime = new Date(startTime.getTime() + currentActivity.duration * 60000)
    const totalDuration = currentActivity.duration * 60 // in seconds
    const elapsedTime = (now.getTime() - startTime.getTime()) / 1000 // in seconds
    const progressPercentage = (elapsedTime / totalDuration) * 100
    return Math.min(progressPercentage, 100)
  }

  const getProgressBarText = () => {
    if (!currentActivity) return ''
    const now = new Date()
    const startTime = new Date(now.toDateString() + ' ' + (currentActivity.actual_start_time || currentActivity.start_time))
    const endTime = new Date(startTime.getTime() + currentActivity.duration * 60000)
    const remainingTime = endTime.getTime() - now.getTime()
    if (remainingTime > 0) {
      return `${Math.ceil(remainingTime / 60000)} min remaining`
    } else {
      return `${Math.floor(-remainingTime / 60000)} min overtime`
    }
  }

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner"></div></div>
  }

  return (
    <div className="container">
      <h1 className="dashboard-title">OnTrak Dashboard</h1>
      {error && <div className="error-container"><div className="alert alert-danger" role="alert"><strong>Error:</strong> {error}</div></div>}

      <div className="dashboard-grid">
        <div className="main-content">
          <Card>
            <CardHeader>
              <CardTitle>Current Session Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {currentActivity ? (
                <>
                  <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-1000 ease-in-out"
                      style={{ width: `${calculateProgressBarValue()}%` }}
                    ></div>
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white font-bold">
                      {getProgressBarText()}
                    </div>
                  </div>
                  <div className="activity-grid mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-bold">{currentActivity.name}</p>
                        <p>Start: {currentActivity.actual_start_time || currentActivity.start_time}</p>
                        <p>Duration: {currentActivity.duration} minutes</p>
                        <div className="mt-4">
                          <Button onClick={moveToNextActivity} className="btn-primary mr-2">Move to Next Activity</Button>
                          <Button onClick={undoMove} className="btn-secondary">Undo</Button>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Next Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {nextActivity ? (
                          <>
                            <p className="font-bold">{nextActivity.name}</p>
                            <p>Start: {nextActivity.start_time}</p>
                            <p>Duration: {nextActivity.duration} minutes</p>
                          </>
                        ) : (
                          <p>No next activity</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <p>No active session selected</p>
              )}
            </CardContent>
          </Card>

          <Card className="day-schedule mt-4">
            <CardHeader>
              <CardTitle>Day Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="activity-list">
                {dayActivities.map((activity, index) => (
                  <li key={index} className={`activity-item p-2 ${activity.completed ? 'bg-gray-100' : ''} ${activity.name.toLowerCase().includes('break') ? 'bg-blue-100' : ''}`}>
                    <h3 className="activity-name font-bold">{activity.name}</h3>
                    <p>Planned: {activity.start_time} - {activity.duration} minutes</p>
                    {activity.actual_start_time && (
                      <p>Actual: {activity.actual_start_time} - {activity.actual_duration} minutes</p>
                    )}
                    <p>{activity.description || 'No description available'}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="sidebar">
          <Card>
            <CardHeader>
              <CardTitle>Start New Training</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={startSession}>
                <div className="form-group">
                  <div className="mb-4">
                    <label htmlFor="template-select" className="form-label block mb-2">Select Template</label>
                    <SelectPrimitive.Root value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectPrimitive.Trigger className="select-trigger w-full">
                        <SelectPrimitive.Value>
                          {templates.find(t => t.id.toString() === selectedTemplate)?.name || "Choose a template..."}
                        </SelectPrimitive.Value>
                      </SelectPrimitive.Trigger>
                      <SelectPrimitive.Portal>
                        <SelectPrimitive.Content className="select-content" position="popper">
                          <SelectPrimitive.Viewport>
                            {templates.map((template) => (
                              <SelectPrimitive.Item 
                                key={template.id} 
                                value={template.id.toString()} 
                                className="select-item"
                              >
                                <SelectPrimitive.ItemText>{template.name}</SelectPrimitive.ItemText>
                              </SelectPrimitive.Item>
                            ))}
                          </SelectPrimitive.Viewport>
                        </SelectPrimitive.Content>
                      </SelectPrimitive.Portal>
                    </SelectPrimitive.Root>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="session-name" className="form-label block mb-2">Session Name</label>
                    <Input
                      id="session-name"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <Button type="submit" className="w-full">Start Training</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="active-sessions mt-4">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="session-list">
                {sessions.map((session) => (
                  <Card key={session.id} className="mb-4">
                    <CardContent>
                      <h3 className="session-name font-bold">{session.name}</h3>
                      <p>Day {session.current_day} of {templates.find(t => t.id === session.template_id)?.duration || 'Unknown'}</p>
                      <div className="button-group mt-2">
                        <Button onClick={() => setCurrentSessionId(session.id)} className="mr-2">View</Button>
                        {!session.day_started && (
                          <Button onClick={() => startDay(session.id)} className="mr-2">Start Day</Button>
                        )}
                        <Button onClick={() => endDay(session.id)}>End Day</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}