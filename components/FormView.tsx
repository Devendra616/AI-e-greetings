
import React, { useState, useEffect } from "react";
import { GreetingDetails } from "../types";

interface Props {
  onSubmit: (details: GreetingDetails) => void;
  isGenerating: boolean;
}

const FormView: React.FC<Props> = ({ onSubmit, isGenerating }) => {
  const [form, setForm] = useState<GreetingDetails>({
    recipientName: "",
    senderName: "",
    relationship: "",
    occasion: "",
    date: new Date().toISOString().split("T")[0],
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
    "w-full px-4 py-3 bg-white border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-300 focus:border-rose-400 outline-none transition text-stone-900 placeholder:text-stone-400 shadow-sm";

  const Tooltip = ({ text }: { text: string }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-stone-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 font-medium tracking-wide">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white/90 backdrop-blur-md shadow-2xl rounded-[2.5rem] animate-fade-in border border-white/50">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-serif bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500 bg-clip-text text-transparent mb-3">
          Bespoke Greetings
        </h1>
        <p className="text-stone-500 italic font-light">
          Crafting emotions into art, one card at a time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">
              Recipient Name
            </label>
            <input
              required
              name="recipientName"
              value={form.recipientName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Who is this for?"
            />
            <Tooltip text="The person you are honoring with this card." />
          </div>
          <div className="relative group">
            <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">
              Your Name
            </label>
            <input
              required
              name="senderName"
              value={form.senderName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="From whom?"
            />
            <Tooltip text="Your name as it should appear in the signature." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">
              Relationship
            </label>
            <select
              required
              name="relationship"
              value={form.relationship}
              onChange={handleChange}
              className={`${inputClasses} cursor-pointer`}
            >
              <option value="">Select Relation</option>
              <option value="Loved One">Loved One</option>
              <option value="Colleague">Colleague</option>
              <option value="Best Friend">Best Friend</option>
              <option value="Parent">Parent</option>
              <option value="Professional Contact">Professional Contact</option>
            </select>
            <Tooltip text="Helps our artist tailor the intimacy of the message." />
          </div>
          <div className="relative group">
            <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">
              Occasion
            </label>
            <input
              required
              name="occasion"
              value={form.occasion}
              onChange={handleChange}
              className={inputClasses}
              placeholder="e.g. Birthday, Promotion..."
            />
            <Tooltip text="The event being celebrated (e.g. Birthday, Wedding)." />
          </div>
        </div>

        <div className="relative group">
          <label className="block text-sm font-semibold text-rose-700 mb-1.5 ml-1">
            Personal Touch
          </label>
          <textarea
            name="additionalDetails"
            value={form.additionalDetails}
            onChange={handleChange}
            rows={3}
            className={inputClasses}
            placeholder="Share a memory or specific tone..."
          />
          <Tooltip text="Add specific memories or traits to make the card unique." />
        </div>

        <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 shadow-inner">
          <label className="block text-sm font-bold text-rose-800 mb-4 uppercase tracking-wider">
            Enhancements
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
                  className="cursor-pointer px-4 py-2 bg-white border border-rose-200 rounded-lg text-rose-700 hover:border-rose-400 hover:bg-rose-50 transition text-sm font-semibold shadow-sm"
                >
                  {preview ? "Change Photo" : "Add Photo Inspiration"}
                </label>
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-12 w-12 object-cover rounded-xl ring-2 ring-rose-300"
                  />
                )}
                <Tooltip text="Uses AI to reimagine this person in the card's artwork." />
              </div>

              <label className="flex items-center gap-3 text-rose-900 text-sm font-bold cursor-pointer hover:bg-white p-2 rounded-lg transition relative group">
                <input
                  type="checkbox"
                  name="includeAudio"
                  checked={form.includeAudio}
                  onChange={handleChange}
                  className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                />
                Voice Narration
                <Tooltip text="Adds a warm, AI-generated voice reading your message." />
              </label>

              <div className="relative group">
                <label className="flex items-center gap-3 text-rose-900 text-sm font-bold cursor-pointer hover:bg-white p-2 rounded-lg transition">
                  <input
                    type="checkbox"
                    name="includeVideo"
                    checked={form.includeVideo}
                    onChange={handleChange}
                    className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                  />
                  Cinematic Video
                  {!hasKeySelected && (
                    <span className="text-[8px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-700 border border-amber-200">PAID KEY REQ</span>
                  )}
                </label>
                <Tooltip text={hasKeySelected ? "Creates a living loop of the artwork." : "Requires Paid API Key Selection."} />
              </div>
            </div>
            
            {form.includeVideo && !hasKeySelected && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 leading-relaxed">
                Video generation requires a **Paid Google Cloud Project**. 
                <button 
                  type="button"
                  onClick={handleKeySelection}
                  className="mx-1 underline font-black hover:text-amber-900"
                >
                  Click here to select an authorized API Key
                </button>
                before generating.
              </div>
            )}
          </div>
        </div>

        <div className="relative group">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-5 bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:scale-100 shadow-xl"
          >
            {isGenerating ? "Envisioning..." : "Generate My Masterpiece"}
          </button>
          <Tooltip text="Synthsize all elements into your custom card." />
        </div>
      </form>
    </div>
  );
};

export default FormView;
