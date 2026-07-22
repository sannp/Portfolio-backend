const config = require('config');

class WhatsAppService {
  constructor() {
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
    this.defaultTemplate = process.env.WHATSAPP_DEFAULT_TEMPLATE || 'server_alert';
  }

  /**
   * Helper: Get current credentials from process.env or config
   */
  _getCredentials() {
    const accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_WA_TOKEN ||
      (config.has('whatsapp.accessToken') ? config.get('whatsapp.accessToken') : '');

    const phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      process.env.META_PHONE_NUMBER_ID ||
      (config.has('whatsapp.phoneNumberId') ? config.get('whatsapp.phoneNumberId') : '');

    const recipientPhone =
      process.env.WHATSAPP_RECIPIENT_PHONE ||
      process.env.ALERT_RECIPIENT_PHONE ||
      (config.has('whatsapp.recipientPhone') ? config.get('whatsapp.recipientPhone') : '');

    return { accessToken, phoneNumberId, recipientPhone };
  }

  /**
   * Helper: Get base headers for Meta Graph API
   */
  getHeaders() {
    const { accessToken } = this._getCredentials();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
  }

  /**
   * Helper: Get Meta Graph API URL
   */
  getApiUrl(path) {
    return `https://graph.facebook.com/${this.apiVersion}/${path}`;
  }

  /**
   * Send Template Message via Meta WhatsApp Cloud API
   * 
   * @param {string} [phoneNumber] - Recipient phone number (defaults to ALERT_RECIPIENT_PHONE / WHATSAPP_RECIPIENT_PHONE)
   * @param {string} [templateName] - Meta template name (defaults to server_alert)
   * @param {Array|Object} [templateParams=[]] - Array or map of body parameter values
   * @param {Object} [options={}] - Additional options (language, headerParams, components)
   * @returns {Promise<Object>} Object with { success, messageId, data, error }
   */
  async sendTemplateMessage(phoneNumber, templateName, templateParams = [], options = {}) {
    let targetPhone = phoneNumber;
    try {
      const { phoneNumberId, recipientPhone } = this._getCredentials();
      targetPhone = phoneNumber || recipientPhone;
      const tName = templateName || this.defaultTemplate;
      const language = options.language || 'en_US';

      if (!targetPhone || !phoneNumberId) {
        throw new Error('WhatsApp configuration missing: Phone Number ID and Recipient Phone are required.');
      }

      const components = [];

      // 1. Text Header Parameters if provided
      if (options.headerParams && Array.isArray(options.headerParams) && options.headerParams.length > 0) {
        const headerArray = options.headerParams.map(paramVal => ({
          type: 'text',
          text: String(paramVal || ''),
        }));
        components.push({ type: 'header', parameters: headerArray });
      }

      // 2. Body Parameters
      let bodyParamsArray = [];
      if (Array.isArray(templateParams)) {
        bodyParamsArray = templateParams.map(val => ({
          type: 'text',
          text: String(val || ''),
        }));
      } else if (typeof templateParams === 'object' && templateParams !== null) {
        bodyParamsArray = Object.values(templateParams).map(val => ({
          type: 'text',
          text: String(val || ''),
        }));
      }

      if (options.components && Array.isArray(options.components)) {
        components.push(...options.components);
      } else if (bodyParamsArray.length > 0) {
        components.push({ type: 'body', parameters: bodyParamsArray });
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: targetPhone,
        type: 'template',
        template: {
          name: tName,
          language: { code: language },
          components: components,
        },
      };

      const url = this.getApiUrl(`${phoneNumberId}/messages`);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData?.error?.message || JSON.stringify(responseData?.error) || response.statusText);
      }

      const messageId = responseData?.messages?.[0]?.id;
      console.log(`[WhatsAppService] Template '${tName}' sent to ${targetPhone}. Message ID: ${messageId}`);
      return { success: true, messageId, data: responseData };
    } catch (error) {
      console.error(`[WhatsAppService] Template send failed for ${targetPhone}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Direct Text Message via Meta WhatsApp Cloud API
   * 
   * @param {string} [phoneNumber] - Recipient phone number
   * @param {string} message - Message body
   * @returns {Promise<Object>} Object with { success, messageId, data, error }
   */
  async sendTextMessage(phoneNumber, message) {
    let targetPhone = phoneNumber;
    try {
      const { phoneNumberId, recipientPhone } = this._getCredentials();
      targetPhone = phoneNumber || recipientPhone;

      if (!targetPhone || !phoneNumberId) {
        throw new Error('WhatsApp configuration missing: Phone Number ID and Recipient Phone are required.');
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: targetPhone,
        type: 'text',
        text: { preview_url: false, body: message },
      };

      const url = this.getApiUrl(`${phoneNumberId}/messages`);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData?.error?.message || JSON.stringify(responseData?.error) || response.statusText);
      }

      const messageId = responseData?.messages?.[0]?.id;
      console.log(`[WhatsAppService] Text message sent to ${targetPhone}. Message ID: ${messageId}`);
      return { success: true, messageId, data: responseData };
    } catch (error) {
      console.error(`[WhatsAppService] Text message send failed for ${targetPhone}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Primary Alert Function to trigger server/error alerts
   * 
   * @param {string} errorMessage - Error message or notification details
   * @param {string} [environment='Production'] - Environment string (e.g. Production, Staging)
   * @param {Object} [options={}] - Options (phoneNumber, templateName)
   */
  async sendAlert(errorMessage, environment = process.env.NODE_ENV || 'Production', options = {}) {
    const templateName = options.templateName || this.defaultTemplate;
    const phoneNumber = options.phoneNumber;

    // Build parameters: [environment, errorMessage, timestamp]
    const alertParams = [
      environment,
      String(errorMessage || '').slice(0, 1000),
      new Date().toISOString()
    ];

    const result = await this.sendTemplateMessage(phoneNumber, templateName, alertParams, options);

    if (!result.success) {
      console.warn('[WhatsAppService] Template alert failed, attempting fallback text alert...');
      const fallbackText = `🚨 *[${environment}] ALERT*\n${errorMessage}\nTime: ${new Date().toISOString()}`;
      return await this.sendTextMessage(phoneNumber, fallbackText);
    }

    return result;
  }
}

module.exports = new WhatsAppService();
