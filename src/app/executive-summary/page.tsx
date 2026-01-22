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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/profile')}
            className="text-[#406da8] hover:text-[#2d4f7a] font-semibold mb-4 flex items-center gap-2 transition-colors"
          >
            ← Edit Profile
          </button>
          <h1 className="text-4xl font-primary font-bold bg-gradient-to-r from-[#406da8] via-[#5c8bc4] to-[#406da8] bg-clip-text text-transparent mb-2">
            Executive Summary
          </h1>
          <p className="text-gray-700 font-secondary font-medium">
            Upload your executive summary to enhance opportunity matching with AI-powered analysis
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl p-8 border-2 border-[#406da8]/20 shadow-lg shadow-[#406da8]/10 mb-8">
          <h2 className="text-2xl font-primary font-bold text-[#1a202c] mb-4">
            Upload Your Executive Summary
          </h2>
          <p className="text-gray-800 font-secondary font-medium mb-6">
            Upload your business executive summary, pitch deck, or company overview document. 
            Our AI will analyze it to better match you with relevant opportunities.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[#1a202c] font-secondary font-semibold mb-2">
                Choose File (PDF, DOCX, or TXT)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                disabled={uploading || processing}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-[#1a202c] font-secondary font-medium focus:outline-none focus:ring-2 focus:ring-[#406da8] focus:border-[#406da8] transition-all"
              />
            </div>

            {file && (
              <div className="bg-gradient-to-r from-[#406da8]/15 to-[#5c8bc4]/15 border-2 border-[#406da8]/40 rounded-lg p-4 shadow-md">
                <p className="text-[#1a202c] font-secondary font-semibold">
                  <span className="font-bold text-[#406da8]">Selected:</span> {file.name}
                </p>
                <p className="text-gray-700 text-sm font-medium">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-md">
                <p className="text-red-700 font-secondary font-semibold">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 shadow-md">
                <p className="text-green-700 font-secondary font-semibold">
                  ✅ Executive summary uploaded and analyzed successfully!
                </p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading || processing}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#406da8] to-[#5c8bc4] text-white rounded-lg font-secondary font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-105 transition-all shadow-lg"
            >
              {uploading && 'Uploading...'}
              {processing && 'Analyzing with AI...'}
              {!uploading && !processing && 'Upload & Analyze'}
            </button>
          </div>
        </div>

        {/* Business Profile Preview */}
        {!loadingProfile && businessProfile && (
          <div className="bg-white rounded-2xl p-8 border-2 border-[#406da8]/20 shadow-lg shadow-[#406da8]/10">
            <h2 className="text-2xl font-primary font-bold bg-gradient-to-r from-[#406da8] to-[#5c8bc4] bg-clip-text text-transparent mb-6">
              Your Business Profile
            </h2>

            <div className="space-y-6">
              {businessProfile.companyOverview && (
                <div className="bg-gradient-to-r from-[#406da8]/5 to-transparent rounded-lg p-4 border-l-4 border-[#406da8]">
                  <h3 className="text-lg font-secondary font-bold text-[#406da8] mb-3">
                    Company Overview
                  </h3>
                  <p className="text-gray-800 font-secondary leading-relaxed font-medium">
                    {businessProfile.companyOverview}
                  </p>
                </div>
              )}

              {businessProfile.mission && (
                <div className="bg-gradient-to-r from-[#406da8]/5 to-transparent rounded-lg p-4 border-l-4 border-[#406da8]">
                  <h3 className="text-lg font-secondary font-bold text-[#406da8] mb-3">
                    Mission
                  </h3>
                  <p className="text-gray-800 font-secondary leading-relaxed font-medium">
                    {businessProfile.mission}
                  </p>
                </div>
              )}

              {businessProfile.vision && (
                <div className="bg-gradient-to-r from-[#406da8]/5 to-transparent rounded-lg p-4 border-l-4 border-[#406da8]">
                  <h3 className="text-lg font-secondary font-bold text-[#406da8] mb-3">
                    Vision
                  </h3>
                  <p className="text-gray-800 font-secondary leading-relaxed font-medium">
                    {businessProfile.vision}
                  </p>
                </div>
              )}

              {businessProfile.servicesCapabilities && businessProfile.servicesCapabilities.length > 0 && (
                <div className="bg-gradient-to-r from-[#406da8]/5 to-transparent rounded-lg p-4 border-l-4 border-[#406da8]">
                  <h3 className="text-lg font-secondary font-bold text-[#406da8] mb-3">
                    Services & Capabilities
                  </h3>
                  <ul className="list-disc list-inside space-y-2">
                    {businessProfile.servicesCapabilities.map((service: string, idx: number) => (
                      <li key={idx} className="text-gray-800 font-secondary font-medium">
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {businessProfile.certifications && businessProfile.certifications.length > 0 && (
                <div className="bg-gradient-to-r from-[#406da8]/5 to-transparent rounded-lg p-4 border-l-4 border-[#406da8]">
                  <h3 className="text-lg font-secondary font-bold text-[#406da8] mb-3">
                    Certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {businessProfile.certifications.map((cert: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-gradient-to-r from-[#406da8] to-[#5c8bc4] text-white rounded-full text-sm font-secondary font-semibold shadow-md"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t-2 border-[#406da8]/20">
                <p className="text-sm text-gray-600 font-secondary font-medium">
                  Last updated: {new Date(businessProfile.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loadingProfile && !businessProfile && (
          <div className="bg-white rounded-2xl p-8 border-2 border-[#406da8]/20 shadow-lg shadow-[#406da8]/10 text-center">
            <p className="text-gray-700 font-secondary font-semibold">
              No business profile found. Upload your executive summary to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


