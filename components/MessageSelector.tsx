
import React from 'react';

interface Props {
  options: string[];
  onSelect: (message: string) => void;
}

const MessageSelector: React.FC<Props> = ({ options, onSelect }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in no-print">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-serif text-rose-900 mb-4">Choose the Perfect Sentiment</h2>
        <p className="text-stone-500 italic">Our artist has prepared three unique ways to express your feelings.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {options.map((msg, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(msg)}
            className="group relative h-full bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] border-2 border-transparent hover:border-rose-300 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left flex flex-col justify-between shadow-lg"
          >
            <div className="absolute top-4 right-4 text-xs font-bold text-rose-200 group-hover:text-rose-400 transition">
              Option 0{idx + 1}
            </div>
            <p className="text-stone-700 leading-relaxed font-light italic mb-8 line-clamp-[10]">
              "{msg}"
            </p>
            <div className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-center text-sm font-bold group-hover:bg-rose-500 group-hover:text-white transition">
              Select This Tone
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MessageSelector;
