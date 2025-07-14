// Smart Data Dump Interface - Let Rahul "yap" his data
import React, { useState } from 'react';

interface DataDumpResult {
  success: boolean;
  parsed_data?: any;
  storage_results?: any;
  error?: string;
}

export default function DataDumpInterface() {
  const [dataDump, setDataDump] = useState('');
  const [context, setContext] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DataDumpResult | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const examples = [
    {
      title: "Daily Life Dump",
      text: "Spent ₹500 on cat food, worked out 45 mins, need to apply for student visa, watched 2 episodes of Friends, took bupropion morning dose, running low on protein powder"
    },
    {
      title: "Work & Crypto",
      text: "Worked 3 hours on streaming platform frontend, bought 0.05 BTC at ₹35L, need to fix authentication bug, applied to 2 more jobs, stressed about UK university deadlines"
    },
    {
      title: "Health & Habits",
      text: "Woke up at 6 AM, showered, slept 7 hours last night, heart rate avg 72, stress level high because of visa paperwork, drank 2L water, protein intake 120g"
    },
    {
      title: "Content & Tasks",
      text: "Finished watching The Office S3, rated it 9/10, loved the Jim-Pam storyline, need to watch more comedy series, also need to submit university application by Friday"
    }
  ];

  const quickContexts = [
    "Daily routine",
    "Work progress", 
    "Health tracking",
    "Finance update",
    "University applications",
    "Streaming platform project",
    "Crypto portfolio",
    "Content consumption"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataDump.trim()) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/smart-data-dump', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_dump: dataDump,
          context: context
        }),
      });

      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        setDataDump(''); // Clear on success
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to process data dump'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const useExample = (example: string) => {
    setDataDump(example);
    setShowExamples(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          🗣️ Smart Data Dump
        </h1>
        <p className="text-text-secondary">
          Just yap about your day and I'll structure it into your life OS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Context Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Context (optional)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {quickContexts.map((ctx) => (
              <button
                key={ctx}
                type="button"
                onClick={() => setContext(ctx)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  context === ctx
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-surface-secondary text-text-secondary border-border-primary hover:border-accent-primary'
                }`}
              >
                {ctx}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="What's this data about? (helps with better parsing)"
            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-surface-primary text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        </div>

        {/* Data Dump Textarea */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Data Dump
          </label>
          <textarea
            value={dataDump}
            onChange={(e) => setDataDump(e.target.value)}
            placeholder="Just start typing... 'Spent ₹500 on groceries, worked out 45 mins, need to apply for visa, watched Friends episode, bought 0.1 BTC, took morning meds...'"
            rows={6}
            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-surface-primary text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-text-muted">
              {dataDump.length} characters
            </span>
            <button
              type="button"
              onClick={() => setShowExamples(!showExamples)}
              className="text-sm text-accent-primary hover:text-accent-primary/80"
            >
              {showExamples ? 'Hide' : 'Show'} examples
            </button>
          </div>
        </div>

        {/* Examples */}
        {showExamples && (
          <div className="bg-surface-secondary rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-text-primary">Example Data Dumps:</h3>
            {examples.map((example, index) => (
              <div key={index} className="border border-border-primary rounded p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-text-primary text-sm">{example.title}</h4>
                  <button
                    type="button"
                    onClick={() => useExample(example.text)}
                    className="text-xs text-accent-primary hover:text-accent-primary/80"
                  >
                    Use this
                  </button>
                </div>
                <p className="text-sm text-text-secondary">{example.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!dataDump.trim() || isProcessing}
          className="w-full px-4 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing your data...
            </div>
          ) : (
            '🧠 Process Data Dump'
          )}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className={`rounded-lg p-4 ${
          result.success 
            ? 'bg-accent-success/10 border border-accent-success/20' 
            : 'bg-accent-error/10 border border-accent-error/20'
        }`}>
          {result.success ? (
            <div>
              <h3 className="font-medium text-accent-success mb-3 flex items-center">
                ✅ Data processed successfully!
              </h3>
              
              {result.storage_results && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {Object.entries(result.storage_results).map(([key, count]) => (
                    count > 0 && (
                      <div key={key} className="text-center">
                        <div className="text-2xl font-bold text-text-primary">{count as number}</div>
                        <div className="text-sm text-text-secondary capitalize">{key}</div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {result.parsed_data && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                    View parsed data
                  </summary>
                  <pre className="mt-2 p-3 bg-surface-primary rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.parsed_data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <div>
              <h3 className="font-medium text-accent-error mb-2 flex items-center">
                ❌ Processing failed
              </h3>
              <p className="text-text-secondary text-sm">{result.error}</p>
              
              {result.fallback_data && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                    View fallback extraction
                  </summary>
                  <pre className="mt-2 p-3 bg-surface-primary rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.fallback_data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="bg-surface-secondary rounded-lg p-4">
        <h3 className="font-medium text-text-primary mb-2">💡 Tips for better parsing:</h3>
        <ul className="text-sm text-text-secondary space-y-1">
          <li>• Be specific with amounts: "₹500" or "$20" instead of "some money"</li>
          <li>• Mention time durations: "45 mins workout" instead of "worked out"</li>
          <li>• Include context: "university visa application" vs just "application"</li>
          <li>• Use common names: "BTC" instead of "Bitcoin", "Friends" instead of "that sitcom"</li>
          <li>• Mention categories: "cat food" vs "food", "protein powder" vs "supplement"</li>
        </ul>
      </div>
    </div>
  );
}