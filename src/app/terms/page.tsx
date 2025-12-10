'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TermsPage() {
  const { user, userProfile, updateUserProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [termsContent, setTermsContent] = useState<string>('');
  const [hasScrolled, setHasScrolled] = useState(false);

  // Load terms content
  useEffect(() => {
    async function loadTerms() {
      try {
        // Try to fetch from public folder
        const response = await fetch('/termsandconditions.txt');
        if (response.ok) {
          const text = await response.text();
          setTermsContent(text);
          return;
        }
      } catch (error) {
        console.warn('Could not load terms from public folder:', error);
      }

      try {
        // Try alternative path
        const response = await fetch('/termsandconditions');
        if (response.ok) {
          const text = await response.text();
          setTermsContent(text);
          return;
        }
      } catch (error) {
        console.warn('Could not load terms from alternative path:', error);
      }

      // Fallback: use the key sections from the terms document
      setTermsContent(`TERMS AND CONDITIONS
The RFP Queen, LLC
7088 Fonso Drive, New Albany, Ohio 43054
Email: therfpqueen@gmail.com
Effective Date: November 25, 2025

SIMPLIFIED SUMMARY (For Sign-Up Screen)

This is a plain-language summary of the key points of our Terms & Conditions. By signing up for or using The RFP Queen, LLC services, you are entering into a binding agreement and agree to the full Terms & Conditions.

1. Account & Eligibility: You must provide accurate information and be authorized to use our service (generally, users should be adults or have guardian consent). Each user is responsible for maintaining the confidentiality of their account credentials.

2. Allowed Use: You agree to use The RFP Queen's platform and content lawfully and for its intended purpose. Don't misuse the services – for example, no spamming, hacking, or engaging in fraudulent or illegal activities. If you abuse the platform or violate these terms, we may suspend or terminate your account.

3. User Content & Data: If you upload or input any content or data (for example, proposal documents, personal information, etc.), you retain ownership of that content. However, you give The RFP Queen, LLC a license to use, copy, and process your content solely as needed to provide the service to you. We will handle your data in accordance with our Privacy Policy and will not use your personal data for other purposes without consent.

4. Intellectual Property: The RFP Queen, LLC owns all rights in its services, website, software, and materials. You agree not to copy, distribute, or modify our content or trademarks without permission.

5. Privacy: We care about your privacy. By using our service, you also agree to our data practices described in the Privacy Policy. We collect the information needed to operate the service and improve it, and we protect that information. We do not sell your personal data.

6. Service Quality & Availability: We strive to keep our platform available and secure. However, the service is provided "as is" without warranties – we do not guarantee it will be error-free or always available.

7. Limitation of Liability: To the extent allowed by law, The RFP Queen, LLC will not be liable for certain kinds of losses or damages. If we are found liable for any claim, our total liability is capped at the amount you paid us for the service in the last 6 months before the issue arose.

8. Termination: You can stop using our service at any time. We also reserve the right to terminate or suspend your access if you violate these terms or if needed to protect our platform or other users.

9. Governing Law & Disputes: These terms are governed by the laws of the State of Ohio (USA), without regard to conflict of law principles. Any disputes will be attempted to be resolved amicably; if not, they will be brought in the state or federal courts of Ohio.

10. Contact & Questions: If you have any questions about these terms or need support, please contact us at therfpqueen@gmail.com.

FULL TERMS & CONDITIONS, PRIVACY POLICY, AND GDPR/CCPA COMPLIANCE

For the complete Terms & Conditions, Privacy Policy (including Global Data Storage, AI Integration, and General Business Data), Enterprise Terms & Conditions, and GDPR/CCPA Compliance Addendum, please refer to the full legal document or contact us at therfpqueen@gmail.com.

By clicking "Accept & Continue", you acknowledge that you have read, understood, and agree to be bound by the full Terms & Conditions and Privacy Policy of The RFP Queen, LLC.`);
    }
    loadTerms();
  }, []);

  // Check if user has already accepted terms
  useEffect(() => {
    if (user && userProfile) {
      if (userProfile.termsAccepted) {
        // Already accepted, redirect to onboarding or dashboard based on profile completion
        if (!userProfile.entityName || !userProfile.fundingType || userProfile.fundingType.length === 0) {
          router.replace('/onboarding');
        } else {
          router.replace('/dashboard');
        }
      }
      // If terms not accepted, stay on this page to show terms
    } else if (!user) {
      // No user, redirect to login
      router.push('/login');
    }
    // If user exists but profile is loading, wait for it to load
  }, [user, userProfile, router]);

  const handleAccept = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      // Save terms acceptance to user profile
      const profileRef = doc(db, 'profiles', user.uid);
      const profileDoc = await getDoc(profileRef);
      
      const termsData = {
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: '2025-11-25', // Version from the terms document
      };

      if (profileDoc.exists()) {
        await setDoc(profileRef, termsData, { merge: true });
      } else {
        await setDoc(profileRef, {
          uid: user.uid,
          email: user.email,
          ...termsData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Update local profile state
      if (updateUserProfile) {
        await updateUserProfile(termsData as any);
      }

      // Redirect to onboarding
      router.replace('/onboarding');
    } catch (error) {
      console.error('Error accepting terms:', error);
      alert('Failed to save terms acceptance. Please try again.');
      setLoading(false);
    }
  };

  const handleDecline = () => {
    router.push('/');
  };

  // Track scroll to enable accept button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (scrolledToBottom) {
      setHasScrolled(true);
    }
  };

  return (
    <div className="min-h-screen gradient-bg p-4">
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-primary mb-2 gradient-text">Terms & Conditions</h1>
            <p className="font-secondary text-foreground/70">
              Please read and accept our Terms & Conditions to continue
            </p>
          </div>

          {/* Terms Content */}
          <div
            className="mb-6 p-6 bg-surface/30 border border-primary/20 rounded-xl max-h-[60vh] overflow-y-auto"
            onScroll={handleScroll}
          >
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-secondary text-sm text-foreground/90 leading-relaxed">
                {termsContent || 'Loading terms...'}
              </pre>
            </div>
          </div>

          {/* Scroll indicator */}
          {!hasScrolled && (
            <div className="mb-4 text-center">
              <p className="text-sm font-secondary text-foreground/60 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Please scroll to read the full terms
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="btn-secondary min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={loading || !hasScrolled}
              className="btn-primary min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Accepting...' : 'Accept & Continue'}
            </button>
          </div>

          <p className="text-xs font-secondary text-foreground/50 text-center mt-4">
            By clicking "Accept & Continue", you agree to our Terms & Conditions and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

