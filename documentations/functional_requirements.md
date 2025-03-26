# OnTrak Application - Functional Requirements

This document outlines the core functionality of the OnTrak training management application. It serves as a reference for developers implementing these features in the new technology stack.

## 1. User Authentication & Management

### 1.1 Authentication
- **User Registration**: Allow new users to create accounts with email, password, and profile details
- **User Login**: Authenticate users with email and password
- **Password Reset**: Enable users to reset forgotten passwords
- **Session Management**: Create, validate, and expire user sessions
- **Token Refresh**: Automatically refresh authentication tokens

### 1.2 User Profile
- **View Profile**: Display user's personal information and settings
- **Edit Profile**: Allow users to update personal information
- **Change Password**: Permit users to update their password
- **Account Settings**: Configure user-specific application settings

### 1.3 Role-Based Access
- **Role Assignment**: Assign roles to users (Admin/Trainer)
- **Permission Validation**: Verify user permissions for specific actions
- **Role-Specific UI**: Display different interface options based on user role

## 2. Template Management

### 2.1 Training Templates
- **Create Template**: Define new training plans with activities and timing
- **Edit Template**: Modify existing training templates
- **Delete Template**: Remove templates from the system
- **Clone Template**: Create copies of existing templates for modification
- **Template Categories**: Organize templates into categories
- **Template Search**: Find templates by name, category, or tag

### 2.2 Activity Management
- **Add Activities**: Create activities within templates
- **Define Timing**: Set precise timing requirements for each activity
- **Order Activities**: Arrange activities in sequence
- **Activity Dependencies**: Set prerequisites between activities
- **Activity Descriptions**: Add detailed instructions for each activity
- **Activity Tags**: Label activities for categorization and filtering

## 3. Training Execution

### 3.1 Training Session Management
- **Start Training**: Initialize a training session from a template
- **End Training**: Complete and finalize a training session
- **Pause/Resume**: Temporarily halt and continue training sessions
- **Reset Training**: Restart a training session
- **Move Activity**: Change the order of activities during the training session

### 3.2 Activity Tracking
- **Start Activity**: Begin tracking time for a specific activity
- **Complete Activity**: Mark activities as finished
- **Track Timing**: Record actual timing versus planned timing
- **Activity Navigation**: Move between activities in sequence
- **Progress Indicators**: Display completion status for activities

### 3.3 Real-Time Tracking
- **Live Updates**: Provide real-time timing information
- **Status Indicators**: Show early/on-time/late status for activities
- **Next Activity Preview**: Display upcoming activities in the sequence
- **Time Alerts**: Notify when activities are approaching time limits

## 4. Performance Analytics

### 4.1 Individual Performance
- **Timing Analysis**: Measure adherence to scheduled activity times
- **Completion Rates**: Track percentage of completed activities
- **Performance Trends**: Show improvement or decline over time
- **Personal Statistics**: Provide user-specific performance data

### 4.2 Comparative Analytics
- **Trainer Comparison**: Compare performance metrics across trainers
- **Template Effectiveness**: Evaluate the success rates of different templates
- **Time Variance Reports**: Analyze early/on-time/late patterns
- **Activity Bottlenecks**: Identify consistently problematic activities

### 4.3 Reporting
- **Generate Reports**: Create standardized performance reports
- **Export Data**: Extract analytics in various formats (CSV, PDF)
- **Scheduled Reports**: Set up automatic report generation
- **Custom Metrics**: Define and track personalized performance indicators

## 5. Admin Functions

### 5.1 User Administration
- **User Directory**: View and search all system users
- **Create Users**: Add new users with specified roles
- **Edit User Details**: Modify user information and settings
- **Deactivate Users**: Temporarily disable user accounts
- **Delete Users**: Permanently remove users from the system

### 5.2 Location Management
- **Add Locations**: Create new training locations
- **Timezone Configuration**: Set location-specific time settings
- **Location Assignment**: Assign users to specific locations
- **Location-Based Reporting**: Filter analytics by location

## 6. System Management

### 6.1 Backup & Recovery
- **Automated Backups**: Schedule regular data backups
- **Backup Management**: View, create, and restore backups

## 7. System Diagrams

### 7.1 User Role & Permission Model

```mermaid
flowchart TD
    User[User]
    Admin[Admin Role]
    Trainer[Trainer Role]
    
    User -->|can be assigned| Admin
    User -->|can be assigned| Trainer
    
    subgraph "Admin Permissions"
    A1[Manage Users]
    A2[Manage Locations]
    A3[Manage Templates]
    A4[View All Analytics]
    A5[Manage Backups]
    end
    
    subgraph "Trainer Permissions"
    T1[Execute Training]
    T2[View Own Analytics]
    T3[Use Templates]
    T4[Update Profile]
    end
    
    Admin --- A1
    Admin --- A2
    Admin --- A3
    Admin --- A4
    Admin --- A5
    Admin --- T1
    Admin --- T2
    Admin --- T3
    Admin --- T4
    
    Trainer --- T1
    Trainer --- T2
    Trainer --- T3
    Trainer --- T4
```

### 7.2 Training Execution Flow

```mermaid
stateDiagram-v2
    [*] --> TemplateSelection
    TemplateSelection --> SessionInitialization
    SessionInitialization --> ActivityExecution
    
    state ActivityExecution {
        [*] --> CurrentActivity
        CurrentActivity --> ActivityCompleted: Complete
        ActivityCompleted --> NextActivity: Auto-advance
        NextActivity --> CurrentActivity
        CurrentActivity --> ActivityPaused: Pause
        ActivityPaused --> CurrentActivity: Resume
        CurrentActivity --> ActivityReordered: Move Activity
        ActivityReordered --> CurrentActivity
    }
    
    ActivityExecution --> SessionSummary: All Activities Complete
    SessionSummary --> [*]
```

### 7.3 Activity Timing States

```mermaid
stateDiagram-v2
    [*] --> NotStarted
    NotStarted --> InProgress: Start Activity
    InProgress --> Early: Complete before scheduled time
    InProgress --> OnTime: Complete within threshold
    InProgress --> Late: Complete after scheduled time
    Early --> [*]
    OnTime --> [*]
    Late --> [*]
```

### 7.4 Data Relationship Model

```mermaid
erDiagram
    USER {
        string id
        string email
        string password
        string firstName
        string lastName
        string role
        date createdAt
    }
    
    TEMPLATE {
        string id
        string name
        string description
        string category
        array tags
        string createdBy
        date createdAt
    }
    
    ACTIVITY {
        string id
        string name
        string description
        number duration
        number order
        array tags
    }
    
    TRAINING_SESSION {
        string id
        string templateId
        string trainerId
        date startTime
        date endTime
        string status
    }
    
    ACTIVITY_EXECUTION {
        string id
        string sessionId
        string activityId
        date plannedStartTime
        date actualStartTime
        date actualEndTime
        string status
    }
    
    LOCATION {
        string id
        string name
        string timezone
    }
    
    USER ||--o{ TEMPLATE : creates
    USER ||--o{ TRAINING_SESSION : executes
    USER }|--|| LOCATION : assigned_to
    TEMPLATE ||--o{ ACTIVITY : contains
    TEMPLATE ||--o{ TRAINING_SESSION : instantiates
    TRAINING_SESSION ||--o{ ACTIVITY_EXECUTION : tracks
    ACTIVITY ||--o{ ACTIVITY_EXECUTION : references
```

### 7.5 Performance Analytics Flow

```mermaid
flowchart TD
    RawData[Activity Execution Data]
    IndividualMetrics[Individual Performance Metrics]
    ComparativeMetrics[Comparative Analysis]
    Reports[Generated Reports]
    
    RawData --> ProcessData[Process Raw Data]
    ProcessData --> IndividualMetrics
    ProcessData --> ComparativeMetrics
    
    IndividualMetrics --> |Filter/Aggregate| Reports
    ComparativeMetrics --> |Filter/Aggregate| Reports
    
    subgraph "Individual Metrics"
    IM1[Timing Accuracy]
    IM2[Completion Rate]
    IM3[Performance Trends]
    end
    
    subgraph "Comparative Metrics"
    CM1[Trainer Comparisons]
    CM2[Template Effectiveness]
    CM3[Activity Bottlenecks]
    end
    
    IndividualMetrics --- IM1
    IndividualMetrics --- IM2
    IndividualMetrics --- IM3
    
    ComparativeMetrics --- CM1
    ComparativeMetrics --- CM2
    ComparativeMetrics --- CM3
```

## 8. Key User Journeys

### 8.1 User Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Login
    participant Auth
    participant Dashboard
    
    User->>Login: Access Application
    Login->>Auth: Check if First Time Setup
    alt No Users in System
        Auth->>Login: Redirect to First Time Setup
        Login->>User: Show First Time Setup Page
    else Users Exist
        Auth->>Login: Show Login Form
        User->>Login: Enter Credentials
        Login->>Auth: Submit Credentials
        Auth->>Login: Return Authentication Result
        alt Authentication Success
            Login->>Dashboard: Redirect to Dashboard
            Dashboard->>User: Show Dashboard
        else Authentication Failed
            Login->>User: Show Error Message
        end
    end
```

### 8.2 Template Management Journey

```mermaid
sequenceDiagram
    actor Admin
    participant Setup
    participant API
    participant DB
    
    Admin->>Setup: Navigate to Setup Page
    Setup->>API: Fetch Templates
    API->>DB: Query Templates
    DB->>API: Return Templates
    API->>Setup: Display Templates
    
    alt Create New Template
        Admin->>Setup: Click "Create Template"
        Setup->>Admin: Show Template Form
        Admin->>Setup: Fill Template Details
        Setup->>API: Submit Template Data
        API->>DB: Store Template
        DB->>API: Confirm Storage
        API->>Setup: Update Template List
    end
    
    alt Edit Template
        Admin->>Setup: Select Template
        Admin->>Setup: Click "Edit"
        Setup->>Admin: Show Edit Form
        Admin->>Setup: Modify Template
        Setup->>API: Submit Changes
        API->>DB: Update Template
        DB->>API: Confirm Update
        API->>Setup: Refresh Template List
    end
    
    alt Add Activities
        Admin->>Setup: Select Template
        Admin->>Setup: Click "Add Activity"
        Setup->>Admin: Show Activity Form
        Admin->>Setup: Enter Activity Details
        Setup->>Setup: Calculate End Time
        Setup->>Setup: Check for Conflicts
        alt No Conflicts
            Setup->>API: Submit Activity
            API->>DB: Store Activity
            DB->>API: Confirm Storage
            API->>Setup: Update Activities List
        else Conflicts Detected
            Setup->>Admin: Show Conflict Warning
        end
    end
    
    alt Clone Template
        Admin->>Setup: Select Template
        Admin->>Setup: Click "Clone"
        Setup->>API: Request Template Clone
        API->>DB: Create Template Copy
        DB->>API: Return New Template
        API->>Setup: Show Updated List
    end
    
    alt Export/Import Template
        Admin->>Setup: Select Template
        Admin->>Setup: Click "Export"
        Setup->>Admin: Download Template JSON
        
        Admin->>Setup: Click "Import"
        Setup->>Admin: Show Import Dialog
        Admin->>Setup: Upload Template File
        Setup->>API: Submit Template Data
        API->>DB: Store Template
        DB->>API: Confirm Storage
        API->>Setup: Update Template List
    end
```

### 8.3 Training Execution Journey

```mermaid
sequenceDiagram
    actor Trainer
    participant Dashboard
    participant API
    participant DB
    participant Socket
    
    Trainer->>Dashboard: Login & Access Dashboard
    Dashboard->>API: Check Current Schedule
    API->>DB: Query Active Schedule
    DB->>API: Return Schedule Data
    API->>Dashboard: Display Current Status
    
    alt No Active Schedule
        Trainer->>Dashboard: Click "Start Day"
        Dashboard->>Trainer: Show Template Selection
        Trainer->>Dashboard: Select Template & Day
        Dashboard->>API: Request Day Start
        API->>DB: Create Schedule Record
        DB->>API: Return New Schedule
        API->>Socket: Broadcast Schedule Update
        Socket->>Dashboard: Update UI
        Dashboard->>Trainer: Show Active Schedule
    end
    
    alt Active Schedule Management
        Dashboard->>Trainer: Display Current Activity
        
        alt Complete Activity
            Trainer->>Dashboard: Complete Current Activity
            Dashboard->>API: Mark Activity Complete
            API->>DB: Update Activity Status
            DB->>API: Return Updated Schedule
            API->>Socket: Broadcast Update
            Socket->>Dashboard: Move to Next Activity
        end
        
        alt Skip Activity
            Trainer->>Dashboard: Click "Skip"
            Dashboard->>API: Request Activity Skip
            API->>DB: Update Activity Status
            DB->>API: Return Updated Schedule
            API->>Socket: Broadcast Update
            Socket->>Dashboard: Display Next Activity
        end
        
        alt Go to Previous Activity
            Trainer->>Dashboard: Click "Back"
            Dashboard->>API: Request Previous Activity
            API->>DB: Update Activity Status
            DB->>API: Return Updated Schedule
            API->>Socket: Broadcast Update
            Socket->>Dashboard: Display Previous Activity
        end
        
        alt End Training Day
            Trainer->>Dashboard: Click "End Day"
            Dashboard->>Trainer: Confirm Action
            Trainer->>Dashboard: Confirm
            Dashboard->>API: Request Day Close
            API->>DB: Update Schedule Status
            DB->>API: Confirm Update
            API->>Socket: Broadcast Update
            Socket->>Dashboard: Reset Dashboard
        end
        
        alt Cancel Training Day
            Trainer->>Dashboard: Click "Cancel Day"
            Dashboard->>Trainer: Confirm Action
            Trainer->>Dashboard: Confirm
            Dashboard->>API: Request Day Cancel
            API->>DB: Delete/Mark Cancelled
            DB->>API: Confirm Update
            API->>Socket: Broadcast Update
            Socket->>Dashboard: Reset Dashboard
        end
    end
```

### 8.4 Analytics Review Journey

```mermaid
sequenceDiagram
    actor User
    participant Statistics
    participant API
    participant DB
    
    User->>Statistics: Navigate to Statistics Page
    Statistics->>API: Request Performance Data
    API->>DB: Query Training Records
    DB->>API: Return Training Data
    API->>Statistics: Return Processed Data
    
    alt View Individual Performance
        User->>Statistics: Select Personal Stats
        Statistics->>API: Request Personal Data
        API->>DB: Query User-specific Records
        DB->>API: Return User Data
        API->>Statistics: Display Personal Metrics
    end
    
    alt View Comparative Analytics
        User->>Statistics: Select Comparison View
        Statistics->>API: Request Comparison Data
        API->>DB: Query Multiple Users/Templates
        DB->>API: Return Comparison Data
        API->>Statistics: Display Comparison Charts
    end
    
    alt Generate Reports
        User->>Statistics: Request Report
        Statistics->>API: Generate Report
        API->>DB: Query Required Data
        DB->>API: Return Report Data
        API->>Statistics: Format Report
        Statistics->>User: Display/Download Report
    end
```