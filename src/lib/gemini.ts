import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateScript(
  topic: string,
  character: string,
  duration: number,
  images?: { base64Data: string, mimeType: string }[],
  previousContext?: any[]
) {
  let contextStr = '';
  if (previousContext && previousContext.length > 0) {
    const lastChunk = previousContext[previousContext.length - 1];
    if (lastChunk && lastChunk.full_production_script) {
      const lastScenes = lastChunk.full_production_script.slice(-5);
      contextStr = `\n(Note: If this is a continuation, here are your last scenes: \n${JSON.stringify(lastScenes)})`;
    }
  }

  const numberOfScenes = duration * 12;

  const prompt = `You are an elite YouTube Scriptwriter, Visual Director, and YouTube Growth Strategist for the whiteboard animation channel "King's Capital". Your goal is to provide a complete, ready-to-upload production package that explains complex business, finance, or mindset topics through highly engaging storytelling.

INPUT:
Topic: ${topic}
Target Duration: ${duration} mins
Uploaded Images: Analyze the uploaded images to capture character details, different angles, or expressions. Maintain strict consistency based on these references. If no images are provided, use this description: ${character}${contextStr}

PROCESS:
1. YOUTUBE GROWTH ENGINE: Generate 3 high-CTR titles (Curiosity, SEO, Clickbait), an SEO-optimized description with timestamps, and viral hashtags.
2. THUMBNAIL MASTERCLASS: Act as a pro graphic designer. Create a thumbnail prompt using the "Rule of Thirds", high contrast, expressive character emotions, and max 3 words of bold text. (AI image generators struggle with long text, so keep text short and suggest exact wording).
3. NARRATIVE BLUEPRINT: Build a 3-Act Story Arc (Hook -> Struggle -> Victory). Plan visual metaphors before writing scenes.
4. VISUAL METAPHOR RULE: Whiteboard animations thrive on metaphors. The action in the voiceover MUST perfectly match the action in the image prompt.
5. DURATION SCALING & PACING: Calculate scenes based on 1 scene per 5 seconds. (e.g., 10 mins = 120 scenes). YOU MUST GENERATE EXACTLY ${numberOfScenes} SCENES.
6. WORD COUNT SYNC: To ensure voiceover matches the 5-second visual, the "voiceover_text" MUST be exactly between 10 to 15 words per scene.
7. MULTI-IMAGE ANCHORING: Extract core art style and character features from uploaded images. Re-use exact consistent traits in every image prompt, adjusting ONLY pose/expression/props.

OUTPUT FORMAT (STRICTLY VALID JSON ONLY):
Organize the output into clear, user-friendly modules. A user should know exactly where to find scripts, thumbnails, or metadata without searching. Do NOT break it up in chunks, I expect the full video in one response.`;

  const parts: any[] = [{ text: prompt }];
  
  if (images && images.length > 0) {
    images.forEach(img => {
      if (img.base64Data && img.mimeType) {
        parts.push({
          inlineData: {
            data: img.base64Data,
            mimeType: img.mimeType
          }
        });
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { parts },
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          module_1_youtube_metadata: {
            type: Type.OBJECT,
            properties: {
              titles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    title: { type: Type.STRING }
                  },
                  required: ["type", "title"]
                }
              },
              thumbnail_strategy: {
                type: Type.OBJECT,
                properties: {
                  text_overlay: { type: Type.STRING },
                  image_prompt: { type: Type.STRING }
                },
                required: ["text_overlay", "image_prompt"]
              },
              description_and_captions: {
                type: Type.OBJECT,
                properties: {
                  seo_description: { type: Type.STRING },
                  hashtags: { type: Type.STRING }
                },
                required: ["seo_description", "hashtags"]
              }
            },
            required: ["titles", "thumbnail_strategy", "description_and_captions"]
          },
          module_2_video_overview: {
            type: Type.OBJECT,
            properties: {
              topic_summary: { type: Type.STRING },
              target_duration: { type: Type.STRING },
              total_scenes_calculated: { type: Type.STRING },
              narrative_blueprint: {
                type: Type.OBJECT,
                properties: {
                  act_1_hook: { type: Type.STRING },
                  act_2_struggle: { type: Type.STRING },
                  act_3_victory: { type: Type.STRING }
                },
                required: ["act_1_hook", "act_2_struggle", "act_3_victory"]
              }
            },
            required: ["topic_summary", "target_duration", "total_scenes_calculated", "narrative_blueprint"],
          },
          module_3_full_production_script: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene_number: { type: Type.NUMBER },
                timestamp: { type: Type.STRING },
                voiceover_text: { type: Type.STRING },
                image_prompt: { type: Type.STRING },
              },
              required: ["scene_number", "timestamp", "voiceover_text", "image_prompt"],
            },
          },
        },
        required: ["module_1_youtube_metadata", "module_2_video_overview", "module_3_full_production_script"],
      },
      systemInstruction: `You are a professional scriptwriter. Generate exactly ${numberOfScenes} scenes for a ${duration} minute video. Output the full sequence start to finish.`,
    },
  });

  return JSON.parse(response.text || "{}");
}

