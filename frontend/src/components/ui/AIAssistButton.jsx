import React, { useState } from 'react';
import { Button } from './button';
import { toast } from 'sonner';

const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

/**
 * AI Assist Button Component
 * Beautiful button next to inputs for AI-powered fill/improve
 * 
 * Props:
 * - fieldName: Name of the field (e.g., "Event Title", "Description")
 * - currentValue: Current value in the input
 * - onSuggest: Callback with suggested text (value) => void
 * - context: Additional context for AI (optional)
 * - className: Additional CSS classes (optional)
 */
function AIAssistButton({ fieldName, currentValue = '', onSuggest, context = {}, className = '' }) {
  const [loading, setLoading] = useState(false);
  const mode = currentValue.trim() ? 'improve' : 'fill';

  const handleAIAssist = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/ai/assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          field_name: fieldName,
          current_value: currentValue,
          context: context,
          mode: mode
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuggest(data.suggested_text);
        toast.success(mode === 'fill' ? '✨ AI filled the field!' : '✨ AI improved your text!');
      } else {
        toast.error(data.detail || 'AI assist failed');
      }
    } catch (error) {
      console.error('AI assist error:', error);
      toast.error('Failed to get AI suggestion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleAIAssist}
      disabled={loading}
      size="sm"
      className={`
        relative group
        bg-gradient-to-r from-purple-500 to-pink-500 
        hover:from-purple-600 hover:to-pink-600
        text-white font-medium
        shadow-lg hover:shadow-xl
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={mode === 'fill' ? 'Fill with AI' : 'Improve with AI'}
    >
      {loading ? (
        <span className="flex items-center gap-1">
          <span className="inline-block animate-spin">⏳</span>
          <span className="text-xs">AI...</span>
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <span className="text-sm">✨</span>
          <span className="text-xs hidden sm:inline">
            {mode === 'fill' ? 'Fill' : 'Improve'}
          </span>
        </span>
      )}
      
      {/* Tooltip for mobile */}
      {!loading && (
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {mode === 'fill' ? 'Fill with AI ✨' : 'Improve with AI ✨'}
        </span>
      )}
    </Button>
  );
}

export default AIAssistButton;
