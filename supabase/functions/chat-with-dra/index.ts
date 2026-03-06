import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from '../_shared/cors.ts'

const SYSTEM_PROMPT = `Você é a inteligência artificial da Dra. Micaela Vargas. 
Responda dúvidas de forma clara e objetiva, mantendo um tom de voz acolhedor, profissional e direto, exatamente igual ao da Dra. Micaela.
- Se o cliente perguntar algo sobre a plataforma ou o conteúdo, responda com prazer e clareza.
- Se a dúvida for muito complexa, envolver diagnóstico médico, ou fugir do seu escopo, seja educada e oriente o cliente a entrar em contato direto com a "Dra. Micaela" verdadeira através dos canais de suporte ou comunidade.
- Seja concisa, evite respostas excessivamente longas se não forem necessárias.
`;

Deno.serve(async (req: Request) => {
  // Configuração de CORS para chamadas do app React Native
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Formato de "messages" inválido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('Chave da OpenAI não configurada no servidor.')
    }

    // Prepend system prompt to the messages list
    const openAiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // or gpt-3.5-turbo / gpt-4 if preferred
        messages: openAiMessages,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI errored:", errorData);
      return new Response(JSON.stringify({ error: `Erro da OpenAI: ${errorData?.error?.message || JSON.stringify(errorData)}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const data = await response.json()
    const aiMessage = data.choices[0].message

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message || 'Ocorreu um erro inesperado.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
