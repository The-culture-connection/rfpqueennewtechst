'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';

interface KeywordManagerProps {
  user: any;
  userProfile: UserProfile | null;
  onUpdate?: () => void;
}

export default function KeywordManager({ user, userProfile, onUpdate }: KeywordManagerProps) {
  const [positiveKeywords, setPositiveKeywords] = useState<string[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<string[]>([]);
  const [newPositive, setNewPositive] = useState('');
  const [newNegative, setNewNegative] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setPositiveKeywords(userProfile.positiveKeywords || []);
      setNegativeKeywords(userProfile.negativeKeywords || []);
    }
  }, [userProfile]);

  const addPositiveKeyword = async () => {
    if (!newPositive.trim() || !user) return;
    const keyword = newPositive.trim().toLowerCase();
    if (positiveKeywords.includes(keyword)) return;
    
    const updated = [...positiveKeywords, keyword];
    setPositiveKeywords(updated);
    setNewPositive('');
    await saveKeywords(updated, negativeKeywords);
  };

  const removePositiveKeyword = async (keyword: string) => {
    const updated = positiveKeywords.filter(k => k !== keyword);
    setPositiveKeywords(updated);
    await saveKeywords(updated, negativeKeywords);
  };

  const addNegativeKeyword = async () => {
    if (!newNegative.trim() || !user) return;
    const keyword = newNegative.trim().toLowerCase();
    if (negativeKeywords.includes(keyword)) return;
    
    const updated = [...negativeKeywords, keyword];
    setNegativeKeywords(updated);
    setNewNegative('');
    await saveKeywords(positiveKeywords, updated);
  };

  const removeNegativeKeyword = async (keyword: string) => {
    const updated = negativeKeywords.filter(k => k !== keyword);
    setNegativeKeywords(updated);
    await saveKeywords(positiveKeywords, updated);
  };

  const saveKeywords = async (positive: string[], negative: string[]) => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await setDoc(profileRef, {
        positiveKeywords: positive,
        negativeKeywords: negative
      }, { merge: true });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving keywords:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-primary text-[#ad3c94] mb-4">Keyword Preferences</h3>
      
      {/* Positive Keywords */}
      <div className="mb-4">
        <label className="block text-sm font-secondary text-[#e7e8ef] mb-2">
          Include More (Positive Keywords)
        </label>
        <p className="text-xs text-[#e7e8ef]/60 mb-2">
          Add keywords to prioritize opportunities that include these terms
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newPositive}
            onChange={(e) => setNewPositive(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addPositiveKeyword()}
            placeholder="e.g., youth, STEM, community"
            className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded text-[#e7e8ef] placeholder-[#e7e8ef]/40 focus:outline-none focus:border-[#ad3c94]"
          />
          <button
            onClick={addPositiveKeyword}
            disabled={!newPositive.trim() || saving}
            className="px-4 py-2 bg-[#ad3c94] text-white rounded hover:bg-[#ad3c94]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {positiveKeywords.map((keyword) => (
            <span
              key={keyword}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#ad3c94]/20 border border-[#ad3c94]/50 rounded text-sm text-[#ad3c94]"
            >
              {keyword}
              <button
                onClick={() => removePositiveKeyword(keyword)}
                className="hover:text-[#ad3c94]/80"
                title="Remove keyword"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Negative Keywords */}
      <div>
        <label className="block text-sm font-secondary text-[#e7e8ef] mb-2">
          Exclude (Negative Keywords)
        </label>
        <p className="text-xs text-[#e7e8ef]/60 mb-2">
          Add keywords to filter out opportunities that include these terms
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newNegative}
            onChange={(e) => setNewNegative(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addNegativeKeyword()}
            placeholder="e.g., postdoctoral, hardware, international"
            className="flex-1 px-3 py-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded text-[#e7e8ef] placeholder-[#e7e8ef]/40 focus:outline-none focus:border-[#ad3c94]"
          />
          <button
            onClick={addNegativeKeyword}
            disabled={!newNegative.trim() || saving}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {negativeKeywords.map((keyword) => (
            <span
              key={keyword}
              className="inline-flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-600/50 rounded text-sm text-red-400"
            >
              {keyword}
              <button
                onClick={() => removeNegativeKeyword(keyword)}
                className="hover:text-red-400/80"
                title="Remove keyword"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

