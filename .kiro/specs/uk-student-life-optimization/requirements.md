# Requirements Document

## Introduction

Create a comprehensive UK Student Life Optimization module that addresses the specific challenges of being a student in Birmingham, UK. This system will integrate with existing MessyOS modules to provide intelligent planning for finances, food/groceries, travel optimization, routine rebuilding, and academic management. The focus is on practical, location-aware solutions that help maintain structure during challenging periods while optimizing for cost, time, and wellbeing.

## Requirements

### Requirement 1

**User Story:** As a Birmingham UK student, I want intelligent grocery and meal planning that considers my budget, available ingredients, cooking time constraints, and nearby stores, so that I can eat well without overspending or wasting food.

#### Acceptance Criteria

1. WHEN I input my current fridge/pantry inventory THEN the system SHALL suggest recipes based on available ingredients and cooking time constraints
2. WHEN I plan meals THEN the system SHALL categorize by time requirements (Breakfast: 10 mins, Lunch: depends on schedule, Dinner: flexible)
3. WHEN I create shopping lists THEN the system SHALL optimize for nearby stores (Aldi, Tesco, Premier/SPAR, Sainsbury's, University Superstore, GoPuff) based on cost and convenience
4. WHEN I plan bulk cooking THEN the system SHALL suggest meals that store well and calculate portions for multiple days
5. WHEN I track expenses THEN the system SHALL use OCR to process receipts and categorize spending by store and item type

### Requirement 2

**User Story:** As a student who travels between Five Ways (home), University, and Selly Oak (gym/stores), I want optimized travel planning that considers cost, time, weather, and energy levels, so that I can minimize the £2.05-2.10 daily train costs while staying on schedule.

#### Acceptance Criteria

1. WHEN I plan daily travel THEN the system SHALL recommend bike vs train based on weather, schedule urgency, and energy levels
2. WHEN I have classes in different buildings THEN the system SHALL calculate optimal routes considering campus size and elevation changes
3. WHEN trains are cancelled THEN the system SHALL provide alternative routing with real-time updates
4. WHEN I choose cycling THEN the system SHALL factor in 30+ minutes total time (travel + parking + lift access)
5. WHEN I plan gym visits THEN the system SHALL optimize travel method considering post-workout fatigue and shower needs

### Requirement 3

**User Story:** As a student managing multiple expenses without clear budgeting, I want comprehensive financial tracking and budgeting that categorizes all spending and provides monthly/weekly limits, so that I can avoid reckless spending and understand my true costs.

#### Acceptance Criteria

1. WHEN I connect my Monzo, iQ Prepaid, and ICICI UK accounts THEN the system SHALL automatically categorize transactions
2. WHEN I make purchases THEN the system SHALL track spending against weekly/monthly budgets with real-time alerts
3. WHEN I buy items like "fly spray for £3.49" THEN the system SHALL research typical prices and flag potential overpaying
4. WHEN I set up budgets THEN the system SHALL create spending pots for groceries, travel, utilities, entertainment, and emergency funds
5. WHEN I approach budget limits THEN the system SHALL suggest alternatives and show impact on monthly goals

### Requirement 4

**User Story:** As a student recovering from routine disruption and substance abuse, I want a structured daily planning system that rebuilds healthy habits while accommodating my class schedule, gym routine, and personal care needs, so that I can regain control and consistency.

#### Acceptance Criteria

1. WHEN I plan my day THEN the system SHALL create structured schedules that include wake time, meals, classes, gym, and personal care
2. WHEN I have 9am classes THEN the system SHALL adjust gym timing and suggest train travel to optimize energy and time
3. WHEN I plan morning routines THEN the system SHALL factor in skincare (Cetaphil cleanser, toner, snail mucin, moisturizer, sunscreen), hair care, and oral care timing
4. WHEN I track substance use THEN the system SHALL monitor vaping/smoking patterns and support reduction goals
5. WHEN I miss planned activities THEN the system SHALL provide gentle accountability and suggest recovery strategies

### Requirement 5

**User Story:** As a student with academic deadlines (EMH essay due 24/11, Corporate Finance due 8/12), I want intelligent assignment management that breaks down large tasks and schedules work sessions around my other commitments, so that I can catch up despite missing classes.

#### Acceptance Criteria

1. WHEN I input assignment details THEN the system SHALL break down 2000-word essays into manageable daily tasks
2. WHEN I have missed classes THEN the system SHALL prioritize catch-up activities and suggest efficient learning strategies
3. WHEN I schedule study sessions THEN the system SHALL find optimal time slots considering energy levels and other commitments
4. WHEN deadlines approach THEN the system SHALL increase urgency and suggest schedule adjustments
5. WHEN I complete study tasks THEN the system SHALL track progress and adjust remaining work estimates

### Requirement 6

**User Story:** As a student managing laundry costs (£6-7 per session) and timing (2+ hours), I want automated laundry scheduling that reminds me when to wash based on clothing availability and calendar optimization, so that I can minimize costs while staying clean.

#### Acceptance Criteria

1. WHEN I track clothing inventory THEN the system SHALL predict when laundry is needed based on underwear/gym clothes availability
2. WHEN I plan laundry THEN the system SHALL schedule 2+ hour blocks and remind me of washer/dryer timing
3. WHEN I have gym clothes THEN the system SHALL suggest hand-washing for reuse between full laundry sessions
4. WHEN I schedule laundry THEN the system SHALL consider my calendar and suggest optimal days to minimize disruption
5. WHEN laundry is running THEN the system SHALL send notifications for washer-to-dryer transfer and completion

### Requirement 7

**User Story:** As a student who wants to maintain consistent skincare and personal care routines, I want automated tracking and reminders that account for morning time constraints, so that I can stay consistent with self-care while managing busy schedules.

#### Acceptance Criteria

1. WHEN I plan morning routines THEN the system SHALL schedule skincare steps (cleanser, toner, essence, moisturizer, sunscreen) with realistic timing
2. WHEN I track hair care THEN the system SHALL remind me to wash every 2 days and suggest dry shampoo on off days
3. WHEN I plan oral care THEN the system SHALL ensure twice-daily floss, brush, tongue clean, and mouthwash sessions
4. WHEN I have early commitments THEN the system SHALL adjust routine timing and suggest which steps can be streamlined
5. WHEN I complete personal care THEN the system SHALL track consistency and celebrate maintenance streaks

### Requirement 8

**User Story:** As a student who wants to build things beyond life management software, I want project time management that balances personal development with academic requirements, so that I can pursue meaningful work while succeeding in my £40k course.

#### Acceptance Criteria

1. WHEN I plan development time THEN the system SHALL find realistic slots between academic commitments
2. WHEN I work on projects THEN the system SHALL track time spent and suggest sustainable pacing
3. WHEN academic pressure increases THEN the system SHALL help prioritize and potentially pause personal projects
4. WHEN I feel overwhelmed THEN the system SHALL provide perspective on progress and suggest break strategies
5. WHEN I complete project milestones THEN the system SHALL celebrate achievements and suggest next steps

### Requirement 9

**User Story:** As a student planning social events and leisure activities, I want entertainment scheduling that considers release dates, social opportunities, and work-life balance, so that I can maintain relationships and enjoyment while staying productive.

#### Acceptance Criteria

1. WHEN I plan leisure time THEN the system SHALL suggest activities based on available time slots and energy levels
2. WHEN new content releases THEN the system SHALL help me decide if/when to watch based on current priorities
3. WHEN I have social opportunities THEN the system SHALL help balance social needs with academic/personal goals
4. WHEN I plan entertainment THEN the system SHALL consider location, cost, and travel requirements
5. WHEN I track leisure activities THEN the system SHALL ensure I'm maintaining healthy work-life balance

### Requirement 10

**User Story:** As a student who wants to help my mom with her restaurant website project, I want project management that treats family obligations as important commitments while managing my own priorities, so that I can support family while maintaining my own progress.

#### Acceptance Criteria

1. WHEN I commit to family projects THEN the system SHALL schedule dedicated time blocks and track progress
2. WHEN I work on the restaurant website THEN the system SHALL break down tasks (orders, delivery, PetPooja integration, WhatsApp connection, payments)
3. WHEN family deadlines conflict with academic ones THEN the system SHALL help negotiate realistic timelines
4. WHEN I make progress on family projects THEN the system SHALL track contributions and suggest sustainable involvement levels
5. WHEN family projects become overwhelming THEN the system SHALL suggest boundaries and communication strategies

### Requirement 11

**User Story:** As a cost-conscious student, I want AI-powered optimization that considers my limited budget for AI services, so that I can get intelligent assistance only when it provides clear value and fits my financial constraints.

#### Acceptance Criteria

1. WHEN I use AI features THEN the system SHALL show upfront costs and let me approve before processing
2. WHEN I'm low on AI credits THEN the system SHALL suggest free alternatives and prioritize high-value AI usage
3. WHEN I need to choose AI services THEN the system SHALL recommend cost-effective options (Gemini vs Claude vs others)
4. WHEN AI provides recommendations THEN the system SHALL ensure they're actionable and worth the cost
5. WHEN I track AI spending THEN the system SHALL show ROI and help me optimize usage patterns

### Requirement 12

**User Story:** As a Birmingham UK student, I want location-aware features that integrate with local services, weather, and real-time information, so that my plans are practical and executable in my specific environment.

#### Acceptance Criteria

1. WHEN I plan outdoor activities THEN the system SHALL check Birmingham weather and suggest indoor alternatives if needed
2. WHEN I schedule grocery shopping THEN the system SHALL use real store locations and opening hours
3. WHEN I plan cycling THEN the system SHALL consider Birmingham bike routes, elevation, and safety
4. WHEN I use delivery services THEN the system SHALL integrate with local options (GoPuff, Deliveroo, Uber Eats, etc.)
5. WHEN I plan campus activities THEN the system SHALL use University of Birmingham specific locations and schedules