# MessyOS AI Agent Setup Guide

This guide will help you set up the AI agent "Mesh" for your messyOS system.

## Prerequisites

1. **Google Gemini API Key**: You need a Google AI Studio API key for the Gemini models
2. **Supabase Database**: Your existing Supabase setup
3. **LangChain Dependencies**: Already installed in your package.json

## Setup Steps

### 1. Environment Variables

Add your Gemini API key to your `.env` file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Database Schema

Run the AI agent database schema to create the necessary tables:

```bash
# If using Supabase CLI
supabase db reset

# Or manually run the SQL file in your Supabase dashboard
# Copy and paste the contents of database-ai-agent-schema.sql
```

### 3. Enable Vector Extension (Optional)

For semantic search capabilities, enable the vector extension in Supabase:

```sql
-- Run this in your Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `/ai-agent` in your browser

3. Try chatting with Mesh or generating a daily briefing

## Features

### 🤖 AI Agent "Mesh"

- **Personality**: Analytical, supportive, proactive, and data-driven
- **Capabilities**: 
  - Pattern recognition across all your data
  - Proactive optimization suggestions
  - Cross-domain insights (habits + health + finance)
  - Personalized coaching
  - Memory system for learning your preferences

### 💬 Chat Interface

- Natural conversation with your data
- Context-aware responses
- Actionable insights and recommendations
- Visual display of insights and actions

### 📊 Daily Briefing

- Personalized morning briefing
- Key insights from your data
- Today's focus and recommended actions
- Progress tracking

### 📈 Weekly Reports

- Comprehensive weekly analysis
- Achievement tracking
- Optimization opportunities
- Next week planning

### 🧠 Memory System

- Semantic search through past insights
- Learning from conversations
- Pattern recognition improvement over time
- Personalized recommendations

## API Endpoints

### Chat with AI Agent
```
POST /api/ai/chat
Body: { message: string, conversationHistory?: ConversationTurn[] }
```

### Daily Briefing
```
GET /api/ai/daily-briefing
```

### Weekly Report
```
GET /api/ai/weekly-report
```

## Database Tables

The AI agent uses these new tables:

- `agent_memories` - Stores AI insights and learnings
- `goals` - User life goals and milestones
- `agent_interventions` - Scheduled proactive actions
- `agent_insights` - Generated insights from data analysis
- `agent_actions` - Recommended actions for users
- `agent_conversations` - Chat history
- `user_ai_preferences` - User preferences for AI behavior
- `life_patterns` - Detected patterns in user behavior
- `risk_factors` - Identified risks and prevention strategies
- `optimizations` - Suggested optimizations and their status

## Customization

### Agent Personality

You can customize Mesh's personality in `meshos-ai-agent.ts`:

```typescript
this.agentPersonality = {
  name: "Mesh", // Change the agent's name
  traits: ["analytical", "supportive"], // Modify personality traits
  communicationStyle: "friendly but professional", // Adjust communication
  expertise: ["habit formation", "life optimization"], // Areas of expertise
  quirks: ["loves finding patterns"] // Unique characteristics
};
```

### User Preferences

Users can customize their AI experience through the `user_ai_preferences` table:

- Communication style (casual, formal, motivational, analytical)
- Notification frequency (minimal, moderate, frequent)
- Focus areas (habits, health, finance, etc.)
- Privacy level (open, selective, private)

## Troubleshooting

### Common Issues

1. **"Gemini API error"**
   - Check your API key is correct
   - Ensure you have credits/quota available
   - Verify the API key has the right permissions

2. **"Database connection error"**
   - Verify your Supabase credentials
   - Check if the AI agent tables exist
   - Ensure RLS policies are properly set

3. **"Memory/Vector search not working"**
   - Enable the vector extension in Supabase
   - Check if embeddings are being generated
   - Verify the vector column exists

4. **"Chat responses are generic"**
   - Ensure you have data in habits, metrics, etc.
   - Check if the user context is being gathered properly
   - Verify the analysis prompts are working

### Debug Mode

Enable debug logging by adding to your environment:

```bash
DEBUG_AI_AGENT=true
```

This will log detailed information about:
- Data gathering process
- AI analysis steps
- Memory storage and retrieval
- Pattern detection

## Next Steps

1. **Add More Data Sources**: Connect more of your life data for richer insights
2. **Customize Prompts**: Modify the AI prompts for your specific needs
3. **Add Automations**: Set up automated actions based on AI recommendations
4. **Extend Memory**: Add more sophisticated memory and learning capabilities
5. **Mobile Notifications**: Set up push notifications for AI insights

## Security Notes

- All AI agent data is protected by Row Level Security (RLS)
- Conversations and insights are private to each user
- API keys are server-side only
- Memory embeddings don't contain raw personal data

## Performance Tips

1. **Batch Operations**: The AI agent batches database operations for efficiency
2. **Caching**: Consider adding Redis for caching frequent insights
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Background Jobs**: Move heavy analysis to background jobs for better UX

## Support

If you encounter issues:

1. Check the browser console for errors
2. Review the server logs
3. Verify your environment variables
4. Test with minimal data first
5. Check the database for proper data structure

The AI agent is designed to learn and improve over time, so the more data you have, the better insights it can provide!