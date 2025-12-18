
import React, { useState } from 'react';
import { AppState, GreetingDetails, GeneratedCard } from './types';
import FormView from './components/FormView';
import CardView from './components/CardView';
import LoadingView from './components/LoadingView';
import MessageSelector from './components/MessageSelector';
import { generateCardData, generateAudioForMessage } from './geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [details, setDetails] = useState<GreetingDetails | null>(null);
  const [card, setCard] = useState<GeneratedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth' | 'general'>('general');

  const handleGenerateBase = async (formData: GreetingDetails) => {
    setDetails(formData);
    setError(null);
    setErrorType('general');

    // Proactive check for Veo models which require a paid key
    if (formData.includeVideo && (window as any).aistudio) {
        try {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
          }
        } catch (e) {
          console.warn("Key status check failed", e);
        }
    }

    setState(AppState.LOADING);

    try {
      const result = await generateCardData(formData);
      setCard(result);
      setState(AppState.SELECTING);
    } catch (err: any) {
      console.error("Creative Synthesis Error:", err);
      const errorMessage = err?.message || JSON.stringify(err);
      
      // Categorize errors for better user guidance
      if (
        errorMessage.includes("unauthorized") || 
        errorMessage.includes("401") || 
        errorMessage.includes("403") ||
        errorMessage.includes("API_KEY_INVALID") ||
        errorMessage.includes("not found")
      ) {
        setErrorType('auth');
        setError("The selected API key is either invalid or does not belong to a Paid Google Cloud Project. Video generation (Veo) requires an authorized billing account.");
        
        // Guidelines: Prompt for key selection on auth error
        if ((window as any).aistudio?.openSelectKey) {
          try { await (window as any).aistudio.openSelectKey(); } catch (e) {}
        }
      } else if (errorMessage.includes("blocked by safety filters")) {
        setError(errorMessage);
        setErrorType('general');
      } else if (errorMessage.includes("429") || errorMessage.includes("quota")) {
        setError("Our creative studio is currently at maximum capacity. Please pause for a moment and try again.");
      } else {
        setError("An artist's block occurred: " + (err?.message || "Internal generation failure."));
      }
      
      setState(AppState.IDLE);
    }
  };

  const handleSelectMessage = async (message: string) => {
    if (!card || !details) return;
    
    const needsAudio = details.includeAudio;
    if (needsAudio) setState(AppState.LOADING);

    let audioBase64: string | undefined = undefined;
    if (needsAudio) {
      try {
        audioBase64 = await generateAudioForMessage(message);
      } catch (e: any) {
        console.error("Voice narration failed", e);
      }
    }

    setCard({ ...card, selectedMessage: message, audioBase64 });
    setState(AppState.RESULT);
  };

  const handleReset = () => {
    setCard(null);
    setDetails(null);
    setState(AppState.IDLE);
    setError(null);
  };

  return (
    <div className="min-h-screen py-12 px-4 selection:bg-rose-200 overflow-x-hidden">
      {state === AppState.LOADING && <LoadingView />}

      <div className="max-w-7xl mx-auto no-print">
        {error && (
          <div className="mb-8 p-10 bg-rose-50 border-2 border-rose-100 text-rose-700 rounded-[3rem] text-center shadow-2xl animate-fade-in max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-6">
              <div className="p-5 bg-rose-100 rounded-full">
                <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif text-stone-900">{errorType === 'auth' ? 'Authorization Required' : 'Creative Studio Error'}</h3>
              <p className="text-sm font-medium leading-relaxed max-w-md text-stone-600">{error}</p>
              
              {errorType === 'auth' && (
                <div className="mt-2 text-xs text-rose-500 border-t border-rose-200 pt-6 w-full">
                  <p className="mb-4">Video generation requires an API key from a project with **Billing Enabled**.</p>
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-white border-2 border-rose-200 rounded-full font-bold hover:bg-rose-50 transition shadow-sm text-rose-600"
                  >
                    Setup Gemini Billing
                  </a>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full justify-center">
                <button 
                  onClick={handleReset}
                  className="px-10 py-4 bg-rose-600 text-white rounded-full text-xs hover:bg-rose-700 transition font-black uppercase tracking-widest shadow-lg active:scale-95"
                >
                  Return to Studio
                </button>
                {errorType === 'auth' && (window as any).aistudio?.openSelectKey && (
                  <button 
                    onClick={() => (window as any).aistudio.openSelectKey()}
                    className="px-10 py-4 bg-stone-900 text-white rounded-full text-xs hover:bg-black transition font-black uppercase tracking-widest shadow-lg active:scale-95"
                  >
                    Select New API Key
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {state === AppState.IDLE && !error && (
          <FormView onSubmit={handleGenerateBase} isGenerating={false} />
        )}

        {state === AppState.SELECTING && card && (
          <MessageSelector 
            options={card.messages} 
            onSelect={handleSelectMessage} 
          />
        )}

        {state === AppState.RESULT && card && details && (
          <CardView 
            card={card} 
            details={details} 
            onReset={handleReset} 
          />
        )}
      </div>
    </div>
  );
};

export default App;
