
import React, { useState, useEffect } from 'react';
import { GreetingDetails } from '../types';

interface Props {
  onSubmit: (details: GreetingDetails) => void;
  isGenerating: boolean;
}

const FormView: React.FC<Props> = ({ onSubmit, isGenerating }) => {
  const [form, setForm] = useState<GreetingDetails>({
    recipientName: '',
    senderName: '',
    relationship: '',
    occasion: '',
    date: new Date().toISOString().split('T')[0],
    additionalDetails: '',
    includeAudio: false,
    includeVideo: false,
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [hasKeySelected, setHasKeySelected] = useState<boolean | null>(null);

  // Check key status on mount
  const checkKeyStatus = async () => {
    // Relying on the platform's injected window.aistudio object
    if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
      try {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKeySelected(selected);
      } catch (e) {
        console.debug("Project key status check deferred.");
      }
    }
  };

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const handleKeySelection = async () => {
    // Following strict guidelines: trigger the platform's native selection dialog
    if (typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
      try {
        await (window as any).aistudio.openSelectKey();
        // Rule: Assume success after triggering to mitigate race condition
        setHasKeySelected(true);
      } catch (e) {
        console.error("Platform selection dialog failed to open:", e);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const val = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    
    // Auto-trigger the platform dialog if video is enabled and no key is detected
    if (name === 'includeVideo' && val === true && !hasKeySelected) {
      handleKeySelection();
    }

    setForm(prev => ({ ...prev, [name]: val }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        setForm(prev => ({ ...prev, photoBase64: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputClasses = "w-full px-4 py-3 bg-white border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-300 focus:border-rose-400 outline-none transition text-stone-900 placeholder:text-stone-400 shadow-sm";

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white/90 backdrop-blur-md shadow-2xl rounded-[2.5rem] animate-fade-in border border-white/50">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-serif bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500 bg-clip-text text-transparent mb-3">Bespoke Greetings</h1>
        <p className="text-stone-500 italic font-light">Crafting emotions into art, one card at a time.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">Recipient Name</label>
            <input
              required
              name="recipientName"
              value={form.recipientName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Who is this for?"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">Your Name</label>
            <input
              required
              name="senderName"
              value={form.senderName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="From whom?"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">Relationship</label>
            <select
              required
              name="relationship"
              value={form.relationship}
              onChange={handleChange}
              className={`${inputClasses} cursor-pointer`}
            >
              <option value="" className="text-stone-400">Select Relation</option>
              <option value="Loved One" className="text-stone-900">Loved One</option>
              <option value="Colleague" className="text-stone-900">Colleague</option>
              <option value="Best Friend" className="text-stone-900">Best Friend</option>
              <option value="Parent" className="text-stone-900">Parent</option>
              <option value="Professional Contact" className="text-stone-900">Professional Contact</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">Occasion</label>
            <input
              required
              name="occasion"
              value={form.occasion}
              onChange={handleChange}
              className={inputClasses}
              placeholder="e.g. Birthday, Promotion..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">Special Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">Personal Touch</label>
          <textarea
            name="additionalDetails"
            value={form.additionalDetails}
            onChange={handleChange}
            rows={3}
            className={inputClasses}
            placeholder="Share a memory or a specific tone you'd like to convey..."
          />
        </div>

        <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 shadow-inner">
          <label className="block text-sm font-bold text-rose-800 mb-4 uppercase tracking-wider">Enhancements</label>
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer px-4 py-2 bg-white border border-rose-200 rounded-lg text-rose-700 hover:border-rose-400 hover:bg-rose-50 transition text-sm font-semibold shadow-sm"
                >
                  {preview ? 'Change Photo' : 'Add Photo Inspiration'}
                </label>
                {preview && (
                  <img src={preview} alt="Preview" className="h-12 w-12 object-cover rounded-xl ring-2 ring-rose-300" />
                )}
              </div>
              
              <label className="flex items-center gap-3 text-rose-900 text-sm font-bold cursor-pointer hover:bg-white p-2 rounded-lg transition">
                <input
                  type="checkbox"
                  name="includeAudio"
                  checked={form.includeAudio}
                  onChange={handleChange}
                  className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                />
                Voice Narration
              </label>
              
              <label className="flex items-center gap-3 text-rose-900 text-sm font-bold cursor-pointer hover:bg-white p-2 rounded-lg transition">
                <input
                  type="checkbox"
                  name="includeVideo"
                  checked={form.includeVideo}
                  onChange={handleChange}
                  className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                />
                <span>Cinematic Video</span>
              </label>
            </div>

            {form.includeVideo && (
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-2xl animate-fade-in shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                  <div className="bg-white p-3 rounded-full shadow-md relative">
                    <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-orange-900 mb-1">Veo Cinematic Generation</p>
                    <p className="text-xs text-orange-700 leading-relaxed">
                      Requires a <strong>Paid Google Cloud Project</strong>. You will be prompted to select your API key if not already configured.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-5 bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:scale-100 shadow-xl"
        >
          {isGenerating ? 'Envisioning...' : 'Generate My Masterpiece'}
        </button>
      </form>
    </div>
  );
};

// Fixed: Correctly export the component as default
export default FormView;
