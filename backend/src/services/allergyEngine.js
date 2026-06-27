const db = require('../config/db');

/**
 * Validates order ingredients against customer allergies and dietary preferences.
 * @param {number} customerId 
 * @param {string} orderIngredientsCommaSeparated 
 * @returns {Promise<object>} safetyReport
 */
const checkOrderSafety = async (customerId, orderIngredientsCommaSeparated) => {
  if (!orderIngredientsCommaSeparated) {
    return {
      riskScore: 0,
      riskLevel: 'none',
      allergyConflicts: [],
      dietaryViolations: [],
      requiresApproval: false,
      explanation: 'No ingredients provided for safety checks.'
    };
  }

  // Parse and normalize order ingredients
  const orderIngredients = orderIngredientsCommaSeparated
    .toLowerCase()
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);

  const ingredientsLower = orderIngredientsCommaSeparated.toLowerCase();

  // 1. Fetch customer details
  const customer = await db.get('SELECT name FROM customers WHERE id = ?', [customerId]);
  if (!customer) {
    throw new Error('Customer not found');
  }

  // 2. Fetch customer allergies
  const allergies = await db.query(
    `SELECT a.allergy_name, a.severity, a.trigger_ingredients 
     FROM customer_allergies ca 
     JOIN allergies a ON ca.allergy_id = a.id 
     WHERE ca.customer_id = ?`,
    [customerId]
  );

  // 3. Fetch customer dietary preferences
  const preferences = await db.query(
    `SELECT dp.preference_name, dp.forbidden_ingredients 
     FROM customer_preferences cp 
     JOIN dietary_preferences dp ON cp.preference_id = dp.id 
     WHERE cp.customer_id = ?`,
    [customerId]
  );

  const allergyConflicts = [];
  const dietaryViolations = [];
  let maxAllergyScore = 0;
  let hasCriticalAllergy = false;

  // 4. Allergy Check
  for (const allergy of allergies) {
    const triggers = (allergy.trigger_ingredients || '')
      .toLowerCase()
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const triggersMatched = [];
    for (const trigger of triggers) {
      const regex = new RegExp('\\b' + trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (regex.test(ingredientsLower)) {
        triggersMatched.push(trigger);
      }
    }

    if (triggersMatched.length > 0) {
      let score = 0;
      switch (allergy.severity.toLowerCase()) {
        case 'critical':
          score = 95;
          hasCriticalAllergy = true;
          break;
        case 'high':
          score = 80;
          break;
        case 'medium':
          score = 50;
          break;
        case 'low':
          score = 20;
          break;
      }
      maxAllergyScore = Math.max(maxAllergyScore, score);
      allergyConflicts.push({
        allergyName: allergy.allergy_name,
        severity: allergy.severity,
        triggersMatched
      });
    }
  }

  // 5. Dietary Preference Check
  let preferencePoints = 0;
  for (const pref of preferences) {
    const forbiddenList = (pref.forbidden_ingredients || '')
      .toLowerCase()
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);

    if (forbiddenList.length > 0) {
      const violatedIngredients = [];
      for (const forbidden of forbiddenList) {
        const regex = new RegExp('\\b' + forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        for (const ingredient of orderIngredients) {
          if (regex.test(ingredient)) {
            if (!violatedIngredients.includes(ingredient)) {
              violatedIngredients.push(ingredient);
            }
          }
        }
      }

      if (violatedIngredients.length > 0) {
        preferencePoints += 20;
        dietaryViolations.push({
          preferenceName: pref.preference_name,
          violatedIngredients
        });
      }
    }
  }

  // Calculate overall risk score
  // If there's a critical allergy conflict, force it to at least 95 (Critical risk)
  let riskScore = Math.max(maxAllergyScore, preferencePoints);
  if (hasCriticalAllergy) {
    riskScore = Math.max(riskScore, 95);
  }
  riskScore = Math.min(riskScore, 100);

  // Set risk levels
  let riskLevel = 'none';
  let requiresApproval = false;

  if (riskScore >= 90) {
    riskLevel = 'critical';
    requiresApproval = true;
  } else if (riskScore >= 60) {
    riskLevel = 'high';
  } else if (riskScore >= 30) {
    riskLevel = 'medium';
  } else if (riskScore > 0) {
    riskLevel = 'low';
  }

  // Generate explanation
  let explanation = '';
  if (allergyConflicts.length > 0) {
    const conflictSummaries = allergyConflicts.map(
      c => `${c.allergyName} Allergy (${c.severity}) triggered by "${c.triggersMatched.join(', ')}"`
    );
    explanation += `🚨 Allergy Conflicts: ${conflictSummaries.join('; ')}. `;
  }

  if (dietaryViolations.length > 0) {
    const violationSummaries = dietaryViolations.map(
      v => `${v.preferenceName} Preference violated by "${v.violatedIngredients.join(', ')}"`
    );
    explanation += `⚠️ Dietary Violations: ${violationSummaries.join('; ')}. `;
  }

  if (!explanation) {
    explanation = 'All ingredients passed safety and preference verification. Safe to produce.';
  } else if (requiresApproval) {
    explanation += 'CRITICAL RISK: Order requires supervisor/admin approval prior to baking.';
  }

  return {
    riskScore,
    riskLevel,
    allergyConflicts,
    dietaryViolations,
    requiresApproval,
    explanation
  };
};

module.exports = {
  checkOrderSafety
};
