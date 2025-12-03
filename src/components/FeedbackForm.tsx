'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FeedbackFormProps {
  questions: string[];
  page: string;
  showInstructions?: boolean;
}

export function FeedbackForm({ questions, page, showInstructions = false }: FeedbackFormProps) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [boardFeedback, setBoardFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(!showInstructions);
  const [submitCount, setSubmitCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'userFeedback'), {
        userId: user.uid,
        userEmail: user.email,
        page,
        questions: questions.length > 0 ? questions.map((q, i) => ({
          question: q,
          answer: answers[`q${i}`] || '',
        })) : [],
        boardFeedback,
        timestamp: new Date().toISOString(),
        createdAt: new Date(),
      });

      setSubmitted(true);
      setSubmitCount(prev => prev + 1);
      setAnswers({});
      setBoardFeedback('');
      
      // Hide success message after 2 seconds, but keep form visible for continuous feedback
      setTimeout(() => {
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (showInstructions && !showForm) {
    return (
      <div className="mb-6 p-6 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-xl">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-primary text-[#ad3c94] mb-2">Testing Instructions</h3>
          <button
            onClick={() => setShowForm(true)}
            className="text-[#ad3c94] hover:text-[#ad3c94]/80 text-sm font-secondary"
          >
            Skip →
          </button>
        </div>
        <div className="space-y-3 font-secondary text-[#e7e8ef]/90 text-sm">
          <p className="font-semibold text-[#ad3c94]">Thanks for testing with us!</p>
          <p>Test the app as if it is in your regular workflow. Here are the features available:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-[#ad3c94]">Opportunity Connector</strong> - Based on your user preferences, matches you with relevant grants and RFPs</li>
            <li><strong className="text-[#ad3c94]">Application Tracker</strong> - Save and track opportunities you're interested in or have applied to</li>
            <li><strong className="text-[#ad3c94]">Document Scraping</strong> - Upload documents to automatically extract information and create ready applications</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-[#ad3c94]/30">
            <p className="font-semibold text-[#ad3c94] mb-2">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Complete your profile to get personalized opportunity matches</li>
              <li>Browse opportunities on the dashboard and swipe through matches</li>
              <li>Save opportunities you're interested in or mark them as applied</li>
              <li>Upload documents in the Documents section to extract key information</li>
              <li>Track your progress in the Tracker section</li>
            </ol>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 w-full bg-[#ad3c94] text-white py-2 px-4 rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
          >
            Got it! Continue to Feedback →
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mb-6 p-4 bg-green-500/20 border border-green-400/30 rounded-lg">
        <p className="text-green-300 text-center font-secondary">Thank you for your feedback! ({submitCount} submitted)</p>
        <p className="text-green-300/70 text-center text-xs mt-1 font-secondary">You can submit more feedback anytime!</p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-6 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-xl">
      <h3 className="text-lg font-primary text-[#ad3c94] mb-4">Feedback</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.length > 0 && questions.map((question, index) => (
          <div key={index}>
            <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
              {question}
            </label>
            <textarea
              value={answers[`q${index}`] || ''}
              onChange={(e) => setAnswers({ ...answers, [`q${index}`]: e.target.value })}
              className="w-full px-4 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
              placeholder="Your answer..."
              rows={3}
            />
          </div>
        ))}
        
        <div>
          <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
            Additional Feedback (Optional)
          </label>
          <textarea
            value={boardFeedback}
            onChange={(e) => setBoardFeedback(e.target.value)}
            className="w-full px-4 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
            placeholder="Any other thoughts or suggestions..."
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#ad3c94] text-white py-2 px-4 rounded-lg hover:bg-[#ad3c94]/80 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:ring-offset-2 focus:ring-offset-[#1d1d1e] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-secondary"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}

