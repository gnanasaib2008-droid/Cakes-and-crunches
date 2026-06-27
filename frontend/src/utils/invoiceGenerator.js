import html2pdf from 'html2pdf.js';

/**
 * Generates and downloads a premium PDF invoice for a given order.
 * @param {Object} order The order database record with customer details populated
 */
export const generateInvoicePDF = (order) => {
  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.fontFamily = "'Inter', 'Helvetica Neue', Arial, sans-serif";
  element.style.color = '#1e293b';
  element.style.backgroundColor = '#ffffff';

  const subtotal = (order.unit_price || 0) * (order.quantity || 1);
  const grandTotal = order.total_price || subtotal;

  const riskColor = order.risk_score >= 90 ? '#ef4444' : order.risk_score >= 30 ? '#f59e0b' : '#10b981';
  const riskLabel = order.risk_score >= 90 ? 'CRITICAL RISK' : order.risk_score >= 30 ? 'HIGH/MED WARNING' : 'SAFE / CLEAR';

  element.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px;">
      <div>
        <h1 style="margin: 0; color: #7c3aed; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Cakes & Crunches</h1>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Premium Custom Bakery & Allergy Safety Center</p>
      </div>
      <div style="text-align: right;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Invoice</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; color: #7c3aed;">Order ID: #${order.id}</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 32px; gap: 20px;">
      <div style="flex: 1;">
        <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; tracking-wider; color: #94a3b8;">Billed To</h3>
        <p style="margin: 0; font-weight: 700; font-size: 15px; color: #0f172a;">${order.customer_name}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #475569;">Email: ${order.customer_email || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #475569;">Phone: ${order.customer_phone || 'N/A'}</p>
      </div>
      <div style="text-align: right; flex: 1;">
        <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; tracking-wider; color: #94a3b8;">Invoice Details</h3>
        <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Order Date:</strong> ${order.order_date ? new Date(order.order_date).toLocaleDateString() : new Date().toLocaleDateString()}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Delivery Date:</strong> ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Status:</strong> <span style="text-transform: uppercase; font-weight: 700; color: #475569;">${order.status}</span></p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <thead>
        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
          <th style="text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Item Description</th>
          <th style="text-align: right; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; width: 100px;">Unit Price</th>
          <th style="text-align: right; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; width: 80px;">Quantity</th>
          <th style="text-align: right; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; width: 120px;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 16px; text-align: left; vertical-align: top;">
            <p style="margin: 0; font-weight: 700; font-size: 14px; color: #0f172a;">${order.product_name}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Category: ${order.category}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-style: italic;">Ingredients: ${order.ingredients}</p>
            ${order.notes ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b;"><strong>Notes:</strong> ${order.notes}</p>` : ''}
          </td>
          <td style="padding: 16px; text-align: right; font-size: 13px; color: #334155; vertical-align: top;">$${(order.unit_price || 0).toFixed(2)}</td>
          <td style="padding: 16px; text-align: right; font-size: 13px; color: #334155; vertical-align: top;">${order.quantity || 1}</td>
          <td style="padding: 16px; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a; vertical-align: top;">$${subtotal.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 16px; gap: 40px;">
      <div style="flex: 1.2; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
        <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; tracking-wider;">Allergy Safety Scan Audit</h4>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${riskColor};"></span>
          <span style="font-size: 12px; font-weight: 700; color: ${riskColor}; text-transform: uppercase;">
            ${riskLabel} (${order.risk_score}% Risk)
          </span>
        </div>
        <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.5; font-style: italic;">
          ${order.risk_explanation || 'No safety overrides or critical allergy conflicts triggered for this cake formulation.'}
        </p>
      </div>
      <div style="flex: 0.8; min-width: 220px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #64748b;">
          <span>Subtotal:</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 15px; font-weight: 800; color: #0f172a; border-top: 2px solid #e2e8f0; margin-top: 8px;">
          <span>Total Amount:</span>
          <span style="color: #7c3aed;">$${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div style="margin-top: 80px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 24px; color: #94a3b8; font-size: 11px; line-height: 1.5;">
      <p style="margin: 0; font-weight: 600; color: #64748b;">Thank you for ordering from Cakes & Crunches!</p>
      <p style="margin: 4px 0 0 0;">For customization updates or allergy notifications, contact manager@cakesandcrunches.com</p>
      <p style="margin: 12px 0 0 0; font-size: 10px; color: #cbd5e1;">Invoice printed on ${new Date().toLocaleString()}</p>
    </div>
  `;

  const opt = {
    margin:       15,
    filename:     `invoice_order_${order.id}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().from(element).set(opt).save();
};
