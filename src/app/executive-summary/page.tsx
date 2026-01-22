'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ExecutiveSummaryPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadBusinessProfile();
  }, [user, router]);

  const loadBusinessProfile = async () => {
    if (!user || !db) return;

    setLoadingProfile(true);
    try {
      const profileRef = doc(db, 'profiles', user.uid, 'businessProfile', 'master');
      const profileDoc = await getDoc(profileRef);
      if (profileDoc.exists()) {
        setBusinessProfile(profileDoc.data());
      }
    } catch (err) {
      console.error('Error loading business profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF, DOCX, or TXT file');
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload file to Firebase Storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.uid);
      formData.append('documentType', 'executive-summary');

      const uploadResponse = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadResponse.json();
      console.log('File uploaded:', uploadData);

      setUploading(false);
      setProcessing(true);

      // Step 2: Extract and analyze with AI
      const extractResponse = await fetch('/api/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: uploadData.documentId,
          storageUrl: uploadData.storageUrl,
          documentType: 'executive-summary',
          userId: user.uid,
        }),
      });

      if (!extractResponse.ok) {
        throw new Error('Failed to analyze document');
      }

      setProcessing(false);
      setSuccess(true);

      // Reload business profile
      setTimeout(() => {
        loadBusinessProfile();
      }, 2000);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload and analyze document');
      setUploading(false);
      setProcessing(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: '#f6f6f6' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push('/profile')}
            className="text-[#406da8] hover:text-[#2d4f7a] font-semibold mb-6 flex items-center gap-2 transition-colors"
          >
            ← Edit Profile
          </button>
          <h1 className="text-4xl font-primary font-bold text-[#1f2937] mb-3">
            Executive Summary
          </h1>
          <p className="text-[#374151] font-secondary">
            Upload your executive summary to enhance opportunity matching with AI-powered analysis
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl p-8 border border-[#e4e6eb] shadow-[0_6px_18px_rgba(0,0,0,0.08)] mb-8">
          <h2 className="text-2xl font-primary font-semibold text-[#1f2937] mb-4">
            Upload Your Executive Summary
          </h2>
          <p className="text-[#374151] font-secondary mb-6">
            Upload your business executive summary, pitch deck, or company overview document. 
            Our AI will analyze it to better match you with relevant opportunities.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[#1f2937] font-secondary font-semibold mb-2">
                Choose File (PDF, DOCX, or TXT)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                disabled={uploading || processing}
                className="w-full px-4 py-3 bg-white border border-[#e4e6eb] rounded-lg text-[#374151] font-secondary focus:outline-none focus:ring-2 focus:ring-[#406da8] focus:border-[#406da8] transition-all"
              />
            </div>

            {file && (
              <div className="bg-white border border-[#406da8] rounded p-4">
                <p className="text-[#1f2937] font-secondary font-semibold">
                  <span className="font-bold text-[#406da8]">Selected:</span> {file.name}
                </p>
                <p className="text-[#6b7280] text-sm font-secondary mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {error && (
              <div className="bg-white border border-red-300 rounded p-4">
                <p className="text-red-700 font-secondary font-semibold">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-white border border-green-300 rounded p-4">
                <p className="text-green-700 font-secondary font-semibold">
                  ✅ Executive summary uploaded and analyzed successfully!
                </p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading || processing}
              className="w-full px-6 py-3 bg-[#406da8] text-white rounded-xl font-secondary font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2d4f7a] transition-all shadow-[0_4px_12px_rgba(64,109,168,0.3)] hover:shadow-[0_6px_16px_rgba(64,109,168,0.4)]"
            >
              {uploading && 'Uploading...'}
              {processing && 'Analyzing with AI...'}
              {!uploading && !processing && 'Upload & Analyze'}
            </button>
          </div>
        </div>

        {/* Business Profile Preview */}
        {!loadingProfile && businessProfile && (
          <div className="bg-white rounded-xl p-8 border border-[#e4e6eb] shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-primary font-semibold text-[#1f2937] mb-6">
              Your Business Profile
            </h2>

            <div className="space-y-8">
              {businessProfile.companyOverview && (
                <div>
                  <div className="mb-3 pb-2 border-b border-[#e4e6eb]">
                    <h3 className="text-lg font-secondary font-semibold text-[#406da8]">
                      Company Overview
                    </h3>
                  </div>
                  <p className="text-[#374151] font-secondary leading-relaxed">
                    {businessProfile.companyOverview}
                  </p>
                </div>
              )}

              {businessProfile.mission && (
                <div>
                  <div className="mb-3 pb-2 border-b border-[#e4e6eb]">
                    <h3 className="text-lg font-secondary font-semibold text-[#406da8]">
                      Mission
                    </h3>
                  </div>
                  <p className="text-[#374151] font-secondary leading-relaxed">
                    {businessProfile.mission}
                  </p>
                </div>
              )}

              {businessProfile.vision && (
                <div>
                  <div className="mb-3 pb-2 border-b border-[#e4e6eb]">
                    <h3 className="text-lg font-secondary font-semibold text-[#406da8]">
                      Vision
                    </h3>
                  </div>
                  <p className="text-[#374151] font-secondary leading-relaxed">
                    {businessProfile.vision}
                  </p>
                </div>
              )}

              {businessProfile.servicesCapabilities && businessProfile.servicesCapabilities.length > 0 && (
                <div>
                  <div className="mb-3 pb-2 border-b border-[#e4e6eb]">
                    <h3 className="text-lg font-secondary font-semibold text-[#406da8]">
                      Services & Capabilities
                    </h3>
                  </div>
                  <ul className="list-disc list-inside space-y-2">
                    {businessProfile.servicesCapabilities.map((service: string, idx: number) => (
                      <li key={idx} className="text-[#374151] font-secondary">
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {businessProfile.certifications && businessProfile.certifications.length > 0 && (
                <div>
                  <div className="mb-3 pb-2 border-b border-[#e4e6eb]">
                    <h3 className="text-lg font-secondary font-semibold text-[#406da8]">
                      Certifications
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {businessProfile.certifications.map((cert: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-[#406da8] text-white rounded-full text-sm font-secondary font-semibold"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[#e4e6eb]">
                <p className="text-sm text-[#6b7280] font-secondary">
                  Last updated: {new Date(businessProfile.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loadingProfile && !businessProfile && (
          <div className="bg-white rounded-xl p-8 border border-[#e4e6eb] shadow-[0_6px_18px_rgba(0,0,0,0.08)] text-center">
            <p className="text-[#374151] font-secondary">
              No business profile found. Upload your executive summary to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


