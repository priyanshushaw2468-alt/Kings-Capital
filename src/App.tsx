/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Copy, Plus, ArrowRight, Loader2, PlayCircle, Image as ImageIcon, BookOpen, Upload, Check, History, Trash2, X } from "lucide-react";
import { generateScript } from "./lib/gemini";
import { motion } from "motion/react";

interface Chunk {
  id: string;
  topic: string;
  duration: number;
  module_1_youtube_metadata?: any;
  module_2_video_overview?: any; 
  module_3_full_production_script?: any[]; 
  // Fallbacks for older structure
  video_overview?: any; 
  full_production_script?: any[]; 
  topic_analysis?: any;
  current_part?: string;
  voiceover_script?: any[];
  image_prompts?: any[];
}

interface ImageData {
  base64Data: string;
  mimeType: string;
  preview: string;
  name: string;
}

export default function App() {
  const [topic, setTopic] = useState(() => localStorage.getItem("kc_topic") || "");
  const [character, setCharacter] = useState(() => localStorage.getItem("kc_character") || "A playful cartoon lion in a blue suit with a polka dot tie and yellow pocket square");
  const [duration, setDuration] = useState(() => Number(localStorage.getItem("kc_duration")) || 5);
  const [images, setImages] = useState<ImageData[]>([]);
  
  const [chunks, setChunks] = useState<Chunk[]>(() => {
    const saved = localStorage.getItem("kc_chunks");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeChunkId, setActiveChunkId] = useState<string | null>(() => {
    return localStorage.getItem("kc_active_chunk");
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"combined" | "voiceover" | "images">("combined");
  const [copied, setCopied] = useState<"none" | "voiceover" | "images">("none");

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => localStorage.setItem("kc_topic", topic), [topic]);
  useEffect(() => localStorage.setItem("kc_character", character), [character]);
  useEffect(() => localStorage.setItem("kc_duration", duration.toString()), [duration]);
  useEffect(() => localStorage.setItem("kc_chunks", JSON.stringify(chunks)), [chunks]);
  useEffect(() => {
    if (activeChunkId) localStorage.setItem("kc_active_chunk", activeChunkId);
    else localStorage.removeItem("kc_active_chunk");
  }, [activeChunkId]);

  const activeChunk = chunks.find(c => c.id === activeChunkId) || chunks[chunks.length - 1];
  const scriptData = activeChunk;
  const hasData = !!scriptData;
  const scriptItems = scriptData?.module_3_full_production_script || scriptData?.full_production_script || scriptData?.voiceover_script || [];

  const copyToClipboard = (type: "voiceover" | "images") => {
    if (!scriptData) return;
    let text = "";
    if (type === "voiceover") {
      text = scriptItems.map((s: any) => `${s.scene_number}. ${s.voiceover_text || s.text}`).join('\n\n') || "";
    } else {
      text = scriptItems.map((s: any) => `${s.scene_number}. ${s.image_prompt || scriptData.image_prompts?.find((p:any) => p.scene_number === s.scene_number)?.prompt}`).join('\n\n') || "";
    }
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied("none"), 2000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const preview = reader.result as string;
          const base64Data = preview.split(",")[1];
          if (base64Data) {
            setImages(prev => [...prev, {
              base64Data,
              mimeType: file.type,
              preview,
              name: file.name
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !duration) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateScript(topic, character, duration, images, chunks);
      const newChunk = { id: Date.now().toString(), topic, duration, ...data };
      setChunks(prev => [...prev, newChunk]);
      setActiveChunkId(newChunk.id);
    } catch (err: any) {
      setError(err.message || "Failed to generate script");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-zinc-950 font-sans flex flex-col items-center">
      <div className="w-full flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] mx-auto border-x border-zinc-200">
        
        {/* LEFT COLUMN: Input Form */}
        <div className="w-full lg:w-80 border-r border-zinc-200 bg-zinc-50 p-6 flex flex-col gap-6 shrink-0 h-[100vh] overflow-y-auto">
          <div className="mb-2">
            <h1 className="font-semibold text-lg tracking-tight text-zinc-950">
              King's Capital
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Script & Story Engine
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5 flex-1 flex flex-col">
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                Video Topic
              </label>
              <input
                type="text"
                required
                placeholder="e.g. How central banks create money..."
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-md text-sm focus:ring-1 focus:outline-none focus:ring-zinc-950 focus:border-zinc-950 transition-shadow placeholder:text-zinc-400 shadow-sm"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-700 block">
                  Anchor Images
                </label>
                <span className="text-[10px] text-zinc-400">Optional</span>
              </div>
              
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square border border-zinc-200 rounded-md overflow-hidden group shadow-sm bg-white">
                      <img src={img.preview} alt="upload" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveImage(i)} 
                        className="absolute top-1 right-1 bg-white/90 text-zinc-900 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer shadow-sm hover:bg-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div 
                className="relative border border-dashed border-zinc-300 bg-white hover:bg-zinc-50 text-center cursor-pointer overflow-hidden p-6 rounded-md flex items-center justify-center group transition-colors shadow-sm"
                onClick={() => document.getElementById('imageUpload')?.click()}
              >
                <input 
                   id="imageUpload" 
                   type="file" 
                   accept="image/*" 
                   multiple
                   className="hidden" 
                   onChange={handleImageChange} 
                />
                <div className="flex flex-col items-center text-zinc-500 group-hover:text-zinc-900 transition-colors">
                  <Upload className="w-5 h-5 mb-2 opacity-70" />
                  <span className="text-xs font-medium">{images.length > 0 ? "Add more images" : "Upload hero images"}</span>
                  <span className="text-[10px] mt-1 text-zinc-400">PNG, JPG, WEBP</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                Target Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-md text-sm focus:ring-1 focus:outline-none focus:ring-zinc-950 focus:border-zinc-950 transition-shadow shadow-sm"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-zinc-950 text-white rounded-md py-2.5 font-medium text-sm hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Script
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-xs border border-red-100 font-mono">
                Error: {error}
              </div>
            )}
            
            <div className="pt-2 border-b border-zinc-200 pb-6">
              <div className="p-3 bg-zinc-100/50 rounded-md border border-zinc-200">
                <p className="text-xs font-medium text-zinc-700">Pacing Rule</p>
                <p className="text-xs text-zinc-500 mt-0.5">Yields {duration * 12} scenes (1 every 5s).</p>
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-zinc-500 flex items-center gap-2">
                  <History className="w-3 h-3" />
                  History
                </h3>
                {chunks.length > 0 && (
                  <button 
                    type="button" 
                    onClick={(e) => {
                        e.preventDefault();
                        if (showClearConfirm) {
                           setChunks([]);
                           setActiveChunkId(null);
                           setShowClearConfirm(false);
                           localStorage.removeItem("kc_chunks");
                           localStorage.removeItem("kc_active_chunk");
                        } else {
                           setShowClearConfirm(true);
                           setTimeout(() => setShowClearConfirm(false), 3000);
                        }
                    }} 
                    className="text-[10px] text-red-600 hover:text-red-700 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> {showClearConfirm ? "Confirm?" : "Clear"}
                  </button>
                )}
              </div>
              
              {chunks.length === 0 ? (
                <p className="text-xs text-zinc-400">No generated scripts yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                  {chunks.map(chunk => (
                    <button 
                      key={chunk.id} 
                      type="button"
                      onClick={() => setActiveChunkId(chunk.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex justify-between items-center border ${activeChunkId === chunk.id ? 'bg-white border-zinc-300 shadow-sm font-medium text-zinc-950' : 'bg-transparent border-transparent hover:bg-zinc-200/50 text-zinc-600'}`}
                    >
                      <span className="truncate pr-3">{chunk.topic || chunk.current_part || 'Full Script'}</span>
                      <span className="text-xs opacity-60 font-mono shrink-0">{(chunk.full_production_script?.length || chunk.voiceover_script?.length || 0)}s</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Output display */}
        <div className="flex-1 overflow-y-auto bg-white h-[100vh] flex flex-col relative">
          {hasData ? (
             <div className="flex-1 flex flex-col">
               
               {/* Top Analysis Panel */}
               <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-white p-8 border-b border-zinc-100 shrink-0">
                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Project Overview</h2>
                   <span className="px-2 py-1 bg-zinc-100 rounded-md text-[10px] font-medium text-zinc-600 mr-2 flex items-center gap-1">
                     <Check className="w-3 h-3" /> Completed
                   </span>
                 </div>
                 
                 {scriptData.module_2_video_overview || scriptData.module_1_youtube_metadata ? (
                   <div className="grid lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 space-y-6">
                       <p className="text-2xl font-serif text-zinc-950 leading-snug tracking-tight">"{scriptData.module_2_video_overview?.story_vibe || scriptData.video_overview?.story_vibe || 'Story Blueprint'}"</p>
                       <p className="text-[15px] font-medium text-zinc-600 leading-relaxed max-w-prose border-l border-zinc-200 pl-4 py-1">
                          {scriptData.module_2_video_overview?.topic_summary || scriptData.video_overview?.topic_summary}
                       </p>
                       
                       {scriptData.module_2_video_overview?.narrative_blueprint && (
                         <div className="space-y-4 pt-4 border-t border-zinc-100">
                           <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Narrative Arc</h3>
                           <div className="space-y-3">
                             <div>
                               <span className="text-[10px] font-mono font-medium text-zinc-400 mr-2">01 HOOK</span>
                               <span className="text-sm text-zinc-800">{scriptData.module_2_video_overview.narrative_blueprint.act_1_hook}</span>
                             </div>
                             <div>
                               <span className="text-[10px] font-mono font-medium text-zinc-400 mr-2">02 STRG</span>
                               <span className="text-sm text-zinc-800">{scriptData.module_2_video_overview.narrative_blueprint.act_2_struggle}</span>
                             </div>
                             <div>
                               <span className="text-[10px] font-mono font-medium text-zinc-400 mr-2">03 VCTR</span>
                               <span className="text-sm text-zinc-800">{scriptData.module_2_video_overview.narrative_blueprint.act_3_victory}</span>
                             </div>
                           </div>
                         </div>
                       )}

                       {scriptData.module_1_youtube_metadata && (
                         <div className="pt-6 border-t border-zinc-100 mt-6 max-w-4xl">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">Metadata & Content Context</h3>
                            <div className="grid xl:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <div className="text-[10px] uppercase font-medium text-zinc-400 mb-2">Titles</div>
                                  <ul className="space-y-2.5">
                                    {scriptData.module_1_youtube_metadata.titles?.map((t:any, i:number) => (
                                      <li key={i} className="text-sm text-zinc-800 leading-snug">
                                        <span className="inline-block bg-zinc-100 text-zinc-600 text-[9px] px-1.5 py-0.5 rounded-sm uppercase font-semibold mr-2">{t.type}</span>
                                        {t.title}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <div className="text-[10px] uppercase font-medium text-zinc-400 mb-1">Thumbnail Overlay</div>
                                  <p className="text-xl font-bold font-sans text-zinc-950 uppercase tracking-tight">{scriptData.module_1_youtube_metadata.thumbnail_strategy?.text_overlay}</p>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase font-medium text-zinc-400 mb-1">Image Prompt</div>
                                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">{scriptData.module_1_youtube_metadata.thumbnail_strategy?.image_prompt}</p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-6">
                                <div className="text-[10px] uppercase font-medium text-zinc-400 mb-1">Description</div>
                                <p className="text-sm text-zinc-600 whitespace-pre-line mb-3">{scriptData.module_1_youtube_metadata.description_and_captions?.seo_description}</p>
                                <p className="text-xs text-blue-600">{scriptData.module_1_youtube_metadata.description_and_captions?.hashtags}</p>
                            </div>
                         </div>
                       )}
                     </div>
                     <div className="space-y-4 lg:col-span-1">
                       <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200">
                         <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Total Scenes</div>
                         <div className="text-4xl font-light tracking-tight text-zinc-950">{scriptData.module_2_video_overview?.total_scenes_calculated || scriptData.video_overview?.total_scenes_calculated || 0}</div>
                       </div>
                       <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200">
                         <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Target Duration</div>
                         <div className="text-2xl font-light text-zinc-900">{scriptData.module_2_video_overview?.target_duration || scriptData.video_overview?.target_duration || 0} mins</div>
                       </div>
                     </div>
                   </div>
                 ) : scriptData.video_overview ? (
                   <div className="grid lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 space-y-6">
                       <p className="text-2xl font-serif text-zinc-950 leading-snug">"{scriptData.video_overview.story_vibe}"</p>
                       <p className="text-base text-zinc-600 leading-relaxed border-l border-zinc-200 pl-4 py-1">
                          {scriptData.video_overview.topic_summary}
                       </p>
                       {scriptData.video_overview.central_analogy && (
                         <div className="pt-2">
                           <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Central Analogy</div>
                           <p className="text-sm text-zinc-800">{scriptData.video_overview.central_analogy}</p>
                         </div>
                       )}
                       {scriptData.video_overview.character_anchor && (
                         <div className="pt-2">
                           <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Character Anchor</div>
                           <p className="text-xs text-zinc-500 leading-relaxed">{scriptData.video_overview.character_anchor}</p>
                         </div>
                       )}
                     </div>
                     <div className="space-y-6">
                       <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200">
                         <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Calculated Scenes</div>
                         <div className="text-4xl font-light tracking-tight text-zinc-950">{scriptData.video_overview.total_scenes_calculated}</div>
                       </div>
                       <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200">
                         <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Target Duration</div>
                         <div className="text-2xl font-light text-zinc-900">{scriptData.video_overview.target_duration} mins</div>
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="grid lg:grid-cols-3 gap-6">
                     <div className="lg:col-span-2">
                       <p className="text-xl font-serif text-zinc-900 leading-snug">"{scriptData.topic_analysis?.story_angle || "Story angle not provided."}"</p>
                     </div>
                     
                     <div className="space-y-2">
                       <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Key Takeaways</div>
                       <ul className="space-y-2">
                         {scriptData.topic_analysis?.key_takeaways?.map((point: string, i: number) => (
                           <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                             <span className="text-zinc-300 mt-0.5">•</span>
                             <span>{point}</span>
                           </li>
                         )) || <li className="text-sm text-zinc-400 italic">None generated.</li>}
                       </ul>
                     </div>
                   </div>
                 )}
               </motion.div>
               
               {/* Sticky Header for Script */}
               <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md flex items-center justify-between px-8 py-3 border-b border-zinc-100 shadow-sm">
                 <div className="flex items-center gap-3">
                   <h2 className="text-sm font-semibold text-zinc-900">Script Sequence</h2>
                   <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">{scriptItems.length} SCENES</span>
                 </div>
                 <div className="flex bg-zinc-100 p-1 rounded-lg">
                    <button onClick={()=>setViewMode('combined')} className={`text-xs font-medium px-4 py-1.5 rounded-md transition-all ${viewMode==='combined' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>Combined</button>
                    <button onClick={()=>setViewMode('voiceover')} className={`text-xs font-medium px-4 py-1.5 rounded-md transition-all ${viewMode==='voiceover' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>Voiceover</button>
                    <button onClick={()=>setViewMode('images')} className={`text-xs font-medium px-4 py-1.5 rounded-md transition-all ${viewMode==='images' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>Visuals</button>
                 </div>
               </div>

               {/* Script Flow */}
               <div className="flex-1 p-8 bg-zinc-50/50">
                 {viewMode === 'combined' && (
                   <div className="max-w-5xl mx-auto space-y-4">
                     <div className="flex justify-end gap-4 mb-2">
                       <button onClick={() => copyToClipboard('voiceover')} className="text-[10px] flex items-center gap-1.5 font-semibold uppercase text-zinc-500 hover:text-zinc-900 transition-colors">
                          {copied === 'voiceover' ? <Check className="w-3.5 h-3.5 text-green-500"/> : <Copy className="w-3.5 h-3.5"/>} Copy Voiceovers
                       </button>
                       <button onClick={() => copyToClipboard('images')} className="text-[10px] flex items-center gap-1.5 font-semibold uppercase text-zinc-500 hover:text-zinc-900 transition-colors">
                          {copied === 'images' ? <Check className="w-3.5 h-3.5 text-green-500"/> : <Copy className="w-3.5 h-3.5"/>} Copy Prompts
                       </button>
                     </div>
                     {scriptItems.length > 0 ? scriptItems.map((scene: any, i: number) => {
                       const imagePrompt = scene.image_prompt || scriptData.image_prompts?.find((p: any) => p.scene_number === scene.scene_number)?.prompt;
                       return (
                         <motion.div 
                           initial={{opacity: 0, y: 5}} 
                           animate={{opacity: 1, y: 0}}
                           transition={{delay: Math.min(i * 0.02, 0.5)}}
                           key={i} 
                           className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 transition-all shadow-sm group"
                         >
                           <div className="flex items-center gap-3 mb-4">
                             <div className="font-mono text-[10px] text-zinc-500 font-bold bg-zinc-100 px-2 py-0.5 rounded-md">SCENE <span className="text-zinc-900">{String(scene.scene_number).padStart(2, '0')}</span></div>
                             <div className="font-mono text-[10px] font-semibold text-zinc-400">{scene.timestamp}</div>
                             {scene.section && (
                               <div className="font-mono text-[9px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-md ml-auto tracking-wider">{scene.section}</div>
                             )}
                           </div>
                           
                           <div className="grid md:grid-cols-2 gap-8">
                             <div className="flex gap-3">
                               <PlayCircle className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                               <p className="text-[15px] font-medium text-zinc-800 leading-relaxed">{scene.voiceover_text || scene.text}</p>
                             </div>

                             <div className="flex gap-3 relative">
                               <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-100 md:block hidden -ml-4"></div>
                               <ImageIcon className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                               <p className="text-[13px] text-zinc-500 leading-relaxed">
                                 {imagePrompt}
                               </p>
                             </div>
                           </div>
                         </motion.div>
                       )
                     }) : (
                       <div className="text-center p-12 bg-white border border-dashed border-zinc-200 rounded-xl shadow-sm">
                         <p className="text-sm text-zinc-500">No scenes were generated in this chunk. Please try again.</p>
                       </div>
                     )}
                   </div>
                 )}

                 {viewMode === 'voiceover' && (
                   <div className="max-w-3xl mx-auto space-y-4">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Voiceover Script</h3>
                        <button onClick={() => copyToClipboard('voiceover')} className="text-[10px] flex items-center gap-1.5 font-semibold uppercase bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm">
                           {copied === 'voiceover' ? <><Check className="w-3.5 h-3.5 text-green-500"/> Copied</> : <><Copy className="w-3.5 h-3.5"/> Copy Text</>}
                        </button>
                     </div>
                     <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-6">
                       {scriptItems.map((scene: any, i: number) => (
                          <div key={i} className="flex gap-4 group">
                              <div className="text-zinc-300 font-mono font-medium text-xs mt-1 w-6 text-right shrink-0">{scene.scene_number}.</div>
                              <div className="text-zinc-800 text-[15px] leading-relaxed group-hover:text-black transition-colors">{scene.voiceover_text || scene.text}</div>
                          </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {viewMode === 'images' && (
                   <div className="max-w-4xl mx-auto space-y-4">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Image Prompts</h3>
                        <button onClick={() => copyToClipboard('images')} className="text-[10px] flex items-center gap-1.5 font-semibold uppercase bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm">
                           {copied === 'images' ? <><Check className="w-3.5 h-3.5 text-green-500"/> Copied</> : <><Copy className="w-3.5 h-3.5"/> Copy Prompts</>}
                        </button>
                     </div>
                     <div className="space-y-3">
                       {scriptItems.map((s: any, i: number) => {
                          const pText = s.image_prompt || scriptData.image_prompts?.find((p: any) => p.scene_number === s.scene_number)?.prompt;
                          return (
                          <div key={i} className="bg-white p-5 rounded-xl border border-zinc-200 flex gap-4 hover:border-zinc-300 transition-all shadow-sm">
                              <div className="text-zinc-400 font-mono font-medium text-xs mt-1 w-6 text-right shrink-0">{s.scene_number}.</div>
                              <div className="text-zinc-600 text-[13px] leading-relaxed">{pText}</div>
                          </div>
                          );
                       })}
                     </div>
                   </div>
                 )}
               </div>

             </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-zinc-50 relative">
              <div className="text-center p-10 bg-white border border-zinc-200 rounded-2xl shadow-sm max-w-sm relative z-10">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-5 text-zinc-400 border border-zinc-200 shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Workspace Empty</h3>
                <p className="text-xs text-zinc-500 leading-relaxed block max-w-[200px] mx-auto">Fill out the project specifications on the left to generate your first script.</p>
              </div>
              <div className="absolute inset-0 border-[40px] border-white pointer-events-none opacity-50 hidden md:block"></div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
