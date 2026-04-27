import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_PROMPT = 'You are a precise nutrition analyst. Analyze the food in this image and return ONLY a valid JSON object â no markdown fences, no explanation, just raw JSON.\n\nIdentify the food as specifically as possible. Estimate the portion size based on what is visible.\n\nReturn exactly this JSON structure:\n{\n  "foodName": "specific name",\n  "brand": null,\n  "servingDescription": "e.g. 1 medium breast (~170g)",\n  "isBranded": false,\n  "confidence": "high",\n  "calories": 284,\n  "protein": 53,\n  "carbs": 0,\n  "fat": 6,\n  "calorieSources": "USDA standard reference values",\n  "proteinSources": "USDA standard reference values",\n  "carbsSources": "USDA standard reference values",\n  "fatSources": "USDA standard reference values",\n  "notes": ""\n}\n\nRULES:\n- isBranded = true ONLY for specific packaged commercial products with a visible brand\n- confidence: high = very confident | medium = reasonable ID, portion uncertain | low = unclear\n- Source strings must explain WHERE each number came from\n- calories must approximately equal (protein x 4) + (carbs x 4) + (fat x 9)\n- All macro values must be non-negative integers\n- If you cannot identify the food, set confidence to low and make your best conservative guess';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { images: string[] };
    const { images } = body;

    if (!images || images.length === 0) {
      return NextResponse.json({ success: false, error: 'No images provided' }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imageParts = images.map((b64: string) => ({
      inlineData: { data: b64.replace(/^data:image\/\w+;base64,/, ''), mimeType: 'image/jpeg' as const },
    }));

    const geminiResult = await model.generateContent([GEMINI_PROMPT, ...imageParts]);
    const rawText = geminiResult.response.text().trim();
    const jsonText = rawText.replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();

    let gemini: {
      foodName: string; brand: string | null; servingDescription: string; isBranded: boolean;
      confidence: 'high' | 'medium' | 'low'; calories: number; protein: number; carbs: number; fat: number;
      calorieSources: string; proteinSources: string; carbsSources: string; fatSources: string; notes: string;
    };

    try {
      gemini = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ success: false, error: 'Could not parse food analysis result. Try a clearer photo.' }, { status: 422 });
    }

    let nutritionixData: { calories: number; protein: number; carbs: number; fat: number; foodName: string; servingDescription: string } | null = null;

    if (process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_API_KEY) {
      try {
        const query = gemini.servingDescription ? gemini.foodName + ' ' + gemini.servingDescription : gemini.foodName;
        const nxRes = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
          method: 'POST',
          headers: { 'x-app-id': process.env.NUTRITIONIX_APP_ID, 'x-app-key': process.env.NUTRITIONIX_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: AbortSignal.timeout(8000),
        });
        if (nxRes.ok) {
          const nxJson = await nxRes.json() as { foods?: Array<{ food_name: string; nf_calories: number; nf_protein: number; nf_total_carbohydrate: number; nf_total_fat: number; serving_qty: number; serving_unit: string }> };
          if (nxJson.foods && nxJson.foods.length > 0) {
            const f = nxJson.foods[0];
            nutritionixData = { calories: Math.round(f.nf_calories), protein: Math.round(f.nf_protein), carbs: Math.round(f.nf_total_carbohydrate), fat: Math.round(f.nf_total_fat), foodName: f.food_name, servingDescription: f.serving_qty + ' ' + f.serving_unit };
          }
        }
      } catch (nxErr) {
        console.warn('Nutritionix lookup failed (non-fatal):', nxErr);
      }
    }

    const sourceTag = gemini.confidence === 'high' ? 'USDA standard reference values' : gemini.confidence === 'medium' ? 'visual estimate' : 'conservative visual estimate';

    const finalResult = nutritionixData ? {
      foodName: gemini.foodName, brand: gemini.brand, servingDescription: nutritionixData.servingDescription || gemini.servingDescription,
      isBranded: gemini.isBranded, confidence: 'high' as const,
      calories: nutritionixData.calories, protein: nutritionixData.protein, carbs: nutritionixData.carbs, fat: nutritionixData.fat,
      sources: {
        calories: 'Nutritionix database match for "' + nutritionixData.foodName + '" â ' + nutritionixData.calories + ' kcal',
        protein:  'Nutritionix database match for "' + nutritionixData.foodName + '" â ' + nutritionixData.protein + 'g protein',
        carbs:    'Nutritionix database match for "' + nutritionixData.foodName + '" â ' + nutritionixData.carbs + 'g carbs',
        fat:      'Nutritionix database match for "' + nutritionixData.foodName + '" â ' + nutritionixData.fat + 'g fat',
      },
      notes: 'Visual ID by Gemini AI. Nutrition from Nutritionix verified database.',
    } : {
      foodName: gemini.foodName, brand: gemini.brand, servingDescription: gemini.servingDescription,
      isBranded: gemini.isBranded, confidence: gemini.confidence,
      calories: gemini.calories, protein: gemini.protein, carbs: gemini.carbs, fat: gemini.fat,
      sources: {
        calories: gemini.calorieSources || sourceTag + ' for ' + gemini.foodName,
        protein:  gemini.proteinSources || sourceTag + ' for ' + gemini.foodName,
        carbs:    gemini.carbsSources   || sourceTag + ' for ' + gemini.foodName,
        fat:      gemini.fatSources     || sourceTag + ' for ' + gemini.foodName,
      },
      notes: gemini.notes || (gemini.confidence === 'low' ? 'Conservative estimate â photo was unclear. Consider retaking.' : ''),
    };

    return NextResponse.json({ success: true, result: finalResult });

  } catch (err) {
    console.error('analyze-food error:', err);
    return NextResponse.json({ success: false, error: 'Unexpected server error. Please try again.' }, { status: 500 });
  }
}
