'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '@/lib/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

interface ExecutiveSummaryStepProps {
  onComplete: (hasUploaded: boolean) => void;
  onSkip: () => void;
}

export default function ExecutiveSummaryStep({ onComplete, onSkip }: ExecutiveSummaryStepProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF, Word document, or text file');
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setError('');

    try {
      // Generate unique document ID
      const timestamp = Date.now();
      const documentId = `exec_summary_${timestamp}`;
      const fileName = `${documentId}_${file.name}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, `documents/${user.uid}/${fileName}`);
      await uploadBytes(storageRef, file);
      const storageUrl = await getDownloadURL(storageRef);

      console.log('✅ File uploaded to storage:', storageUrl);

      // Create document metadata in Firestore
      const docRef = doc(db, 'profiles', user.uid, 'documents', documentId);
      await setDoc(docRef, {
        documentId,
        userId: user.uid,
        documentType: 'Executive Summary',
        fileName: file.name,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        storageUrl,
        processingStatus: 'pending',
      });

      console.log('✅ Document metadata saved to Firestore');

      // Trigger AI extraction
      const response = await fetch('/api/extract-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          storageUrl,
          documentType: 'Executive Summary',
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        console.warn('AI extraction may have failed, but document was uploaded');
      }

      console.log('✅ Executive summary processing started');
      onComplete(true);
    } catch (err: any) {
      console.error('Error uploading executive summary:', err);
      setError(err.message || 'Failed to upload file');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-primary text-[#ad3c94] mb-4">
          Upload Your Executive Summary
        </h2>
        <p className="text-lg font-secondary text-[#e7e8ef]/80">
          Help us understand your organization better by uploading your executive summary, 
          business plan, or company overview. We'll analyze it to provide more personalized 
          opportunity matches.
        </p>
      </div>

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive
              ? 'border-[#ad3c94] bg-[#ad3c94]/10'
              : 'border-[#ad3c94]/50 hover:border-[#ad3c94]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <svg
            className="w-16 h-16 mx-auto mb-4 text-[#ad3c94]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-lg font-secondary text-[#e7e8ef] mb-2">
            Drag and drop your file here, or
          </p>
          <label className="inline-block px-6 py-3 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary cursor-pointer">
            Browse Files
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
            />
          </label>
          <p className="text-sm font-secondary text-[#e7e8ef]/60 mt-4">
            Accepted formats: PDF, Word, TXT (Max 10MB)
          </p>
        </div>
      ) : (
        <div className="bg-[#1d1d1e] border border-[#ad3c94]/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-10 h-10 text-[#ad3c94]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <p className="font-secondary text-[#e7e8ef] font-medium">
                  {file.name}
                </p>
                <p className="text-sm font-secondary text-[#e7e8ef]/60">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-[#e7e8ef]/60 hover:text-[#e7e8ef] transition-colors"
              disabled={uploading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="bg-[#ad3c94]/10 border border-[#ad3c94]/30 rounded-lg p-4 mb-4">
            <p className="text-sm font-secondary text-[#ad3c94]">
              <span className="font-semibold">What we'll extract:</span> Your organization's 
              mission, services, capabilities, past performance, team experience, and key 
              keywords to improve opportunity matching.
            </p>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full px-6 py-3 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Uploading & Analyzing...
              </span>
            ) : (
              'Upload Executive Summary'
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-sm font-secondary text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={onSkip}
          disabled={uploading}
          className="text-[#e7e8ef]/80 hover:text-[#e7e8ef] font-secondary transition-colors disabled:opacity-50"
        >
          Skip for now (you can upload later from your profile)
        </button>
      </div>

      <div className="mt-8 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-6">
        <h3 className="text-lg font-primary text-[#ad3c94] mb-3">
          Why Upload Your Executive Summary?
        </h3>
        <ul className="space-y-2 font-secondary text-[#e7e8ef]/80">
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-[#ad3c94] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Get more accurate opportunity matches based on your actual capabilities</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-[#ad3c94] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>See personalized eligibility highlights for each opportunity</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-[#ad3c94] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Save time by focusing on opportunities you're truly qualified for</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-[#ad3c94] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Your document is securely stored and only used to improve your experience</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

