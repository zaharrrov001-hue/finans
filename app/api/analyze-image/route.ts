import { NextRequest, NextResponse } from 'next/server';

// Анализ через Google Cloud Vision
async function analyzeWithGoogleVision(imageBase64: string) {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) return null;

  try {
    // Убираем data:image prefix если есть
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Data },
            features: [{ type: 'TEXT_DETECTION', maxResults: 50 }]
          }]
        })
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text || '';
    return text;
  } catch (error) {
    console.error('Google Vision Error:', error);
    return null;
  }
}

// Парсинг текста чека
function parseReceiptText(text: string): { items: { name: string; amount: number }[]; total: number | null } {
  const items: { name: string; amount: number }[] = [];
  let total: number | null = null;
  
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Ищем итого
    const totalMatch = line.match(/(?:итого|всего|total|к оплате|сумма)[:\s]*[₽$]?\s*(\d[\d\s.,]*)/i);
    if (totalMatch) {
      total = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
      continue;
    }
    
    // Ищем товар + цена (цена в конце строки)
    const itemMatch = line.match(/^(.{3,40}?)\s+(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?)\s*[₽рР]?\s*$/);
    if (itemMatch) {
      const name = itemMatch[1].trim();
      const amount = parseFloat(itemMatch[2].replace(/\s/g, '').replace(',', '.'));
      
      // Фильтруем служебные строки
      if (!/итого|всего|сумма|дата|время|чек|кассир|скидка|нал|карт|сдача/i.test(name) && amount > 0) {
        items.push({ name: name.substring(0, 30), amount });
      }
    }
  }
  
  return { items, total };
}

// Анализ через OpenAI GPT-4 Vision
async function analyzeWithOpenAI(image: string, categoriesList: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Извлеки товары и цены из чека. Ответ ТОЛЬКО JSON:
{"items":[{"name":"товар","amount":123}],"total":456}
Категории: ${categoriesList}`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Извлеки товары и цены:' },
              { type: 'image_url', image_url: { url: image, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('OpenAI Vision Error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { image, categories } = await request.json();
    
    const categoriesList = categories?.map((c: { name: string; icon: string }) => 
      `${c.icon} ${c.name}`
    ).join(', ') || '';

    // 1. Сначала пробуем Google Cloud Vision (быстрее и дешевле)
    const googleText = await analyzeWithGoogleVision(image);
    if (googleText) {
      const parsed = parseReceiptText(googleText);
      if (parsed.items.length > 0 || parsed.total) {
        console.log('✓ Google Vision успешно');
        return NextResponse.json(parsed);
      }
    }

    // 2. Fallback на OpenAI GPT-4 Vision
    const openaiResult = await analyzeWithOpenAI(image, categoriesList);
    if (openaiResult && (openaiResult.items?.length > 0 || openaiResult.total)) {
      console.log('✓ OpenAI Vision успешно');
      return NextResponse.json(openaiResult);
    }

    // 3. Ничего не сработало
    return NextResponse.json({ 
      items: [], 
      total: null,
      error: 'Не удалось распознать. Добавьте API ключи в настройках Vercel.'
    });

  } catch (error) {
    console.error('Analyze Image API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', items: [], total: null },
      { status: 500 }
    );
  }
}
