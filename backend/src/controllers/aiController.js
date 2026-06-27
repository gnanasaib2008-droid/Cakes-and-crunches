const { authenticateToken } = require('../middleware/auth');

exports.parseIngredients = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, message: 'Text description is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback to simple local parser if Gemini API key is missing
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY is not defined. Using regex-based fallback parser.');
    
    // Quick regex-based extractor for local simulation
    const commonIngredients = [
      'flour', 'sugar', 'egg', 'eggs', 'milk', 'butter', 'chocolate', 'cocoa', 'cream', 'cheese',
      'peanut', 'peanuts', 'walnut', 'walnuts', 'almond', 'almonds', 'hazelnut', 'hazelnuts', 'nut', 'nuts',
      'gelatin', 'strawberry', 'strawberries', 'vanilla', 'yeast', 'honey', 'gluten', 'wheat'
    ];
    
    const parsed = [];
    const normalized = text.toLowerCase();
    
    commonIngredients.forEach(ing => {
      const regex = new RegExp(`\\b${ing}\\b`, 'i');
      if (regex.test(normalized)) {
        parsed.push(ing);
      }
    });

    if (parsed.length === 0) {
      // If we couldn't match anything, default to returning words from the description
      const words = normalized
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !['cake', 'with', 'and', 'from', 'this', 'tier', 'size', 'shape'].includes(w));
      parsed.push(...words.slice(0, 5));
    }

    return res.json({
      success: true,
      ingredients: parsed.join(', '),
      simulated: true
    });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract a clean, comma-separated list of raw food ingredients from the following text description. Return ONLY the comma-separated ingredients, with no other text, comments, markdown, or formatting. 
            
Description: "${text}"`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    const parsedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!parsedText) {
      throw new Error('Could not parse text from Gemini response');
    }

    const ingredients = parsedText.replace(/[\n\r]+/g, ' ').trim().replace(/\.$/, '');

    return res.json({
      success: true,
      ingredients,
      simulated: false
    });
  } catch (err) {
    console.error('Gemini API parsing failed:', err);
    return res.status(500).json({
      success: false,
      message: 'AI Parsing failed. Please enter ingredients manually.',
      error: err.message
    });
  }
};
