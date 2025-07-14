# MeshOS v3 - Agentic Personal Life Optimizer

> **"THE app"** - A comprehensive life optimization system that understands and structures all your data to help you optimize health, career, finance, and personal growth.

## 🎯 Vision

MeshOS is designed to be **THE** life management application - one that grows and evolves with you. Instead of being just another productivity app, it's an intelligent system that:

- **Understands your data** across all life domains
- **Learns your patterns** and provides actionable insights  
- **Optimizes your decisions** using AI-powered analysis
- **Adapts to your goals** as they change over time

## 🧠 Core Philosophy

**"Dump data, get insights, optimize everything"**

Rather than forcing you into rigid structures, MeshOS lets you naturally input data in any format and uses AI to understand, structure, and optimize it.

## 🚀 Key Features

### 🗣️ Smart Data Dumping
- **Natural Language Input**: Just "yap" your data - "Spent ₹500 on cat food, worked out 45 mins, need to apply for visa"
- **AI-Powered Structuring**: Automatically categorizes and stores data in appropriate tables
- **Context-Aware Processing**: Understands your specific situation (university applications, streaming platform project, etc.)

### 🧠 Advanced Data Understanding
- **Comprehensive Analysis**: Analyzes data quality, patterns, and correlations across all life domains
- **Pattern Detection**: Identifies behavioral patterns, temporal cycles, and cross-domain relationships
- **Anomaly Detection**: Flags inconsistencies and data quality issues
- **Confidence Scoring**: Provides reliability metrics for all insights

### 📊 Life Domain Tracking

#### 🎯 Habits & Goals
- Loop Habits CSV import
- Habit completion tracking
- Goal progress monitoring
- Streak analysis

#### ❤️ Health & Wellness
- Huawei Band 9 data processing (via OCR/text input)
- Sleep, heart rate, stress, steps tracking
- Medication reminders (Bupropion, Melatonin)
- Workout logging
- Weight and body composition

#### 💰 Finance & Crypto
- Bank statement analysis and categorization
- Real-time crypto portfolio tracking
- Investment suggestions based on market analysis
- Expense pattern recognition
- Subscription tracking

#### 📋 Tasks & Projects
- Work task management
- University application tracking
- Visa process monitoring (yours + cat's)
- Streaming platform project progress
- Crypto trading bot development

#### 🎬 Content & Entertainment
- Serializd data analysis (400+ reviews, 490+ shows)
- Taste profile understanding
- Personalized recommendations
- Content goal tracking
- Viewing pattern analysis

### 🤖 AI-Powered Optimization
- **LangGraph Workflow**: Multi-step analysis and optimization process
- **Cross-Domain Insights**: Finds relationships between health, productivity, and mood
- **Personalized Recommendations**: Tailored suggestions based on your unique patterns
- **Proactive Optimization**: Suggests improvements before problems arise

## 🛠️ Tech Stack

- **Frontend**: Astro + TypeScript + Tailwind CSS
- **Backend**: Astro API Routes + Supabase
- **AI**: Google Gemini 1.5 Pro + LangGraph
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Data Processing**: Custom preprocessing and validation engines

## 📁 Project Structure

```
src/
├── components/
│   └── DataDumpInterface.tsx          # Smart data input interface
├── lib/
│   ├── intelligence/
│   │   ├── data-understanding-engine.ts    # Core data analysis
│   │   ├── data-preprocessor.ts           # Data cleaning & enrichment
│   │   └── meshos-ai-agent.ts            # Main AI agent
│   └── scripts/
│       └── data-validation-enrichment.ts  # Data quality tools
├── pages/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── smart-data-dump.ts        # Natural language data input
│   │   │   ├── data-understanding.ts     # Data analysis API
│   │   │   └── life-optimization.ts      # Main optimization endpoint
│   │   ├── crypto/
│   │   │   └── portfolio.ts              # Crypto tracking & suggestions
│   │   ├── health/
│   │   │   └── ocr-processor.ts          # Health data processing
│   │   └── content/
│   │       └── serializd-analyzer.ts     # Content taste analysis
│   ├── life-dashboard.astro              # Main dashboard
│   └── data-dump.astro                   # Data input interface
└── agentic-life-optimizer.ts            # Enhanced LangGraph workflow
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Google AI API key (Gemini)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rahullath/messyOS.git
   cd messyOS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up the database**
   - Run the SQL scripts in `database/` to create tables
   - Set up Row Level Security policies

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Visit the application**
   - Main dashboard: `http://localhost:4321/life-dashboard`
   - Data dump interface: `http://localhost:4321/data-dump`

## 📖 Usage Guide

### 1. Data Input Methods

#### Smart Data Dumping
Navigate to `/data-dump` and simply type your data naturally:
```
"Spent ₹500 on cat food, worked out 45 mins, need to apply for student visa, 
watched 2 episodes of Friends, bought 0.05 BTC, took morning bupropion"
```

#### Health Data Processing
Copy-paste your Huawei Health app data:
```
"Sleep: 7h 30min, Heart rate avg: 72 bpm, Stress: 25 Low, Steps: 8,547"
```

#### Content Analysis
Paste your Serializd export data for comprehensive taste analysis.

### 2. AI Optimization

Run the life optimizer to get personalized insights:
```bash
curl http://localhost:4321/api/ai/life-optimization
```

### 3. Data Quality Monitoring

Check your data quality score:
```bash
curl http://localhost:4321/api/ai/data-understanding?action=quality_check
```

## 🎯 Specific Use Cases

### University Applications
- Track application deadlines
- Monitor visa requirements
- Manage cat's visa documentation
- Financial planning for studies

### Streaming Platform Project
- Track development cycles
- Identify stopping patterns
- Monitor tech stack decisions
- Set realistic milestones

### Crypto Investment
- Portfolio tracking
- Market-based suggestions
- Risk management
- Passive income opportunities

### Health Optimization
- Medication adherence
- Sleep pattern analysis
- Stress correlation with productivity
- Fitness goal tracking

## 📊 Data Understanding Features

### Pattern Detection
- **Temporal Patterns**: Daily, weekly, monthly cycles
- **Behavioral Patterns**: Habit streaks, productivity cycles
- **Correlation Patterns**: Relationships between domains
- **Trend Analysis**: Improving/declining metrics

### Quality Metrics
- **Completeness**: How much expected data is present
- **Consistency**: Data consistency across time
- **Accuracy**: Realistic and valid data values
- **Timeliness**: How recent and up-to-date data is

### Cross-Domain Insights
- Sleep quality vs. productivity correlation
- Stress levels vs. spending patterns
- Exercise frequency vs. mood patterns
- Content consumption vs. work progress

## 🔧 API Endpoints

### Core APIs
- `POST /api/ai/smart-data-dump` - Natural language data input
- `GET /api/ai/life-optimization` - Run optimization analysis
- `GET /api/ai/data-understanding` - Data quality and insights

### Domain-Specific APIs
- `POST /api/health/ocr-processor` - Process health data
- `GET /api/crypto/portfolio` - Crypto portfolio tracking
- `POST /api/content/serializd-analyzer` - Content taste analysis

## 🎨 Design Philosophy

### Progressive Enhancement
Start simple, enhance gradually:
1. **Phase 1**: Manual data entry with AI structuring
2. **Phase 2**: Semi-automated data collection
3. **Phase 3**: Full automation where possible

### User-Centric Design
- **Natural Input**: Speak/type naturally, AI handles structure
- **Contextual Understanding**: System knows your specific situation
- **Adaptive Interface**: Evolves with your changing needs

### Data-Driven Optimization
- **Evidence-Based**: All suggestions backed by your actual data
- **Personalized**: Recommendations tailored to your patterns
- **Actionable**: Clear, specific steps you can take

## 🔮 Future Enhancements

### Short-term (1-3 months)
- [ ] Mobile app for easier data capture
- [ ] Automated bank statement import
- [ ] Enhanced crypto wallet integration
- [ ] Voice input for data dumping

### Medium-term (3-6 months)
- [ ] Predictive analytics for goal achievement
- [ ] Integration with more health devices
- [ ] Advanced content recommendation engine
- [ ] Automated habit tracking via phone sensors

### Long-term (6+ months)
- [ ] Multi-user support (if needed)
- [ ] Advanced ML models for pattern prediction
- [ ] Integration with external APIs (banking, fitness, etc.)
- [ ] Custom dashboard builder

## 🤝 Contributing

This is a personal project, but if you're interested in the approach or want to build something similar:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this as inspiration for your own life optimization system.

## 🙏 Acknowledgments

- **Inspiration**: The need for a truly comprehensive life management system
- **AI**: Google Gemini for powerful language understanding
- **Framework**: Astro for the perfect balance of simplicity and power
- **Database**: Supabase for seamless backend management

---

**"This is THE app"** - designed to grow with you, understand you, and help you optimize every aspect of your life. 🚀