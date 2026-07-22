const whatsappService = require('../../src/services/whatsappService');

describe('WhatsAppService Unit Tests', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      WHATSAPP_ACCESS_TOKEN: 'mock_token_123',
      WHATSAPP_PHONE_NUMBER_ID: 'mock_phone_id_456',
      WHATSAPP_RECIPIENT_PHONE: '15550001111',
      WHATSAPP_API_VERSION: 'v18.0',
      WHATSAPP_DEFAULT_TEMPLATE: 'server_alert'
    };

    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe('sendTextMessage', () => {
    it('should successfully send text message with correct payload and headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.123' }] })
      });

      const result = await whatsappService.sendTextMessage('15550001111', 'Hello World Test Alert');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/mock_phone_id_456/messages',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer mock_token_123',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '15550001111',
            type: 'text',
            text: {
              preview_url: false,
              body: 'Hello World Test Alert'
            }
          })
        }
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.123');
    });

    it('should return error when configuration is missing', async () => {
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;

      const result = await whatsappService.sendTextMessage('15550001111', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('WhatsApp configuration missing');
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send template message with default template server_alert', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.template123' }] })
      });

      const result = await whatsappService.sendTemplateMessage('15550001111');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/mock_phone_id_456/messages',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer mock_token_123',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '15550001111',
            type: 'template',
            template: {
              name: 'server_alert',
              language: { code: 'en_US' },
              components: []
            }
          })
        }
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.template123');
    });
  });

  describe('sendAlert', () => {
    it('should send template alert with environment parameters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.alert123' }] })
      });

      const result = await whatsappService.sendAlert('High CPU usage detected', 'Production');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.alert123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/mock_phone_id_456/messages',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
});
