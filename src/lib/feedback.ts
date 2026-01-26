import { getSupabase } from './supabase'

export interface FeedbackSubmission {
  name: string
  email?: string
  page: string
  comment: string
}

export async function submitFeedback(
  feedback: FeedbackSubmission
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase()

    if (!supabase) {
      console.warn('Supabase not configured - feedback not saved')
      // Still return success for demo purposes
      return { success: true }
    }

    const { error } = await supabase.from('demo_feedback').insert([
      {
        name: feedback.name,
        email: feedback.email || null,
        page: feedback.page,
        comment: feedback.comment,
        created_at: new Date().toISOString(),
      },
    ])

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return { success: false, error: 'Failed to submit feedback. Please try again.' }
  }
}
