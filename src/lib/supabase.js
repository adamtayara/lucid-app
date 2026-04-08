import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nzystepeolxxguouwbkp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXN0ZXBlb2x4eGd1b3V3YmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MDM3NDIsImV4cCI6MjA5MTE3OTc0Mn0.xRW9Ybf3FBlIT4eWDNxIqKPEzeV53J5yGjKSAcIL1jI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getProfile() {
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  return data
}

// Dream API
export async function interpretDream(dreamText) {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(`${supabaseUrl}/functions/v1/interpret-dream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ dreamText }),
  })

  const data = await response.json()
  if (!response.ok) throw data
  return data
}

export async function getDreamJournal() {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function toggleFavorite(dreamId, isFavorite) {
  const { error } = await supabase
    .from('dreams')
    .update({ is_favorite: !isFavorite })
    .eq('id', dreamId)
  if (error) throw error
}

// Dream Chat (follow-up questions)
export async function sendDreamChat(dreamId, message, dreamText, previousMessages) {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(`${supabaseUrl}/functions/v1/dream-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ dreamId, message, dreamText, previousMessages }),
  })

  const data = await response.json()
  if (!response.ok) throw data
  return data
}

export async function getDreamChatHistory(dreamId) {
  const { data, error } = await supabase
    .from('dream_chats')
    .select('*')
    .eq('dream_id', dreamId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Community / Social
export async function getSharedDreams() {
  const { data, error } = await supabase
    .from('shared_dreams')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function shareDream(dreamId, dreamExcerpt, interpretationExcerpt, symbols, emotions, displayName) {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('shared_dreams')
    .insert({
      dream_id: dreamId,
      user_id: session.user.id,
      display_name: displayName || 'Anonymous Dreamer',
      dream_excerpt: dreamExcerpt,
      interpretation_excerpt: interpretationExcerpt,
      symbols, emotions,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function likeDream(sharedDreamId) {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('dream_likes')
    .insert({ shared_dream_id: sharedDreamId, user_id: session.user.id })
  if (error && error.code !== '23505') throw error // ignore duplicate
  // Increment count
  await supabase.rpc('increment_likes', { dream_id: sharedDreamId }).catch(() => {})
}

// Lucid dreaming progress
export async function getLucidProgress() {
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase
    .from('lucid_progress')
    .select('*')
    .eq('user_id', session.user.id)
    .single()
  return data
}

export async function updateLucidProgress(updates) {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')
  const { data: existing } = await supabase
    .from('lucid_progress')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (existing) {
    await supabase.from('lucid_progress').update({ ...updates, updated_at: new Date().toISOString() }).eq('user_id', session.user.id)
  } else {
    await supabase.from('lucid_progress').insert({ user_id: session.user.id, ...updates })
  }
}

// Stripe checkout
export async function createCheckout(priceId) {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      priceId,
      successUrl: `${window.location.origin}/?success=true`,
      cancelUrl: `${window.location.origin}/?canceled=true`,
    }),
  })

  const data = await response.json()
  if (!response.ok) throw data
  return data
}
