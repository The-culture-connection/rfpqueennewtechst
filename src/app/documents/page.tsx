'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { DocumentType, DocumentMetadata, DOCUMENT_REQUIREMENTS, getDocumentLabel } from '@/types/documents';
import { v4 as uuidv4 } from 'uuid';
import { LoadingMeter } from '@/components/LoadingMeter';
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
  console.log('🎬 [Documents Page] Component rendering/mounting');
  
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [hasCheckedInitialState, setHasCheckedInitialState] = useState(false);
  const [initialCompletedDocs, setInitialCompletedDocs] = useState<Set<string>>(new Set());
  
  // Redirect if not authenticated
  useEffect(() => {
    console.log('🔐 [Documents Page] Auth check useEffect', {
      loading,
      hasUser: !!user,
      userId: user?.uid,
    });
    
    if (!loading && !user) {
      console.log('🚨 [Documents Page] No user and not loading, redirecting to /login');
      router.push('/login');
    } else {
      console.log('✅ [Documents Page] Auth check passed');
    }
  }, [user, loading, router]);

  // Load user's documents
  useEffect(() => {
    console.log('🔄 [Documents Page] Load documents useEffect triggered', {
      hasUser: !!user,
      userId: user?.uid,
    });
    
    if (user) {
      console.log('✅ [Documents Page] User found, calling loadDocuments and trackDocumentsPageViewed');
      loadDocuments();
      trackDocumentsPageViewed();
    } else {
      console.log('⏳ [Documents Page] No user yet, waiting...');
    }
  }, [user]);

  // Monitor document processing status and redirect when complete
  useEffect(() => {
    console.log('🔍 [Documents Page] useEffect #1 triggered', {
      hasUser: !!user,
      hasDb: !!db,
      userId: user?.uid,
      uploadingFilesCount: Object.keys(uploadingFiles).length,
      redirecting,
    });

    if (!user || !db) {
      console.log('❌ [Documents Page] useEffect #1: Missing user or db, returning early');
      return;
    }

    // Set up real-time listener for documents
    const docsRef = collection(db, 'profiles', user.uid, 'documents');
    console.log('📡 [Documents Page] useEffect #1: Setting up onSnapshot listener');
    
    const unsubscribe = onSnapshot(docsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DocumentMetadata));
      
      console.log('📄 [Documents Page] useEffect #1: onSnapshot fired', {
        documentsCount: docs.length,
        documents: docs.map(d => ({
          id: d.id,
          type: d.documentType,
          status: d.processingStatus,
          fileName: d.fileName,
        })),
      });
      
      setDocuments(docs);

      // Check if any documents are uploading or processing
      const hasUploading = Object.keys(uploadingFiles).length > 0;
      const hasProcessing = docs.some(d => 
        d.processingStatus === 'processing' || d.processingStatus === 'pending'
      );
      const hasCompleted = docs.some(d => d.processingStatus === 'completed');
      const allCompleted = docs.length > 0 && docs.every(d => 
        d.processingStatus === 'completed' || d.processingStatus === 'failed'
      );

      console.log('🔍 [Documents Page] useEffect #1: Status checks', {
        hasUploading,
        hasProcessing,
        hasCompleted,
        allCompleted,
        redirecting,
        documentsLength: docs.length,
        statusBreakdown: {
          completed: docs.filter(d => d.processingStatus === 'completed').length,
          processing: docs.filter(d => d.processingStatus === 'processing').length,
          pending: docs.filter(d => d.processingStatus === 'pending').length,
          failed: docs.filter(d => d.processingStatus === 'failed').length,
        },
      });

      // Update processing state
      if (hasUploading || hasProcessing) {
        console.log('⏳ [Documents Page] useEffect #1: Setting processing state');
        setIsProcessing(true);
        if (hasUploading) {
          setProcessingMessage('Uploading documents...');
        } else if (hasProcessing) {
          setProcessingMessage('Processing documents with AI...');
        }
      } else if (hasCompleted && allCompleted && !redirecting) {
        // Check if documents were just completed (new completion) vs already completed
        const completedDocIds = new Set(
          docs.filter(d => d.processingStatus === 'completed').map(d => d.id)
        );
        
        console.log('🔍 [Documents Page] useEffect #1: Checking redirect conditions', {
          hasCompleted,
          allCompleted,
          redirecting,
          hasCheckedInitialState,
          completedDocIds: Array.from(completedDocIds),
          initialCompletedDocs: Array.from(initialCompletedDocs),
          completedDocIdsSize: completedDocIds.size,
          initialCompletedDocsSize: initialCompletedDocs.size,
        });
        
        // First time checking - store initial state and NEVER redirect
        if (!hasCheckedInitialState) {
          console.log('📝 [Documents Page] useEffect #1: FIRST CHECK - Storing initial document state (NO REDIRECT)', {
            completedDocIds: Array.from(completedDocIds),
            reason: 'This is the initial page load - documents were already completed',
          });
          setInitialCompletedDocs(completedDocIds);
          setHasCheckedInitialState(true);
          setIsProcessing(false);
        } else {
          // Subsequent checks - only redirect if NEW documents were completed
          const isNewCompletion = completedDocIds.size > initialCompletedDocs.size ||
            Array.from(completedDocIds).some(id => !initialCompletedDocs.has(id));
          
          console.log('🔍 [Documents Page] useEffect #1: SUBSEQUENT CHECK', {
            isNewCompletion,
            completedDocIds: Array.from(completedDocIds),
            initialCompletedDocs: Array.from(initialCompletedDocs),
          });
          
          if (isNewCompletion) {
            console.log('🚨 [Documents Page] useEffect #1: TRIGGERING REDIRECT (NEW completion detected)', {
              reason: 'New documents were completed after initial page load',
            });
            setIsProcessing(false);
            setRedirecting(true);
            setProcessingMessage('Documents processed! Redirecting to approve keywords...');
            
            setTimeout(() => {
              console.log('➡️ [Documents Page] useEffect #1: Executing redirect to /profile');
              router.push('/profile?message=Approve keywords');
            }, 2000);
          } else {
            console.log('✅ [Documents Page] useEffect #1: NO REDIRECT - Documents already completed on initial load', {
              reason: 'User is revisiting page with already-completed documents',
            });
            setIsProcessing(false);
          }
        }
      } else {
        console.log('✅ [Documents Page] useEffect #1: No redirect needed, setting processing to false');
        setIsProcessing(false);
      }
    });

    return () => {
      console.log('🧹 [Documents Page] useEffect #1: Cleaning up onSnapshot listener');
      unsubscribe();
    };
  }, [user, db, uploadingFiles, redirecting, router, hasCheckedInitialState, initialCompletedDocs]);

  // Monitor document processing status and redirect when complete (DUPLICATE - REMOVE THIS)
  useEffect(() => {
    console.log('🔍 [Documents Page] useEffect #2 triggered (DUPLICATE)', {
      hasUser: !!user,
      hasDb: !!db,
      userId: user?.uid,
      uploadingFilesCount: Object.keys(uploadingFiles).length,
      redirecting,
    });

    if (!user || !db) {
      console.log('❌ [Documents Page] useEffect #2: Missing user or db, returning early');
      return;
    }

    // Set up real-time listener for documents
    const docsRef = collection(db, 'profiles', user.uid, 'documents');
    console.log('📡 [Documents Page] useEffect #2: Setting up onSnapshot listener (DUPLICATE)');
    
    const unsubscribe = onSnapshot(docsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DocumentMetadata));
      
      console.log('📄 [Documents Page] useEffect #2: onSnapshot fired (DUPLICATE)', {
        documentsCount: docs.length,
        documents: docs.map(d => ({
          id: d.id,
          type: d.documentType,
          status: d.processingStatus,
          fileName: d.fileName,
        })),
      });
      
      setDocuments(docs);

      // Check if any documents are uploading or processing
      const hasUploading = Object.keys(uploadingFiles).length > 0;
      const hasProcessing = docs.some(d => 
        d.processingStatus === 'processing' || d.processingStatus === 'pending'
      );
      const hasCompleted = docs.some(d => d.processingStatus === 'completed');
      const allCompleted = docs.length > 0 && docs.every(d => 
        d.processingStatus === 'completed' || d.processingStatus === 'failed'
      );

      console.log('🔍 [Documents Page] useEffect #2: Status checks (DUPLICATE)', {
        hasUploading,
        hasProcessing,
        hasCompleted,
        allCompleted,
        redirecting,
        documentsLength: docs.length,
        statusBreakdown: {
          completed: docs.filter(d => d.processingStatus === 'completed').length,
          processing: docs.filter(d => d.processingStatus === 'processing').length,
          pending: docs.filter(d => d.processingStatus === 'pending').length,
          failed: docs.filter(d => d.processingStatus === 'failed').length,
        },
      });

      // Update processing state
      if (hasUploading || hasProcessing) {
        console.log('⏳ [Documents Page] useEffect #2: Setting processing state (DUPLICATE)');
        setIsProcessing(true);
        if (hasUploading) {
          setProcessingMessage('Uploading documents...');
        } else if (hasProcessing) {
          setProcessingMessage('Processing documents with AI...');
        }
      } else if (hasCompleted && allCompleted && !redirecting) {
        // Check if documents were just completed (new completion) vs already completed
        const completedDocIds = new Set(
          docs.filter(d => d.processingStatus === 'completed').map(d => d.id)
        );
        
        console.log('🔍 [Documents Page] useEffect #2: Checking redirect conditions (DUPLICATE)', {
          hasCompleted,
          allCompleted,
          redirecting,
          hasCheckedInitialState,
          completedDocIds: Array.from(completedDocIds),
          initialCompletedDocs: Array.from(initialCompletedDocs),
        });
        
        // First time checking - store initial state and NEVER redirect
        if (!hasCheckedInitialState) {
          console.log('📝 [Documents Page] useEffect #2: FIRST CHECK - Storing initial state (DUPLICATE - NO REDIRECT)');
          setInitialCompletedDocs(completedDocIds);
          setHasCheckedInitialState(true);
          setIsProcessing(false);
        } else {
          // Subsequent checks - only redirect if NEW documents were completed
          const isNewCompletion = completedDocIds.size > initialCompletedDocs.size ||
            Array.from(completedDocIds).some(id => !initialCompletedDocs.has(id));
          
          if (isNewCompletion) {
            console.log('🚨 [Documents Page] useEffect #2: TRIGGERING REDIRECT (DUPLICATE - NEW completion)');
            setIsProcessing(false);
            setRedirecting(true);
            setProcessingMessage('Documents processed! Redirecting to approve keywords...');
            
            setTimeout(() => {
              console.log('➡️ [Documents Page] useEffect #2: Executing redirect to /profile (DUPLICATE)');
              router.push('/profile?message=Approve keywords');
            }, 2000);
          } else {
            console.log('✅ [Documents Page] useEffect #2: NO REDIRECT - Already completed (DUPLICATE)');
            setIsProcessing(false);
          }
        }
      } else {
        console.log('✅ [Documents Page] useEffect #2: No redirect needed (DUPLICATE)');
        setIsProcessing(false);
      }
    });

    return () => {
      console.log('🧹 [Documents Page] useEffect #2: Cleaning up onSnapshot listener (DUPLICATE)');
      unsubscribe();
    };
  }, [user, db, uploadingFiles, redirecting, router, hasCheckedInitialState, initialCompletedDocs]);

  const loadDocuments = async () => {
    console.log('📥 [Documents Page] loadDocuments called', {
      hasUser: !!user,
      hasDb: !!db,
      userId: user?.uid,
    });

    if (!user || !db) {
      console.log('❌ [Documents Page] loadDocuments: Missing user or db, returning early');
      return;
    }

    try {
      // Documents are now nested under: profiles/{userId}/documents
      const docsRef = collection(db, 'profiles', user.uid, 'documents');
      console.log('📡 [Documents Page] loadDocuments: Fetching documents from Firestore');
      const querySnapshot = await getDocs(docsRef);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DocumentMetadata));
      
      console.log('✅ [Documents Page] loadDocuments: Documents loaded', {
        count: docs.length,
        documents: docs.map(d => ({
          id: d.id,
          type: d.documentType,
          status: d.processingStatus,
          fileName: d.fileName,
        })),
      });
      
      setDocuments(docs);
    } catch (error) {
      console.error('❌ [Documents Page] loadDocuments: Error loading documents:', error);
    } finally {
      setLoading(false);
      console.log('🏁 [Documents Page] loadDocuments: Loading complete, setLoading(false)');
    }
  };

  const handleFileUpload = async (documentType: DocumentType, file: File) => {
    if (!user || !storage) return;

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
          
          if (!db) {
            alert('Database not available');
            return;
          }
          
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
    // Always include Executive Summary at the top
    const executiveSummary = { type: 'executive-summary' as DocumentType, label: 'Executive Summary', required: false };
    
    if (!userProfile?.fundingType) return [executiveSummary];
    
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
    
    // Remove duplicates and ensure executive-summary is not duplicated
    const uniqueDocs = docs.filter((doc, index, self) =>
      index === self.findIndex(d => d.type === doc.type) && doc.type !== 'executive-summary'
    );
    
    // Return executive summary first, then other documents
    return [executiveSummary, ...uniqueDocs];
  };

  const getDocumentStatus = (docType: DocumentType) => {
    const doc = documents.find(d => d.documentType === docType);
    return doc;
  };

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#406da8] mx-auto mb-4"></div>
          <p className="font-secondary text-[#1a202c]">Loading documents...</p>
        </div>
      </div>
    );
  }

  const availableDocuments = getAvailableDocuments();

  return (
    <div className="min-h-screen bg-[#ffffff]">
      {/* Header */}
      <div className="bg-[#ffffff] border-b border-[#406da8]/30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-primary text-[#406da8]">Document Manager</h1>
              <p className="text-sm font-secondary text-[#1a202c]/80 mt-1">
                Upload your documents for automated application filling
              </p>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 bg-[#ffffff] text-[#1a202c] rounded-lg hover:bg-[#ffffff]/80 transition-all border border-[#406da8]/30 font-secondary"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Comprehensive Processing Meter */}
      {(isProcessing || redirecting) && (
        <div className="mb-6">
          <LoadingMeter loading={isProcessing || redirecting} />
          {processingMessage && (
            <div className="mt-4 p-4 bg-[#ffffff] border border-[#406da8]/30 rounded-xl">
              <p className="text-sm font-secondary text-[#1a202c] text-center">
                {processingMessage}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Info Banner */}
        <div className="bg-[#ffffff] border border-[#406da8]/30 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-primary text-[#406da8] mb-2">How it works:</h3>
          <ol className="text-sm font-secondary text-[#1a202c] list-decimal list-inside space-y-1">
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
            const isSelected = uploadedDoc && uploadedDoc.processingStatus === 'completed';
            
            return (
              <div key={docConfig.type} className={`bg-[#ffffff] border rounded-lg p-6 transition-all ${
                isSelected 
                  ? 'border-[#406da8] shadow-lg shadow-[#406da8]/20' 
                  : 'border-[#406da8]/30 hover:border-[#406da8]/50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-primary text-[#406da8]">
                        {docConfig.label}
                      </h3>
                      {docConfig.required && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30 font-secondary">
                          Required
                        </span>
                      )}
                      {uploadedDoc && (
                        <span className={`px-2 py-1 text-xs rounded font-secondary ${
                          uploadedDoc.processingStatus === 'completed'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : uploadedDoc.processingStatus === 'processing'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : uploadedDoc.processingStatus === 'failed'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {uploadedDoc.processingStatus === 'completed' ? 'Processed' :
                           uploadedDoc.processingStatus === 'processing' ? 'Processing...' :
                           uploadedDoc.processingStatus === 'failed' ? 'Failed' :
                           'Pending'}
                        </span>
                      )}
                    </div>
                    
                    {uploadedDoc && (
                      <p className="text-sm font-secondary text-[#1a202c] mb-2">
                        Current file: {uploadedDoc.fileName} ({(uploadedDoc.fileSize / 1024).toFixed(0)} KB)
                      </p>
                    )}
                    
                    {uploadProgress && (
                      <div className="mb-2">
                        <div className="w-full bg-[#ffffff] border border-[#406da8]/30 rounded-full h-2">
                          <div
                            className="bg-[#406da8] h-2 rounded-full transition-all"
                            style={{ width: `${uploadingFiles[uploadProgress]}%` }}
                          />
                        </div>
                        <p className="text-xs font-secondary text-[#1a202c]/80 mt-1">
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
                      <span className={`px-4 py-2 rounded-lg transition-all inline-block font-secondary ${
                        uploadProgress
                          ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30'
                          : uploadedDoc
                          ? 'bg-[#406da8] text-white hover:bg-[#406da8]/80 border border-[#406da8]'
                          : 'bg-[#406da8] text-white hover:bg-[#406da8]/80 border border-[#406da8]'
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
        <div className="mt-8 bg-[#ffffff] border border-[#406da8]/30 rounded-lg p-6">
          <h3 className="text-lg font-primary text-[#406da8] mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-secondary text-[#1a202c]/80">Total Documents</p>
              <p className="text-2xl font-primary text-[#406da8]">{documents.length}</p>
            </div>
            <div>
              <p className="text-sm font-secondary text-[#1a202c]/80">Processed</p>
              <p className="text-2xl font-primary text-green-400">
                {documents.filter(d => d.processingStatus === 'completed').length}
              </p>
            </div>
            <div>
              <p className="text-sm font-secondary text-[#1a202c]/80">Processing</p>
              <p className="text-2xl font-primary text-yellow-400">
                {documents.filter(d => d.processingStatus === 'processing' || d.processingStatus === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

