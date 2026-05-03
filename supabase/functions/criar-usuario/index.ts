import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (req.method === 'POST') {
      const { nome, email, senha, perfil } = await req.json()

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, perfil }
      })

      if (error) throw error

      // Inserir diretamente na tabela perfis
      const { error: perfilError } = await supabase.from('perfis').upsert({
        id: data.user.id,
        nome,
        email,
        perfil
      })

      if (perfilError) console.log('Erro ao inserir perfil:', perfilError.message)

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      const { id } = await req.json()
      const { error } = await supabase.auth.admin.deleteUser(id)
      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, erro: e.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})