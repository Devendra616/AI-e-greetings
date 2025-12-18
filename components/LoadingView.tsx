
import React, { useState, useEffect } from 'react';

const messages = [
  "Setting the scene for your story...",
  "Painting emotions onto canvas...",
  "Whispering words of warmth...",
  "Capturing the essence of your bond...",
  "Adding a touch of cinematic magic...",
  "Our Veo engine is crafting high-fidelity motion...",
  "Rendering your cinematic masterpiece (this may take a minute)...",
  "Almost there, finalizing the masterpiece..."
];

const LoadingView: React.FC = () => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [confetti, setConfetti] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 3500); // Slightly slower transition for more reading time

    const colors = ['#f43f5e', '#f97316', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7'];
    const newConfetti = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + 'vw',
      top: '-20px',
      delay: Math.random() * 5 + 's',
      duration: (Math.random() * 3 + 2) + 's',
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4 + 'px'
    }));
    setConfetti(newConfetti);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 z-[100] overflow-hidden">
      {/* Background Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="absolute rounded-full"
            style={{
              left: c.left,
              top: c.top,
              width: c.size,
              height: c.size,
              backgroundColor: c.color,
              animation: `confetti-fall ${c.duration} linear infinite`,
              animationDelay: c.delay
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-40 h-40 mb-12">
          <div className="absolute inset-0 border-[6px] border-rose-100 rounded-full"></div>
          <div className="absolute inset-0 border-[6px] border-rose-500 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-6 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl">
              <svg className="w-16 h-16 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
          </div>
        </div>

        <div className="text-center max-w-lg">
          <div className="min-h-[80px] flex items-center justify-center">
            <h2 className="text-3xl font-serif text-stone-900 mb-4 transition-all duration-700 ease-in-out">
              {messages[msgIndex]}
            </h2>
          </div>
          <div className="flex justify-center gap-1 mb-6">
             <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
             <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
             <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-stone-500 text-[10px] font-black tracking-[0.4em] uppercase">
            Artisanal studio in session
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingView;
