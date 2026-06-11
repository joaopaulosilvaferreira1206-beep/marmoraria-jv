import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../test/mocks.js'
import { materiais, clientes } from '../index.js'
import { supabase } from '../../lib/supabase.js'

describe('materiais service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listar chama supabase.from("materiais")', async () => {
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    const { error } = await materiais.listar()
    expect(supabase.from).toHaveBeenCalledWith('materiais')
    expect(error).toBeNull()
  })

  it('criar retorna erro quando supabase falha', async () => {
    supabase.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })
    const { error } = await materiais.criar({ descricao: 'Granito' })
    expect(error).not.toBeNull()
    expect(error.message).toBe('DB error')
  })
})

describe('clientes service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listar retorna array vazio sem erro', async () => {
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    const { data, error } = await clientes.listar()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
