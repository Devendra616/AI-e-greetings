
import React, { useState, useEffect } from "react";
import { GreetingDetails } from "../types";

interface Props {
  onSubmit: (details: GreetingDetails) => void;
  isGenerating: boolean;
}

const FormView: React.FC<Props> = ({ onSubmit, isGenerating }) => {
  // Helper to get today's date in DD-MM-YYYY format
  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const [form, setForm] = useState<GreetingDetails>({
    recipientName: "",
    senderName: "",
    relationship: "",
    occasion: "",
    date: getTodayFormatted(),
    additionalDetails: "",
    includeAudio: false,
    includeVideo: false,
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [hasKeySelected, setHasKeySelected] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKeySelected(selected);
      }
    };
    checkKey();
  }, []);

  const handleKeySelection = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasKeySelected(true);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as HTMLInputElement;
    const name = target.name as keyof GreetingDetails;
    const val: any = target.type === "checkbox" ? target.checked : target.value;

    if (name === "includeVideo" && val === true && !hasKeySelected) {
      handleKeySelection();
    }

    setForm((prev) => ({ ...prev, [name]: val } as GreetingDetails));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        setForm((prev) => ({ ...prev, photoBase64: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputClasses =
    "w-full px-4 py-3 bg-white border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-300 focus:border-rose-400 outline-none transition text-stone-900 placeholder:text-stone-400 shadow-sm font-medium";

  const Tooltip = ({ text }: { text: string }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-stone-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 font-medium tracking-wide">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white/95 backdrop-blur-md shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[2.5rem] animate-fade-in border border-white/50">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-serif bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500 bg-clip-text text-transparent mb-3 font-black tracking-tight">
          Bespoke Greetings
        </h1>
        <p className="text-stone-500 italic font-light tracking-wide">
          Where timeless artistry meets modern sentiment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <label className="block text-xs font-black text-rose-800/60 uppercase tracking-widest mb-1.5 ml-1">
              Recipient Name
            </label>
            <input
              required
              name="recipientName"
              value={form.recipientName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Who are we honoring?"
            />
            <Tooltip text="The soul receiving this masterpiece." />
          </div>
          <div className="relative group">
            <label className="block text-xs font-black text-rose-800/60 uppercase tracking-widest mb-1.5 ml-1">
              Your Name
            </label>
            <input
              required
              name="senderName"
              value={form.senderName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="The creative sender"
            />
            <Tooltip text="Your name as it will appear in the elegant signature." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <label className="block text-xs font-black text-rose-800/60 uppercase tracking-widest mb-1.5 ml-1">
              The Connection
            </label>
            <select
              required
              name="relationship"
              value={form.relationship}
              onChange={handleChange}
              className={`${inputClasses} cursor-pointer`}
            >
              <option value="">Select Connection</option>
              <option value="Soulmate">Soulmate</option>
              <option value="Cherished Friend">Cherished Friend</option>
              <option value="Beloved Parent">Beloved Parent</option>
              <option value="Respected Mentor">Respected Mentor</option>
              <option value="Valued Partner">Valued Partner</option>
              <option value="Professional Ally">Professional Ally</option>
            </select>
            <Tooltip text="This helps our artist define the emotional depth." />
          </div>
          <div className="relative group">
            <label className="block text-xs font-black text-rose-800/60 uppercase tracking-widest mb-1.5 ml-1">
              Occasion
            </label>
            <input
              required
              name="occasion"
              value={form.occasion}
              onChange={handleChange}
              className={inputClasses}
              placeholder="e.g. 50th Anniversary"
            />
            <Tooltip text="The milestone we are commemorating." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <label className="block text-xs font-black text-rose-800/60 uppercase tracking-widest mb-1.5 ml-1">
              Commemoration Date
            </label>
            <input
              required
              type="text"
              name="date"
              value={form.date}
              onChange={handleChange}
              placeholder="DD-MM-YYYY"
              className={inputClasses}
            />
            <Tooltip text="Enter as DD-MM-YYYY for bespoke typesetting." />
          </div>
          <div className="hidden md:flex items-end pb-3">
             <span className="text-[9px] text-stone-400 font-black uppercase tracking-widest italic opacity-70">Format: DD-MM-YYYY</span>
          </div>
        </div>

        <div className="relative group">
          <label className="block text-xs font-black text-rose-800/60 uppercase tracking-widest mb-1.5 ml-1">
            Personal Narrative
          </label>
          <textarea
            name="additionalDetails"
            value={form.additionalDetails}
            onChange={handleChange}
            rows={3}
            className={`${inputClasses} resize-none`}
            placeholder="Share a trait, a memory, or a desired tone..."
          />
          <Tooltip text="Specific details lead to more profound results." />
        </div>

        <div className="bg-rose-50/40 p-6 rounded-[2rem] border border-rose-100 shadow-inner">
          <label className="block text-[10px] font-black text-rose-800/70 mb-4 uppercase tracking-[0.3em]">
            Artisanal Enhancements
          </label>
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3 relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer px-5 py-2.5 bg-white border border-rose-200 rounded-full text-rose-700 hover:border-rose-400 hover:bg-rose-50 transition text-xs font-bold shadow-sm"
                >
                  {preview ? "Change Inspiration" : "Upload Reference Art"}
                </label>
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-12 w-12 object-cover rounded-full ring-4 ring-white shadow-md"
                  />
                )}
                <Tooltip text="AI reimagines the subject with 'Identity Lock'." />
              </div>

              <label className="flex items-center gap-3 text-rose-900 text-xs font-black tracking-widest uppercase cursor-pointer hover:bg-white/50 p-2 rounded-xl transition relative group">
                <input
                  type="checkbox"
                  name="includeAudio"
                  checked={form.includeAudio}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                />
                Audio Portrait
                <Tooltip text="Adds a warm, narrative AI voiceover." />
              </label>

              <div className="relative group">
                <label className="flex items-center gap-3 text-rose-900 text-xs font-black tracking-widest uppercase cursor-pointer hover:bg-white/50 p-2 rounded-xl transition">
                  <input
                    type="checkbox"
                    name="includeVideo"
                    checked={form.includeVideo}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                  />
                  Cinematic Loop
                  {!hasKeySelected && (
                    <span className="text-[7px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-700 border border-amber-200 ml-1">KEY REQ</span>
                  )}
                </label>
                <Tooltip text={hasKeySelected ? "Creates a living loop of the art." : "Requires Paid API Key Selection."} />
              </div>
            </div>
            
            {form.includeVideo && !hasKeySelected && (
              <div className="p-4 bg-amber-50/80 border border-amber-100 rounded-2xl text-[10px] text-amber-900 leading-relaxed font-medium italic">
                Cinematic video requires a **Paid Google Cloud Project**. 
                <button 
                  type="button"
                  onClick={handleKeySelection}
                  className="mx-1 underline font-black hover:text-amber-700 decoration-amber-300 decoration-2 underline-offset-2"
                >
                  Select authorized API Key
                </button>
                to proceed.
              </div>
            )}
          </div>
        </div>

        <div className="relative group pt-4">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-6 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] hover:shadow-[0_20px_50px_-10px_rgba(244,63,94,0.4)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-500 disabled:opacity-50 disabled:scale-100 shadow-2xl text-xs"
          >
            {isGenerating ? "Synthesizing Masterpiece..." : "Generate Artisanal Greeting"}
          </button>
          <Tooltip text="Begin the creative AI rendering process." />
        </div>
      </form>
    </div>
  );
};

export default FormView;
