'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { DocumentType, DocumentMetadata, DOCUMENT_REQUIREMENTS, getDocumentLabel } from '@/types/documents';
import { v4 as uuidv4 } from 'uuid';
import {
  trackDocumentsPageViewed,
  trackDocumentUploadStarted,
  trackDocumentUploadCompleted,
  trackDocumentUploadFailed,
  trackDocumentProcessingCompleted,
  trackDocumentProcessingFailed,
  trackDocumentReplaced,
} from '@/lib/analytics';

export default function DocumentsPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load user's documents
  useEffect(() => {
    if (user) {
      loadDocuments();
      trackDocumentsPageViewed();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      // Documents are now nested under: profiles/{userId}/documents
      const docsRef = collection(db, 'profiles', user.uid, 'documents');
      const querySnapshot = await getDocs(docsRef);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DocumentMetadata));
      
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentType: DocumentType, file: File) => {
    if (!user) return;

    const fileId = uuidv4(); // Unique ID
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const uploadKey = `${documentType}-${fileId}`; // Key for tracking upload progress
    
    try {
      // Check if document of this type already exists
      const existingDoc = documents.find(d => d.documentType === documentType);
      const isReplacement = !!existingDoc;
      
      // Track upload start
      trackDocumentUploadStarted(documentType);
      
      if (isReplacement) {
        trackDocumentReplaced(documentType);
      }
      
      // Create storage reference using document type as filename
      // Format: Userdocuments/{uid}/{documentType}-{uuid}.{extension}
      // This makes files easier to identify and organize for extraction
      const storageRef = ref(storage, `Userdocuments/${user.uid}/${documentType}-${fileId}.${fileExtension}`);
      
      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadingFiles(prev => ({ ...prev, [uploadKey]: progress }));
        },
        (error) => {
          console.error('Upload error:', error);
          trackDocumentUploadFailed(documentType, error.message || 'Unknown error');
          alert('Failed to upload file');
          setUploadingFiles(prev => {
            const newState = { ...prev };
            delete newState[uploadKey];
            return newState;
          });
        },
        async () => {
          // Upload completed
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Track upload completion
          trackDocumentUploadCompleted(documentType, file.size, file.type);
          
          let docRefId: string;
          const docsRef = collection(db, 'profiles', user.uid, 'documents');
          
          if (isReplacement && existingDoc) {
            // UPDATE existing document instead of creating new one
            console.log(`Replacing existing document: ${existingDoc.id}`);
            const docRef = doc(db, 'profiles', user.uid, 'documents', existingDoc.id);
            await updateDoc(docRef, {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadedAt: new Date().toISOString(),
              storageUrl: downloadURL,
              processingStatus: 'pending',
            });
            docRefId = existingDoc.id;
          } else {
            // CREATE new document
            console.log(`Creating new document of type: ${documentType}`);
            const docRef = await addDoc(docsRef, {
              userId: user.uid,
              documentType,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadedAt: new Date().toISOString(),
              storageUrl: downloadURL,
              processingStatus: 'pending',
            } as Omit<DocumentMetadata, 'id'>);
            docRefId = docRef.id;
          }
          
          // Trigger text extraction (Cloud Function)
          await fetch('/api/extract-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: docRefId,
              storageUrl: downloadURL,
              documentType,
              userId: user.uid,
              isReplacement, // Tell the API this is a replacement
            }),
          });
          
          // Remove from uploading state
          setUploadingFiles(prev => {
            const newState = { ...prev };
            delete newState[uploadKey];
            return newState;
          });
          
          // Reload documents
          await loadDocuments();
          
          alert(`Document ${isReplacement ? 'replaced' : 'uploaded'} successfully! Processing text extraction...`);
        }
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  // Get document requirements based on user's funding types
  const getAvailableDocuments = () => {
    if (!userProfile?.fundingType) return [];
    
    const types = userProfile.fundingType;
    let docs: typeof DOCUMENT_REQUIREMENTS.rfps = [];
    
    if (types.includes('rfps')) {
      docs = [...docs, ...DOCUMENT_REQUIREMENTS.rfps];
    }
    if (types.includes('grants')) {
      docs = [...docs, ...DOCUMENT_REQUIREMENTS.grants];
    }
    if (types.includes('contracts')) {
      docs = [...docs, ...DOCUMENT_REQUIREMENTS.contracts];
    }
    
    // Remove duplicates
    const uniqueDocs = docs.filter((doc, index, self) =>
      index === self.findIndex(d => d.type === doc.type)
    );
    
    return uniqueDocs;
  };

  const getDocumentStatus = (docType: DocumentType) => {
    const doc = documents.find(d => d.documentType === docType);
    return doc;
  };

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading documents...</p>
        </div>
      </div>
    );
  }

  const availableDocuments = getAvailableDocuments();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Manager</h1>
              <p className="text-sm text-gray-600 mt-1">
                Upload your documents for automated application filling
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h3>
          <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
            <li>Upload your documents (PDF, DOCX, images)</li>
            <li>We'll extract and organize the text automatically</li>
            <li>Use this information to auto-fill applications later</li>
          </ol>
        </div>

        {/* Document Upload Cards */}
        <div className="space-y-4">
          {availableDocuments.map((docConfig) => {
            const uploadedDoc = getDocumentStatus(docConfig.type);
            const uploadProgress = Object.keys(uploadingFiles).find(key => key.startsWith(docConfig.type));
            
            return (
              <div key={docConfig.type} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {docConfig.label}
                      </h3>
                      {docConfig.required && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          Required
                        </span>
                      )}
                      {uploadedDoc && (
                        <span className={`px-2 py-1 text-xs rounded ${
                          uploadedDoc.processingStatus === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : uploadedDoc.processingStatus === 'processing'
                            ? 'bg-yellow-100 text-yellow-700'
                            : uploadedDoc.processingStatus === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {uploadedDoc.processingStatus === 'completed' ? '✓ Processed' :
                           uploadedDoc.processingStatus === 'processing' ? '⏳ Processing...' :
                           uploadedDoc.processingStatus === 'failed' ? '✗ Failed' :
                           '⏳ Pending'}
                        </span>
                      )}
                    </div>
                    
                    {uploadedDoc && (
                      <p className="text-sm text-gray-600 mb-2">
                        Current file: {uploadedDoc.fileName} ({(uploadedDoc.fileSize / 1024).toFixed(0)} KB)
                      </p>
                    )}
                    
                    {uploadProgress && (
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadingFiles[uploadProgress]}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Uploading... {uploadingFiles[uploadProgress].toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(docConfig.type, file);
                          }
                        }}
                        disabled={!!uploadProgress}
                      />
                      <span className={`px-4 py-2 rounded-md transition-colors inline-block ${
                        uploadProgress
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : uploadedDoc
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}>
                        {uploadedDoc ? 'Replace' : 'Upload'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-green-600">
                {documents.filter(d => d.processingStatus === 'completed').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-yellow-600">
                {documents.filter(d => d.processingStatus === 'processing' || d.processingStatus === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

