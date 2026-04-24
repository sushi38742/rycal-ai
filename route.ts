// ─────────────────────────────────────────────
// RyCal.AI — Food Image Analysis API Route
//
// Flow:
//   1. Receive 1–2 base64 images from the client
//   2. Gemini 1.5 Flash identifies the food and estimates nutrition
//   3. Nutritionix cross-references for verified database values (if configured)
//   4. Returns a FoodAnalysisResult with per-macro source strings
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Gemini prompt ─────────────────────────────

const GEMINI_PROMPT = `You are a precise nutrition analyst. Analyze the food in this image and return ONLY a valid JSON object — no markdown fences, no explanation, just raw JSON.

Identify the food as specifically as possible. Estimate the portion size based on what's visible (use common reference objects — plates, hands, packaging — to gauge size).

Return exactly this JSON structure:
{
  "foodName": "specific name (e.g. 'Grilled Chicken Breast' not just 'Chicken')",
  "brand": null,
  "servingDescription": "e.g. '1 medium breast (~170g)'",
  "isBranded": false,
  "confidence": "high",
  "calories": 284,
  "protein": 53,
  "carbs": 0,
  "fat": 6,
  "calorieSources": "USDA standard reference values for grilled chicken breast, ~170g portion",
  "proteinSources": "USDA standard reference values for chicken breast (skinless, grilled)",
  "carbsSources": "USDA standard reference values — negligible carbohydrates in plain grilled chicken",
  "fatSources": "USDA standard reference values for chicken breast, visible skin removed from estimate",
  "notes": ""
}

RULES — follow these exactly:
- isBranded = true ONLY when you can identify a specific packaged commercial product with a visible brand name
- If isBranded, set brand to the brand name; otherwise null
- confidence: "high" = very confident in food ID and nutrition | "medium" = reasonable ID, portion estimate uncertain | "low" = unclear or ambiguous food
- For unbranded / homemade food: err on the side of conservative (slightly under) estimates
- Source strings must explain WHERE each number came from. Use phrases like: "USDA standard reference values for [food]", "visual estimate based on [food] reference data", "Nutritionix common foods database for [food]"
- calories must approximately equal (protein × 4) + (carbs × 4) + (fat × 9)
- All macro values must be non-negative integers
- If multiple foods are visible, name the primary item and add others in the notes field
- If you truly cannot identify the food, set confidence to "low" and make your best conservative guess`;

// ── Main handler ──────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { images: string[] };
    const { images } = body;

    if (!images || images.length === 0) {
      return NextResponse.json({ success: false, error: 'No images provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured. Add it to .env.local.' },
        { status: 503 }
      );
    }

    // ── Step 1: Gemini vision analysis ───────────

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const imageParts = images.map((b64: string) => {
      // Strip data:image/...;base64, prefix if present
      const clean = b64.replace(/^data:image\/\w+;base64,/, '');
      return {
        inlineData: {
          data: clean,
          mimeType: 'image/jpeg' as const,
        },
      };
    });

    const geminiResult = await model.generateContent([GEMINI_PROMPT, ...imageParts]);
    const rawText = geminiResult.response.text().trim();

    // Strip markdown code fences if Gemini wraps output anyway
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let gemini: {
      foodName: string;
      brand: string | null;
      servingDescription: string;
      isBranded: boolean;
      confidence: 'high' | 'medium' | 'low';
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      calorieSources: string;
      proteinSources: string;
      carbsSources: string;
      fatSources: string;
      notes: string;
    };

    try {
      gemini = JSON.parse(jsonText);
    } catch {
      console.error('Gemini JSON parse failed. Raw:', rawText);
      return NextResponse.json(
        { success: false, error: 'Could not parse food analysis result. Try a clearer photo.' },
        { status: 422 }
      );
    }

    // ── Step 2: Nutritionix database lookup (optional) ──

    let nutritionixData: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      foodName: string;
      servingDescription: string;
    } | null = null;

    if (process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_API_KEY) {
      try {
        const query = gemini.servingDescription
          ? `${gemini.foodName} ${gemini.servingDescription}`
          : gemini.foodName;

        const nxRes = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
          method: 'POST',
          headers: {
            'x-app-id': process.env.NUTRITIONIX_APP_ID,
            'x-app-key': process.env.NUTRITIONIX_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
          signal: AbortSignal.timeout(8000),
        });

        if (nxRes.ok) {
          const nxJson = await nxRes.json() as {
            foods?: Array<{
              food_name: string;
              nf_calories: number;
              nf_protein: number;
              nf_total_carbohydrate: number;
              nf_total_fat: number;
              serving_qty: number;
              serving_unit: string;
            }>;
          };
          if (nxJson.foods && nxJson.foods.length > 0) {
            const f = nxJson.foods[0];
            nutritionixData = {
              calories:         Math.round(f.nf_calories),
              protein:          Math.round(f.nf_protein),
              carbs:            Math.round(f.nf_total_carbohydrate),
              fat:              Math.round(f.nf_total_fat),
              foodName:         f.food_name,
              servingDescription: `${f.serving_qty} ${f.serving_unit}`,
            };
          }
        }
      } catch (nxErr) {
        // Nutritionix failure is non-fatal — fall back to Gemini
        console.warn('Nutritionix lookup failed (non-fatal):', nxErr);
      }
    }

    // ── Step 3: Build final result ────────────────

    const sourceTag =
      gemini.confidence === 'high'
        ? 'USDA standard reference values'
        : gemini.confidence === 'medium'
        ? 'visual estimate'
        : 'conservative visual estimate';

    let finalResult;

    if (nutritionixData) {
      const nx = nutritionixData;
      finalResult = {
        foodName:          gemini.foodName,
        brand:             gemini.brand,
        servingDescription: nx.servingDescription || gemini.servingDescription,
        isBranded:         gemini.isBranded,
        confidence:        'high' as const,
        calories:          nx.calories,
        protein:           nx.protein,
        carbs:             nx.carbs,
        fat:               nx.fat,
        sources: {
          calories: `Nutritionix database match for "${nx.foodName}" — ${nx.calories} kcal per ${nx.servingDescription}`,
          protein:  `Nutritionix database match for "${nx.foodName}" — ${nx.protein}g protein`,
          carbs:    `Nutritionix database match for "${nx.foodName}" — ${nx.carbs}g carbohydrates`,
          fat:      `Nutritionix database match for "${nx.foodName}" — ${nx.fat}g fat`,
        },
        notes: `Visual ID by Gemini AI. Nutrition from Nutritionix verified database.`,
      };
    } else {
      finalResult = {
        foodName:          gemini.foodName,
        brand:             gemini.brand,
        servingDescription: gemini.servingDescription,
        isBranded:         gemini.isBranded,
        confidence:        gemini.confidence,
        calories:          gemini.calories,
        protein:           gemini.protein,
        carbs:             gemini.carbs,
        fat:               gemini.fat,
        sources: {
          calories: gemini.calorieSources || `${sourceTag} for ${gemini.foodName}`,
          protein:  gemini.proteinSources || `${sourceTag} for ${gemini.foodName}`,
          carbs:    gemini.carbsSources   || `${sourceTag} for ${gemini.foodName}`,
          fat:      gemini.fatSources     || `${sourceTag} for ${gemini.foodName}`,
        },
        notes: gemini.notes || (gemini.confidence === 'low' ? 'Conservative estimate — photo was unclear. Consider retaking.' : ''),
      };
    }

    return NextResponse.json({ success: true, result: finalResult });

  } catch (err) {
    console.error('analyze-food error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected server error. Please try again.' },
      { status: 500 }
    );
  }
}
