'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { FundingType, Timeline, Interest } from '@/types';
import FundingTypeStep from '@/components/onboarding/FundingTypeStep';
import TimelineStep from '@/components/onboarding/TimelineStep';
import InterestsStep from '@/components/onboarding/InterestsStep';
import EntityStep from '@/components/onboarding/EntityStep';
import { doc, getDoc, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { suggestNegativeKeywordsForKeywords } from '@/lib/keywordSuggestions';

// AI-extracted business profile fields
interface BusinessProfile {
  companyOverview: string;
  mission: string;
  vision: string;
  servicesCapabilities: string[];
  pastPerformance: string[];
  teamExperience: string[];
  approachMethodology: string;
  pricingModel: string;
  certifications: string[];
  problemStatementExamples: string[];
  proposedSolutionExamples: string[];
  outcomesImpact: string[];
  keywords?: string[];
  lastUpdated?: string;
}

export default function ProfilePage() {
  const { user, userProfile, updateUserProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [fundingTypes, setFundingTypes] = useState<FundingType[]>([]);
  const [timeline, setTimeline] = useState<Timeline>('immediate');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [positiveKeywords, setPositiveKeywords] = useState<string[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<string[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<{
    positive: string[];
    negative: string[];
  }>({ positive: [], negative: [] });
  const [loading, setLoading] = useState(false);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showKeywordMessage, setShowKeywordMessage] = useState(false);

  // Check for redirect message from documents page
  useEffect(() => {
    if (!searchParams) return;
    const message = searchParams.get('message');
    if (message === 'Approve keywords') {
      setShowKeywordMessage(true);
      // Auto-expand keyword suggestions section
      setActiveSection('keywords');
      // Scroll to keyword section after a brief delay
      setTimeout(() => {
        const keywordSection = document.getElementById('keyword-suggestions');
        if (keywordSection) {
          keywordSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [searchParams]);
  
  // AI-extracted business profile data
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    companyOverview: '',
    mission: '',
    vision: '',
    servicesCapabilities: [],
    pastPerformance: [],
    teamExperience: [],
    approachMethodology: '',
    pricingModel: '',
    certifications: [],
    problemStatementExamples: [],
    proposedSolutionExamples: [],
    outcomesImpact: [],
    keywords: [],
  });

  // Load current profile data
  useEffect(() => {
    if (userProfile) {
      setFundingTypes(userProfile.fundingType || []);
      setTimeline(userProfile.timeline || 'immediate');
      setInterests(userProfile.interestsMain || []);
      setEntityName(userProfile.entityName || '');
      setEntityType(userProfile.entityType || '');
      setKeywords(userProfile.keywords || []);
      setPositiveKeywords(userProfile.positiveKeywords || []);
      setNegativeKeywords(userProfile.negativeKeywords || []);
    }
  }, [userProfile]);

  // Load AI-extracted business profile
  useEffect(() => {
    if (user) {
      loadBusinessProfile();
    }
  }, [user]);

  const loadBusinessProfile = async () => {
    if (!user) return;
    
    if (!db) return;
    
    setLoadingBusiness(true);
    try {
      const businessProfileRef = doc(db, 'profiles', user.uid, 'businessProfile', 'master');
      const businessProfileSnap = await getDoc(businessProfileRef);
      
      if (businessProfileSnap.exists()) {
        const data = businessProfileSnap.data() as any;
        setBusinessProfile({
          companyOverview: data.companyOverview || '',
          mission: data.mission || '',
          vision: data.vision || '',
          servicesCapabilities: data.servicesCapabilities || [],
          pastPerformance: data.pastPerformance || [],
          teamExperience: data.teamExperience || [],
          approachMethodology: data.approachMethodology || '',
          pricingModel: data.pricingModel || '',
          certifications: data.certifications || [],
          problemStatementExamples: data.problemStatementExamples || [],
          proposedSolutionExamples: data.proposedSolutionExamples || [],
          outcomesImpact: data.outcomesImpact || [],
          keywords: data.keywords || [],
          lastUpdated: data.lastUpdated,
        });
        
        // Load keywords from business profile and merge with user profile keywords
        const allKeywords = [
          ...(userProfile?.keywords || []),
          ...(data.keywords || [])
        ];
        // Deduplicate
        const uniqueKeywords = [...new Set(allKeywords.map(k => k.toLowerCase().trim()).filter(k => k.length > 0))];
        setKeywords(uniqueKeywords);
        
        // Load keyword suggestions from AI extraction
        if (data.positiveKeywordSuggestions || data.negativeKeywordSuggestions) {
          setKeywordSuggestions({
            positive: data.positiveKeywordSuggestions || [],
            negative: data.negativeKeywordSuggestions || [],
          });
        }
        
        // Load current positive/negative keywords from user profile
        setPositiveKeywords(userProfile?.positiveKeywords || []);
        setNegativeKeywords(userProfile?.negativeKeywords || []);
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
    } finally {
      setLoadingBusiness(false);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSave = async () => {
    if (!fundingTypes.length || !timeline || !interests.length || !entityName || !entityType) {
      alert('Please complete all required fields');
      return;
    }

    setLoading(true);
    try {
      // Save basic profile
      await updateUserProfile({
        fundingType: fundingTypes,
        timeline: timeline,
        interestsMain: interests,
        grantsByInterest: interests,
        entityName: entityName,
        entityType: entityType,
        keywords: keywords,
        positiveKeywords: positiveKeywords,
        negativeKeywords: negativeKeywords,
        updatedAt: new Date(),
      } as any);

      // Save business profile (AI-extracted fields) - also update keywords
      if (user && db) {
        const businessProfileRef = doc(db, 'profiles', user.uid, 'businessProfile', 'master');
        await setDoc(businessProfileRef, {
          ...businessProfile,
          keywords: keywords, // Sync keywords to business profile too
          lastUpdated: new Date().toISOString(),
        }, { merge: true });
      }

      alert('Profile updated successfully!');
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.replace('/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for business profile updates
  const updateTextField = (field: keyof BusinessProfile, value: string) => {
    setBusinessProfile(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: keyof BusinessProfile, value: string[]) => {
    setBusinessProfile(prev => ({ ...prev, [field]: value }));
  };

  const addArrayItem = (field: keyof BusinessProfile) => {
    const current = businessProfile[field] as string[];
    updateArrayField(field, [...current, '']);
  };

  const removeArrayItem = (field: keyof BusinessProfile, index: number) => {
    const current = businessProfile[field] as string[];
    updateArrayField(field, current.filter((_, i) => i !== index));
  };

  const updateArrayItem = (field: keyof BusinessProfile, index: number, value: string) => {
    const current = businessProfile[field] as string[];
    const updated = [...current];
    updated[index] = value;
    updateArrayField(field, updated);
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-secondary text-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-surface/50 backdrop-blur-sm border-b border-primary/20 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-primary gradient-text">Edit Profile</h1>
              <p className="text-sm font-secondary text-foreground/70 mt-1">
                Update your preferences to get better opportunity matches
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Funding Types Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-primary gradient-text">Funding Types</h2>
              <button
                onClick={() => setActiveSection(activeSection === 'funding' ? null : 'funding')}
                className="text-primary hover:text-primary-light text-sm font-secondary"
              >
                {activeSection === 'funding' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'funding' ? (
              <FundingTypeStep
                selected={fundingTypes}
                onChange={setFundingTypes}
              />
            ) : (
              <div className="flex gap-2 flex-wrap">
                {fundingTypes.map(type => (
                  <span key={type} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-secondary border border-primary/30">
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-primary gradient-text">Timeline</h2>
              <button
                onClick={() => setActiveSection(activeSection === 'timeline' ? null : 'timeline')}
                className="text-primary hover:text-primary-light text-sm font-secondary"
              >
                {activeSection === 'timeline' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'timeline' ? (
              <TimelineStep
                selected={timeline}
                onChange={setTimeline}
              />
            ) : (
              <p className="font-secondary text-foreground">{timeline}</p>
            )}
          </div>

          {/* Interests Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-primary gradient-text">Areas of Interest</h2>
              <button
                onClick={() => setActiveSection(activeSection === 'interests' ? null : 'interests')}
                className="text-primary hover:text-primary-light text-sm font-secondary"
              >
                {activeSection === 'interests' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'interests' ? (
              <InterestsStep
                selected={interests}
                onChange={setInterests}
              />
            ) : (
              <div className="flex gap-2 flex-wrap">
                {interests.map(interest => (
                  <span key={interest} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-secondary border border-primary/30">
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Entity Information Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-primary gradient-text">Organization Information</h2>
              <button
                onClick={() => setActiveSection(activeSection === 'entity' ? null : 'entity')}
                className="text-primary hover:text-primary-light text-sm font-secondary"
              >
                {activeSection === 'entity' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'entity' ? (
              <EntityStep
                entityName={entityName}
                entityType={entityType as any}
                onChangeEntityName={setEntityName}
                onChangeEntityType={(type) => setEntityType(type)}
              />
            ) : (
              <div>
                <p className="font-secondary text-foreground font-medium">{entityName}</p>
                <p className="font-secondary text-foreground/70 text-sm capitalize">{entityType}</p>
              </div>
            )}
          </div>

          {/* Keywords Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-primary gradient-text">Keywords</h2>
                <p className="text-sm font-secondary text-foreground/70 mt-1">
                  Keywords extracted from your documents or manually added. These help refine your opportunity matches.
                </p>
              </div>
              <button
                onClick={() => setActiveSection(activeSection === 'keywords' ? null : 'keywords')}
                className="text-primary hover:text-primary-light text-sm font-secondary"
              >
                {activeSection === 'keywords' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'keywords' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {keywords.map((keyword, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => {
                          const updated = [...keywords];
                          updated[index] = e.target.value;
                          setKeywords(updated);
                        }}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                        placeholder="Enter keyword..."
                      />
                      <button
                        onClick={() => setKeywords(keywords.filter((_, i) => i !== index))}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setKeywords([...keywords, ''])}
                  className="w-full px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
                >
                  + Add Keyword
                </button>
                {businessProfile.keywords && businessProfile.keywords.length > 0 && (
                  <div className="mt-4 p-3 bg-[#1d1d1e] border border-[#ad3c94]/20 rounded-lg">
                    <p className="text-sm font-secondary text-[#e7e8ef]/80 mb-2">
                      Keywords from documents (click to add):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {businessProfile.keywords
                        .filter(k => !keywords.includes(k))
                        .map((keyword, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              if (!keywords.includes(keyword)) {
                                setKeywords([...keywords, keyword]);
                              }
                            }}
                            className="px-3 py-1 bg-[#ad3c94]/20 text-[#ad3c94] rounded-full text-sm font-secondary hover:bg-[#ad3c94]/30 transition-all border border-[#ad3c94]/30"
                          >
                            + {keyword}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {keywords.length > 0 ? (
                  keywords.map((keyword, index) => (
                    <span key={index} className="px-3 py-1 bg-[#ad3c94]/20 text-[#ad3c94] rounded-full text-sm font-secondary border border-[#ad3c94]/30">
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className="font-secondary text-[#e7e8ef]/60 italic">No keywords added yet</p>
                )}
              </div>
            )}
          </div>

          {/* Keyword Suggestions Section */}
          {(keywordSuggestions.positive.length > 0 || keywordSuggestions.negative.length > 0) && (
            <div id="keyword-suggestions" className="card">
              {showKeywordMessage && (
                <div className="mb-4 p-4 bg-[#ad3c94]/20 border-2 border-[#ad3c94] rounded-xl">
                  <p className="text-lg font-primary text-[#ad3c94] font-bold mb-2">
                    ⚠️ Approve Keywords
                  </p>
                  <p className="text-sm font-secondary text-[#e7e8ef]">
                    Your documents have been processed. Please review and accept or decline the AI-suggested keywords below to improve your opportunity matching.
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-primary gradient-text">AI Keyword Suggestions</h2>
                  <p className="text-sm font-secondary text-foreground/70 mt-1">
                    AI-generated keyword suggestions from your documents. Accept or decline to refine your matching.
                  </p>
                </div>
              </div>
              
              {/* Positive Keyword Suggestions */}
              {keywordSuggestions.positive.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold font-secondary text-green-400 mb-3">
                    Positive Keywords (Prioritize these)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {keywordSuggestions.positive
                      .filter(k => !positiveKeywords.includes(k))
                      .map((keyword, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                          <span className="text-sm font-secondary text-green-300">{keyword}</span>
                          <button
                            onClick={() => {
                              if (!positiveKeywords.includes(keyword)) {
                                setPositiveKeywords([...positiveKeywords, keyword]);
                                // Remove from suggestions
                                setKeywordSuggestions(prev => ({
                                  ...prev,
                                  positive: prev.positive.filter(k => k !== keyword)
                                }));
                              }
                            }}
                            className="text-green-400 hover:text-green-300 text-xs font-secondary"
                            title="Accept"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              // Remove from suggestions
                              setKeywordSuggestions(prev => ({
                                ...prev,
                                positive: prev.positive.filter(k => k !== keyword)
                              }));
                            }}
                            className="text-red-400 hover:text-red-300 text-xs font-secondary"
                            title="Decline"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                  {positiveKeywords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-secondary text-foreground/60 mb-2">Accepted:</p>
                      <div className="flex flex-wrap gap-2">
                        {positiveKeywords.map((keyword, index) => (
                          <span key={index} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-secondary border border-green-500/30">
                            {keyword}
                            <button
                              onClick={() => setPositiveKeywords(positiveKeywords.filter((_, i) => i !== index))}
                              className="ml-2 text-green-400 hover:text-green-300"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Negative Keyword Suggestions */}
              {keywordSuggestions.negative.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold font-secondary text-red-400 mb-3">
                    Negative Keywords (Exclude these)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {keywordSuggestions.negative
                      .filter(k => !negativeKeywords.includes(k))
                      .map((keyword, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full">
                          <span className="text-sm font-secondary text-red-300">{keyword}</span>
                          <button
                            onClick={() => {
                              if (!negativeKeywords.includes(keyword)) {
                                setNegativeKeywords([...negativeKeywords, keyword]);
                                // Remove from suggestions
                                setKeywordSuggestions(prev => ({
                                  ...prev,
                                  negative: prev.negative.filter(k => k !== keyword)
                                }));
                              }
                            }}
                            className="text-red-400 hover:text-red-300 text-xs font-secondary"
                            title="Accept"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              // Remove from suggestions
                              setKeywordSuggestions(prev => ({
                                ...prev,
                                negative: prev.negative.filter(k => k !== keyword)
                              }));
                            }}
                            className="text-gray-400 hover:text-gray-300 text-xs font-secondary"
                            title="Decline"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                  {negativeKeywords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-secondary text-foreground/60 mb-2">Accepted:</p>
                      <div className="flex flex-wrap gap-2">
                        {negativeKeywords.map((keyword, index) => (
                          <span key={index} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-secondary border border-red-500/30">
                            {keyword}
                            <button
                              onClick={() => setNegativeKeywords(negativeKeywords.filter((_, i) => i !== index))}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manual Positive/Negative Keywords Section */}
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-primary gradient-text">Keyword Preferences</h2>
                <p className="text-sm font-secondary text-foreground/70 mt-1">
                  Manually add keywords to prioritize (positive) or exclude (negative) from your opportunity matching.
                </p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Positive Keywords */}
              <div>
                <h3 className="text-sm font-semibold font-secondary text-green-400 mb-3">
                  Positive Keywords (Prioritize)
                </h3>
                <div className="space-y-2">
                  {positiveKeywords.map((keyword, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => {
                          const updated = [...positiveKeywords];
                          updated[index] = e.target.value;
                          setPositiveKeywords(updated);
                        }}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-green-500/30 rounded-lg font-secondary text-[#e7e8ef] focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="Enter keyword..."
                      />
                      <button
                        onClick={() => setPositiveKeywords(positiveKeywords.filter((_, i) => i !== index))}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={async () => {
                      const newKeyword = '';
                      setPositiveKeywords([...positiveKeywords, newKeyword]);
                      
                      // Auto-suggest related negative keywords when user adds a positive keyword
                      // This happens after they type and save, but we can show suggestions
                    }}
                    className="w-full px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-secondary border border-green-500/30"
                  >
                    + Add Positive Keyword
                  </button>
                  {positiveKeywords.length > 0 && (
                    <button
                      onClick={() => {
                        // Suggest related negative keywords for all positive keywords
                        const suggestions = suggestNegativeKeywordsForKeywords(
                          positiveKeywords.filter(k => k.trim().length > 0),
                          negativeKeywords
                        );
                        
                        if (suggestions.length > 0) {
                          // Add suggestions to keyword suggestions (AI suggestions section)
                          setKeywordSuggestions(prev => ({
                            ...prev,
                            negative: [...(prev.negative || []), ...suggestions.filter(s => !prev.negative?.includes(s))]
                          }));
                          alert(`💡 Suggested ${suggestions.length} related negative keywords based on your positive keywords. Check the "AI Keyword Suggestions" section above to review and accept them.`);
                        } else {
                          alert('No related negative keywords to suggest at this time.');
                        }
                      }}
                      className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-secondary border border-blue-500/30 mt-2"
                      title="Get suggestions for negative keywords based on your positive keywords"
                    >
                      💡 Suggest Related Negative Keywords
                    </button>
                  )}
                </div>
              </div>

              {/* Negative Keywords */}
              <div>
                <h3 className="text-sm font-semibold font-secondary text-red-400 mb-3">
                  Negative Keywords (Exclude)
                </h3>
                <div className="space-y-2">
                  {negativeKeywords.map((keyword, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => {
                          const updated = [...negativeKeywords];
                          updated[index] = e.target.value;
                          setNegativeKeywords(updated);
                        }}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-red-500/30 rounded-lg font-secondary text-[#e7e8ef] focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        placeholder="Enter keyword..."
                      />
                      <button
                        onClick={() => setNegativeKeywords(negativeKeywords.filter((_, i) => i !== index))}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setNegativeKeywords([...negativeKeywords, ''])}
                    className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary border border-red-500/30"
                  >
                    + Add Negative Keyword
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI-Extracted Business Profile Section */}
          <div className="bg-[#1d1d1e] border border-white rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-primary text-[#ad3c94] flex items-center gap-2">
                  Application Generation
                </h2>
                <p className="text-sm font-secondary text-[#e7e8ef]/80 mt-1">
                  Information automatically extracted from your uploaded documents. Edit as needed.
                </p>
                {businessProfile.lastUpdated && (
                  <p className="text-xs font-secondary text-[#e7e8ef]/60 mt-1">
                    Last updated: {new Date(businessProfile.lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveSection(activeSection === 'business' ? null : 'business')}
                className="text-[#ad3c94] hover:text-[#ad3c94]/80 text-sm font-secondary"
              >
                {activeSection === 'business' ? 'Collapse' : 'Edit'}
              </button>
            </div>

            {loadingBusiness ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ad3c94] mx-auto"></div>
                <p className="font-secondary text-[#e7e8ef]/80 mt-2 text-sm">Loading business profile...</p>
              </div>
            ) : activeSection === 'business' ? (
              <div className="space-y-6">
                {/* Company Overview */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Company Overview
                  </label>
                  <textarea
                    value={businessProfile.companyOverview}
                    onChange={(e) => updateTextField('companyOverview', e.target.value)}
                    className="w-full px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                    rows={3}
                    placeholder="Brief company description, what you do, who you serve..."
                  />
                </div>

                {/* Mission */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Mission Statement
                  </label>
                  <textarea
                    value={businessProfile.mission}
                    onChange={(e) => updateTextField('mission', e.target.value)}
                    className="w-full px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                    rows={2}
                    placeholder="Your organization's mission..."
                  />
                </div>

                {/* Vision */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Vision Statement
                  </label>
                  <textarea
                    value={businessProfile.vision}
                    onChange={(e) => updateTextField('vision', e.target.value)}
                    className="w-full px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                    rows={2}
                    placeholder="Your organization's vision..."
                  />
                </div>

                {/* Services & Capabilities */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Services & Capabilities
                  </label>
                  {businessProfile.servicesCapabilities.map((service, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={service}
                        onChange={(e) => updateArrayItem('servicesCapabilities', index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                        placeholder="Service or capability..."
                      />
                      <button
                        onClick={() => removeArrayItem('servicesCapabilities', index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('servicesCapabilities')}
                    className="mt-2 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary text-sm"
                  >
                    + Add Service/Capability
                  </button>
                </div>

                {/* Past Performance */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Past Performance & Projects
                  </label>
                  {businessProfile.pastPerformance.map((project, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <textarea
                        value={project}
                        onChange={(e) => updateArrayItem('pastPerformance', index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                        rows={2}
                        placeholder="Past project or performance example..."
                      />
                      <button
                        onClick={() => removeArrayItem('pastPerformance', index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('pastPerformance')}
                    className="mt-2 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary text-sm"
                  >
                    + Add Past Performance
                  </button>
                </div>

                {/* Team Experience */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Team Experience & Key Personnel
                  </label>
                  {businessProfile.teamExperience.map((member, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <textarea
                        value={member}
                        onChange={(e) => updateArrayItem('teamExperience', index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                        rows={2}
                        placeholder="Team member name, role, and relevant experience..."
                      />
                      <button
                        onClick={() => removeArrayItem('teamExperience', index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('teamExperience')}
                    className="mt-2 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary text-sm"
                  >
                    + Add Team Member
                  </button>
                </div>

                {/* Approach & Methodology */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Approach & Methodology
                  </label>
                  <textarea
                    value={businessProfile.approachMethodology}
                    onChange={(e) => updateTextField('approachMethodology', e.target.value)}
                    className="w-full px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                    rows={3}
                    placeholder="How you approach projects and your methodology..."
                  />
                </div>

                {/* Pricing Model */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Pricing Model
                  </label>
                  <textarea
                    value={businessProfile.pricingModel}
                    onChange={(e) => updateTextField('pricingModel', e.target.value)}
                    className="w-full px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                    rows={2}
                    placeholder="Your pricing strategy, rates, or fee structure..."
                  />
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Certifications & Qualifications
                  </label>
                  {businessProfile.certifications.map((cert, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={cert}
                        onChange={(e) => updateArrayItem('certifications', index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                        placeholder="Certification (e.g., MBE, ISO 9001, etc.)..."
                      />
                      <button
                        onClick={() => removeArrayItem('certifications', index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('certifications')}
                    className="mt-2 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary text-sm"
                  >
                    + Add Certification
                  </button>
                </div>

                {/* Problem Statement Examples */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Problem Statement Examples (for grants/proposals)
                  </label>
                  {businessProfile.problemStatementExamples.map((problem, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <textarea
                        value={problem}
                        onChange={(e) => updateArrayItem('problemStatementExamples', index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                        rows={2}
                        placeholder="Problem statement example..."
                      />
                      <button
                        onClick={() => removeArrayItem('problemStatementExamples', index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('problemStatementExamples')}
                    className="mt-2 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary text-sm"
                  >
                    + Add Problem Statement
                  </button>
                </div>

                {/* Proposed Solution Examples */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Proposed Solution Examples (for grants/proposals)
                  </label>
                  {businessProfile.proposedSolutionExamples.map((solution, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <textarea
                        value={solution}
                        onChange={(e) => updateArrayItem('proposedSolutionExamples', index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                        rows={2}
                        placeholder="Solution example..."
                      />
                      <button
                        onClick={() => removeArrayItem('proposedSolutionExamples', index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('proposedSolutionExamples')}
                    className="mt-2 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary text-sm"
                  >
                    + Add Solution Example
                  </button>
                </div>

                {/* Outcomes & Impact */}
                <div>
                  <label className="block text-sm font-medium font-secondary text-[#e7e8ef] mb-2">
                    Outcomes & Impact
                  </label>
                  {businessProfile.outcomesImpact.map((outcome, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <textarea
                        value={outcome}
                        onChange={(e) => updateArrayItem('outcomesImpact', index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:outline-none focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
                        rows={2}
                        placeholder="Outcome, impact metric, or success story..."
                      />
                      <button
                        onClick={() => removeArrayItem('outcomesImpact', index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('outcomesImpact')}
                    className="mt-2 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary text-sm"
                  >
                    + Add Outcome/Impact
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {businessProfile.companyOverview && (
                  <div>
                    <p className="font-medium font-secondary text-[#e7e8ef]">Company Overview:</p>
                    <p className="font-secondary text-[#e7e8ef]/80">{businessProfile.companyOverview}</p>
                  </div>
                )}
                {businessProfile.mission && (
                  <div>
                    <p className="font-medium font-secondary text-[#e7e8ef]">Mission:</p>
                    <p className="font-secondary text-[#e7e8ef]/80">{businessProfile.mission}</p>
                  </div>
                )}
                {businessProfile.servicesCapabilities.length > 0 && (
                  <div>
                    <p className="font-medium font-secondary text-[#e7e8ef]">Services & Capabilities:</p>
                    <ul className="list-disc list-inside font-secondary text-[#e7e8ef]/80">
                      {businessProfile.servicesCapabilities.slice(0, 3).map((service, i) => (
                        <li key={i}>{service}</li>
                      ))}
                      {businessProfile.servicesCapabilities.length > 3 && (
                        <li>...and {businessProfile.servicesCapabilities.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
                {businessProfile.certifications.length > 0 && (
                  <div>
                    <p className="font-medium font-secondary text-[#e7e8ef]">Certifications:</p>
                    <div className="flex gap-2 flex-wrap">
                      {businessProfile.certifications.map((cert, i) => (
                        <span key={i} className="px-2 py-1 bg-[#ad3c94]/20 text-[#ad3c94] rounded-full text-xs font-secondary border border-[#ad3c94]/30">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!businessProfile.companyOverview && !businessProfile.mission && businessProfile.servicesCapabilities.length === 0 && (
                  <p className="font-secondary text-[#e7e8ef]/60 italic">No business information extracted yet. Upload documents to automatically populate these fields.</p>
                )}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-[#1d1d1e] text-[#e7e8ef] rounded-lg hover:bg-[#1d1d1e]/80 transition-all border border-[#ad3c94]/30 font-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-secondary"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

