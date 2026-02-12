-- UK Student Academic System Database Schema
-- Integrates with existing task management system

-- Create enum types for academic system
CREATE TYPE assignment_type AS ENUM ('essay', 'report', 'presentation', 'exam', 'coursework', 'project');
CREATE TYPE assignment_status AS ENUM ('not_started', 'in_progress', 'draft_complete', 'review', 'submitted', 'graded');
CREATE TYPE study_session_type AS ENUM ('reading', 'writing', 'research', 'revision', 'practice', 'group_study');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE session_type AS ENUM ('lecture', 'seminar', 'tutorial', 'lab', 'workshop');

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    credits INTEGER DEFAULT 0,
    semester VARCHAR(50),
    instructor VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, course_code)
);

-- Course schedules table (for regular class times)
CREATE TABLE IF NOT EXISTS course_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    session_type session_type NOT NULL DEFAULT 'lecture',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    assignment_type assignment_type NOT NULL,
    word_count INTEGER,
    current_word_count INTEGER DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    submission_date TIMESTAMP WITH TIME ZONE,
    status assignment_status DEFAULT 'not_started',
    priority urgency_level DEFAULT 'medium',
    estimated_hours DECIMAL(5,2) DEFAULT 0,
    actual_hours DECIMAL(5,2) DEFAULT 0,
    grade VARCHAR(10),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (current_word_count >= 0),
    CHECK (estimated_hours >= 0),
    CHECK (actual_hours >= 0),
    CHECK (word_count IS NULL OR word_count > 0),
    CHECK (deadline > created_at)
);

-- Study sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    course_code VARCHAR(20),
    session_type study_session_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    planned_duration INTEGER NOT NULL CHECK (planned_duration > 0), -- minutes
    actual_duration INTEGER CHECK (actual_duration >= 0),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 10),
    focus_rating INTEGER CHECK (focus_rating >= 1 AND focus_rating <= 10),
    notes TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

-- Assignment tasks breakdown (links to main tasks table)
CREATE TABLE IF NOT EXISTS assignment_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    word_count_target INTEGER,
    is_milestone BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(assignment_id, task_id)
);

-- Academic progress tracking
CREATE TABLE IF NOT EXISTS assignment_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    hours_spent DECIMAL(5,2) DEFAULT 0 CHECK (hours_spent >= 0),
    word_count_progress INTEGER DEFAULT 0 CHECK (word_count_progress >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(assignment_id, date)
);

-- Study session templates for common patterns
CREATE TABLE IF NOT EXISTS study_session_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    session_type study_session_type NOT NULL,
    default_duration INTEGER NOT NULL CHECK (default_duration > 0),
    description TEXT,
    preparation_checklist TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_user_deadline ON assignments(user_id, deadline);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_code);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_study_sessions_assignment ON study_sessions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_day ON course_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_assignment_progress_date ON assignment_progress(assignment_id, date);

-- Row Level Security (RLS) policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_session_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Users can view their own courses" ON courses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own courses" ON courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" ON courses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses" ON courses
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for course_schedules
CREATE POLICY "Users can view schedules for their courses" ON course_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = course_schedules.course_id 
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage schedules for their courses" ON course_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = course_schedules.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- RLS Policies for assignments
CREATE POLICY "Users can view their own assignments" ON assignments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assignments" ON assignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assignments" ON assignments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assignments" ON assignments
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_sessions
CREATE POLICY "Users can view their own study sessions" ON study_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions" ON study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions" ON study_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions" ON study_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for assignment_tasks
CREATE POLICY "Users can view assignment tasks for their assignments" ON assignment_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_tasks.assignment_id 
            AND assignments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage assignment tasks for their assignments" ON assignment_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_tasks.assignment_id 
            AND assignments.user_id = auth.uid()
        )
    );

-- RLS Policies for assignment_progress
CREATE POLICY "Users can view progress for their assignments" ON assignment_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_progress.assignment_id 
            AND assignments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage progress for their assignments" ON assignment_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_progress.assignment_id 
            AND assignments.user_id = auth.uid()
        )
    );

-- RLS Policies for study_session_templates
CREATE POLICY "Users can view their own study session templates" ON study_session_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own study session templates" ON study_session_templates
    FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_study_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_assignment_updated_at();

CREATE TRIGGER update_study_sessions_updated_at
    BEFORE UPDATE ON study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_study_session_updated_at();

-- Function to calculate assignment urgency
CREATE OR REPLACE FUNCTION calculate_assignment_urgency(deadline_date TIMESTAMP WITH TIME ZONE, completion_percentage DECIMAL)
RETURNS urgency_level AS $$
DECLARE
    days_remaining INTEGER;
    urgency urgency_level;
BEGIN
    days_remaining := EXTRACT(DAY FROM (deadline_date - NOW()));
    
    -- Critical: less than 2 days or overdue
    IF days_remaining < 2 THEN
        urgency := 'critical';
    -- High: less than 7 days and less than 50% complete
    ELSIF days_remaining < 7 AND completion_percentage < 50 THEN
        urgency := 'high';
    -- Medium: less than 14 days or less than 75% complete with more time
    ELSIF days_remaining < 14 OR (days_remaining < 21 AND completion_percentage < 75) THEN
        urgency := 'medium';
    -- Low: plenty of time
    ELSE
        urgency := 'low';
    END IF;
    
    RETURN urgency;
END;
$$ LANGUAGE plpgsql;

-- View for assignment dashboard
CREATE OR REPLACE VIEW assignment_dashboard AS
SELECT 
    a.*,
    c.course_name as full_course_name,
    COALESCE(ap.completion_percentage, 0) as current_completion_percentage,
    COALESCE(ap.hours_spent, 0) as total_hours_spent,
    EXTRACT(DAY FROM (a.deadline - NOW())) as days_remaining,
    calculate_assignment_urgency(a.deadline, COALESCE(ap.completion_percentage, 0)) as calculated_urgency,
    COUNT(at.task_id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks
FROM assignments a
LEFT JOIN courses c ON a.course_id = c.id
LEFT JOIN assignment_progress ap ON a.id = ap.assignment_id AND ap.date = CURRENT_DATE
LEFT JOIN assignment_tasks at ON a.id = at.assignment_id
LEFT JOIN tasks t ON at.task_id = t.id
GROUP BY a.id, c.course_name, ap.completion_percentage, ap.hours_spent;

-- Grant permissions
GRANT ALL ON courses TO authenticated;
GRANT ALL ON course_schedules TO authenticated;
GRANT ALL ON assignments TO authenticated;
GRANT ALL ON study_sessions TO authenticated;
GRANT ALL ON assignment_tasks TO authenticated;
GRANT ALL ON assignment_progress TO authenticated;
GRANT ALL ON study_session_templates TO authenticated;
GRANT SELECT ON assignment_dashboard TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;