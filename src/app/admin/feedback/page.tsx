'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, RefreshCw, MessageSquare, Mail, FileText, Clock } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FeedbackEntry {
  id: string
  name: string
  email: string | null
  page: string
  comment: string
  created_at: string
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeedback = async () => {
    setLoading(true)
    setError(null)

    const supabase = getSupabase()
    if (!supabase) {
      setError('Supabase not configured')
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('demo_feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setFeedback(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFeedback()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Demo Feedback</h1>
              <p className="text-sm text-muted-foreground">
                {feedback.length} submission{feedback.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFeedback} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="p-4 text-red-600 dark:text-red-400">
              Error loading feedback: {error}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="text-center py-12 text-muted-foreground">
            Loading feedback...
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && feedback.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-1">No feedback yet</h3>
              <p className="text-sm text-muted-foreground">
                Feedback submitted through the demo will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Feedback List */}
        {!loading && !error && feedback.length > 0 && (
          <div className="space-y-4">
            {feedback.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold">
                        {entry.name}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {entry.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {entry.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {entry.page}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm whitespace-pre-wrap">{entry.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
