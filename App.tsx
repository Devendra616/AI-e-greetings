
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

  const handleGenerateBase = async (formData: GreetingDetails) => {
    setDetails(formData);
    setState(AppState.LOADING);
    setError(null);

    // Ensure we check for key if video is requested
    if (formData.includeVideo && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try { 
              await (window as any).aistudio.openSelectKey(); 
              // Proceed directly as per instructions (race condition mitigation)
            } catch (e) {
              console.warn("Key selection dialog issue", e);
            }
        }
    }

    try {
      const result = await generateCardData(formData);
      setCard(result);
      setState(AppState.SELECTING);
    } catch (err: any) {
      console.error("Generation Error Details:", err);
      
      const errorMessage = err?.message || JSON.stringify(err);
      
      // Determine the best user-friendly message based on typical Gemini API errors
      if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("404")) {
        setError("Bespoke Video generation requires a Paid Google Cloud Project. Please select an API key from a project with billing enabled at ai.google.dev/gemini-api/docs/billing.");
        // Reset key selection state by prompting again as per guidelines
        if ((window as any).aistudio) {
          try {
            await (window as any).aistudio.openSelectKey();
          } catch (e) {}
        }
      } else if (errorMessage.includes("401") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("unauthorized")) {
        setError("The selected API key appears to be invalid or unauthorized for this model. Please select a valid key.");
        if ((window as any).aistudio) await (window as any).aistudio.openSelectKey();
      } else if (errorMessage.includes("429") || errorMessage.includes("quota")) {
        setError("Generative studio is currently at capacity (Quota reached). Please try again in a few minutes.");
      } else {
        setError("Our creative engine encountered an unexpected hurdle. Please try again or refine your prompt.");
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
        console.error("Audio generation failed", e);
        // We don't fail the whole experience for audio, but we'll log it
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
          <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-100 text-rose-700 rounded-2xl text-center font-bold shadow-lg animate-fade-in max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-10 h-10 text-rose-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{error}</p>
              <button 
                onClick={handleReset}
                className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-full text-sm hover:bg-rose-700 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        {state === AppState.IDLE && (
          <div className="no-print">
            <FormView onSubmit={handleGenerateBase} isGenerating={false} />
          </div>
        )}

        {state === AppState.SELECTING && card && (
          <MessageSelector 
            options={card.messages} 
            onSelect={handleSelectMessage} 
          />
        )}

        {state === AppState.RESULT && card && details && card.selectedMessage && (
          <CardView card={card} details={details} onReset={handleReset} />
        )}
      </div>

      <footer className="mt-20 text-center no-print pb-10">
        <p className="text-rose-900/40 text-[10px] font-black tracking-[0.5em] uppercase mb-4">
          Artisanal E-Greetings &bull; Established 2024
        </p>
        <div className="h-1.5 w-32 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 mx-auto rounded-full opacity-30 shadow-lg"></div>
      </footer>
    </div>
  );
};

export default App;
