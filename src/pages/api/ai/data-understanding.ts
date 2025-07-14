// API endpoint for data understanding and quality analysis
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { generateDataUnderstandingReport, getDataInsights } from '../../../lib/intelligence/data-understanding-engine';
import { preprocessUserData } from '../../../lib/intelligence/data-preprocessor';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'full_report';
    
    // Get authenticated user
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🧠 Data understanding request: ${action} for user ${user.id}`);

    let result;

    switch (action) {
      case 'full_report':
        result = await generateDataUnderstandingReport(user.id);
        break;
        
      case 'insights':
        result = await getDataInsights(user.id);
        break;
        
      case 'preprocess':
        result = await preprocessUserData(user.id);
        break;
        
      case 'quality_check':
        const report = await generateDataUnderstandingReport(user.id);
        result = {
          quality_score: report.qualityReport.overall_score,
          completeness: report.qualityReport.completeness,
          consistency: report.qualityReport.consistency,
          accuracy: report.qualityReport.accuracy,
          timeliness: report.qualityReport.timeliness,
          recommendations: report.qualityReport.recommendations,
          data_sources: report.context.data_sources
        };
        break;
        
      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action. Use: full_report, insights, preprocess, or quality_check'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Data understanding API error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Data understanding analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { action, options = {} } = body;
    
    // Get authenticated user
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔄 Data understanding POST request: ${action} for user ${user.id}`);

    let result;

    switch (action) {
      case 'analyze_patterns':
        // Analyze specific patterns based on provided options
        const insights = await getDataInsights(user.id);
        result = {
          patterns: insights.patterns.filter(p => 
            !options.pattern_types || options.pattern_types.includes(p.type)
          ),
          correlations: insights.correlations.filter(c =>
            !options.domains || 
            options.domains.includes(c.domain_a) || 
            options.domains.includes(c.domain_b)
          )
        };
        break;
        
      case 'data_quality_improvement':
        // Get specific recommendations for data quality improvement
        const report = await generateDataUnderstandingReport(user.id);
        result = {
          current_score: report.qualityReport.overall_score,
          improvement_plan: report.qualityReport.recommendations,
          priority_actions: report.context.anomalies
            .filter(a => a.severity === 'high')
            .map(a => ({
              issue: a.description,
              action: a.suggested_action,
              domain: a.domain
            }))
        };
        break;
        
      case 'correlation_analysis':
        // Deep dive into correlations between specific domains
        const correlationData = await getDataInsights(user.id);
        result = {
          correlations: correlationData.correlations,
          strength_analysis: correlationData.correlations.map(c => ({
            relationship: `${c.domain_a} ↔ ${c.domain_b}`,
            strength: c.correlation_strength,
            significance: c.statistical_significance,
            actionable: c.correlation_strength > 0.6
          }))
        };
        break;
        
      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action. Use: analyze_patterns, data_quality_improvement, or correlation_analysis'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      options,
      result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Data understanding POST API error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Data understanding analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};