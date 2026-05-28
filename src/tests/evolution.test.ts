// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocking the fetch API globally
global.fetch = vi.fn()

// We need to isolate the module to mock the env vars effectively
import { EvolutionClient } from '@/lib/evolution/client'

describe('EvolutionClient', () => {
  let client: EvolutionClient
  const orgId = '123e4567-e89b-12d3-a456-426614174000' // mock UUID
  // Note: the instance name replaces dashes: wazzai_123e4567e89b12d3a456426614174000

  beforeEach(() => {
    client = new EvolutionClient()
    vi.resetAllMocks()
  })

  it('creates an instance with correct payload', async () => {
    // Mock the fetch response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ instance: { instanceName: 'wazzai_123', status: 'created' } }),
    } as any)

    const res = await client.createInstance(orgId)
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/instance/create'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'apikey': expect.any(String)
        }),
        body: expect.stringContaining('wazzai_123e4567e89b12d3a456426614174000')
      })
    )
    
    // Check if the body contains the required webhook and sync options
    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1]?.body as string)
    
    expect(body.webhook.events).toContain('MESSAGES_UPSERT')
    expect(body.options.syncFullHistory).toBe(true)
    
    expect(res.instance.status).toBe('created')
  })

  it('gets QR code when instance exists but not connected', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ base64: 'data:image/png;base64,xxx' }),
    } as any)

    const res = await client.getQRCode(orgId)
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/instance/connect/wazzai_123e4567e89b12d3a456426614174000'),
      expect.objectContaining({ method: 'GET' })
    )
    
    expect(res).not.toBeNull()
    expect(res?.base64).toBe('data:image/png;base64,xxx')
  })

  it('returns null if instance is not found (404) on getQRCode', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as any)

    const res = await client.getQRCode(orgId)
    expect(res).toBeNull()
  })

  it('gets connection state', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ instance: { status: 'open' } }),
    } as any)

    const res = await client.getConnectionState(orgId)
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/instance/connectionState/wazzai_123e4567e89b12d3a456426614174000'),
      expect.objectContaining({ method: 'GET' })
    )
    
    expect(res?.status).toBe('open')
  })
})
