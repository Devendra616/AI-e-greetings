
import React, { useState, useEffect } from 'react';
import { GeneratedCard, GreetingDetails } from '../types';
import { decodeBase64, decodeAudioData } from '../geminiService';

interface Props {
  card: GeneratedCard;
  details: GreetingDetails;
  onReset: () => void;
}

const CardView: React.FC<Props> = ({ card, details, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Helper to format YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  };

  const formattedDate = formatDate(details.date);

  useEffect(() => {
    if (card.audioBase64) {
      const initAudio = async () => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const bytes = decodeBase64(card.audioBase64!);
        const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
        setAudioBuffer(buffer);
      };
      initAudio();
    }
  }, [card.audioBase64]);

  const playAudio = () => {
    if (!audioBuffer) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    setIsPlaying(true);
    source.start(0);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMedia = async () => {
    setIsDownloading(true);
    try {
      if (card.videoUrl) {
        // Download Video
        const response = await fetch(card.videoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `greeting-${details.recipientName}-${details.occasion}.mp4`.toLowerCase().replace(/\s+/g, '-');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Download Image (Base64)
        const a = document.createElement('a');
        a.href = card.imageUrl;
        a.download = `greeting-${details.recipientName}-${details.occasion}.png`.toLowerCase().replace(/\s+/g, '-');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Something went wrong during the download. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const shareText = `Check out this bespoke greeting card for ${details.recipientName} for ${details.occasion}!`;
  const shareUrl = window.location.href;

  const shareLinks = [
    {
      name: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
        </svg>
      ),
      color: 'bg-[#1877F2]'
    },
    {
      name: 'X',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: 'bg-black'
    },
    {
      name: 'WhatsApp',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.675 1.438 5.662 1.439h.005c6.552 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      color: 'bg-[#25D366]'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 animate-fade-in printable-card-container overflow-visible">
      <div className="relative group perspective-2000 no-print" style={{ perspective: '2500px' }}>
        {/* 3D Transform Container */}
        <div 
          className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(244,63,94,0.4)] overflow-hidden border-[12px] border-white flex flex-col md:flex-row min-h-[700px] transition-transform duration-700 ease-out hover:rotate-y-0"
          style={{ 
            transform: 'rotateY(-12deg) rotateX(4deg) translateZ(0)',
            transformStyle: 'preserve-3d',
            boxShadow: '20px 40px 80px rgba(0,0,0,0.15), inset 0 0 100px rgba(244,63,94,0.05)'
          }}
        >
          {/* Visual Panel (Left) */}
          <div className="w-full md:w-1/2 relative bg-rose-50">
            {card.videoUrl ? (
              <video src={card.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={card.imageUrl} alt="Greeting Art" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex items-end p-12">
              <div className="text-white transform translate-z-20">
                <p className="text-sm font-black uppercase tracking-[0.3em] mb-3 text-rose-400 drop-shadow-md">{details.occasion}</p>
                <h2 className="text-5xl font-serif border-l-8 border-rose-500 pl-6 drop-shadow-lg tracking-tight">
                  {formattedDate}
                </h2>
              </div>
            </div>
          </div>

          {/* Text Panel (Right) */}
          <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-between bg-white relative">
            <div className="absolute top-10 right-10 opacity-[0.03] pointer-events-none">
               <svg className="w-64 h-64 text-rose-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>

            <div className="space-y-10 z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-rose-400 font-black uppercase tracking-[0.2em] mb-2">Especially for</p>
                  <h3 className="text-5xl font-serif text-stone-900 drop-shadow-sm">{details.recipientName}</h3>
                </div>
                {card.audioBase64 && (
                  <button
                    onClick={playAudio}
                    disabled={isPlaying}
                    className={`p-5 rounded-3xl transition-all ${isPlaying ? 'bg-rose-100 text-rose-400' : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white hover:scale-110 shadow-xl shadow-rose-200'}`}
                  >
                    <svg className={`w-8 h-8 ${isPlaying ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPlaying ? "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.586A2 2 0 007 16h3.172l3.592 3.592A1 1 0 0015 19V5a1 1 0 00-1.235-.97L10.172 7.628H7a2 2 0 00-1.414.586L5.586 15.586z" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"} />
                    </svg>
                  </button>
                )}
              </div>

              <div className="prose prose-xl prose-rose">
                <p className="text-stone-700 leading-relaxed font-normal italic text-2xl whitespace-pre-wrap bg-gradient-to-b from-stone-900 to-stone-500 bg-clip-text text-transparent">
                  {card.selectedMessage}
                </p>
              </div>

              <div className="pt-12 border-t-4 border-rose-50/50">
                <p className="text-rose-400 text-sm font-black uppercase tracking-[0.25em] mb-4">With immense love,</p>
                <p className="text-4xl font-serif bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">{details.senderName}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Subtle Shadow Floor for 3D effect */}
        <div className="absolute -bottom-10 left-10 right-10 h-10 bg-black/10 blur-3xl rounded-full scale-y-50"></div>
      </div>

      {/* Social Sharing Section (no-print) */}
      <div className="mt-16 flex flex-col items-center no-print">
        <p className="text-rose-400 text-xs font-black uppercase tracking-[0.3em] mb-6">Share this masterpiece</p>
        <div className="flex gap-4">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Share on ${link.name}`}
              className={`${link.color} text-white p-4 rounded-full shadow-lg hover:scale-110 hover:-translate-y-1 transition-all duration-300`}
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>

      {/* Flat Print Layout (Hidden on screen, shown on print) */}
      <div className="hidden print:flex flex-row h-screen w-full bg-white overflow-hidden">
        <div className="w-1/2 h-full">
           {card.videoUrl ? (
             <div className="h-full w-full bg-rose-50 flex items-center justify-center">
                <p className="text-stone-400 italic">Video Media - Download for full effect</p>
             </div>
           ) : (
             <img src={card.imageUrl} className="w-full h-full object-cover" alt="Art" />
           )}
        </div>
        <div className="w-1/2 h-full p-20 flex flex-col justify-center border-l border-stone-100">
           <p className="text-rose-400 uppercase tracking-widest font-bold mb-4">{details.occasion}</p>
           <h1 className="text-6xl font-serif text-stone-900 mb-10">{details.recipientName}</h1>
           <p className="text-2xl text-stone-700 font-serif italic mb-12">{card.selectedMessage}</p>
           <p className="text-3xl font-serif text-stone-900">From, {details.senderName}</p>
           <p className="mt-20 text-stone-300 font-bold">{formattedDate}</p>
        </div>
      </div>

      {/* Control Buttons (no-print) */}
      <div className="mt-12 flex flex-wrap gap-6 no-print justify-center items-center">
        <button
          onClick={handlePrint}
          className="px-8 py-5 border-2 border-rose-200 text-rose-600 rounded-[2rem] hover:bg-rose-50 transition font-black uppercase tracking-widest text-xs shadow-sm bg-white/50 backdrop-blur-sm"
        >
          Print PDF Masterpiece
        </button>
        
        <button
          onClick={handleDownloadMedia}
          disabled={isDownloading}
          className="px-8 py-5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-[2rem] hover:shadow-2xl transition font-black uppercase tracking-widest text-xs disabled:opacity-50 flex items-center gap-2"
        >
          {isDownloading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          )}
          Download {card.videoUrl ? 'MP4' : 'PNG'}
        </button>

        <button
          onClick={onReset}
          className="px-10 py-5 bg-stone-900 text-white rounded-[2rem] hover:bg-black transition font-black uppercase tracking-widest text-xs shadow-2xl"
        >
          Begin Anew
        </button>
      </div>
    </div>
  );
};

export default CardView;
