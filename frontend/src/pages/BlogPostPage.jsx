import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag, Share2, Loader } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/blogs/${slug}`);
      setArticle(response.data);
      setError(null);
      
      // Scroll to top when article loads
      window.scrollTo(0, 0);
      
      // Update page title and meta description for SEO
      if (response.data) {
        document.title = `${response.data.title} | Level Up Agency Blog`;
        
        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && response.data.meta_description) {
          metaDescription.setAttribute('content', response.data.meta_description);
        }
      }
    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err.response?.status === 404 ? 'Article not found' : 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-yellow-600" />
          <span className="text-gray-600">Loading article...</span>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient-gold mb-4">{error || 'Article Not Found'}</h1>
          <p className="text-gray-600 mb-8">The article you're looking for doesn't exist or couldn't be loaded.</p>
          <Link 
            to="/blog" 
            className="px-6 py-3 rounded-xl gradient-gold text-black font-bold inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-yellow-500/20 sticky top-0 glass-dark z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
              alt="Level Up Agency" 
              className="h-8 sm:h-10 w-8 sm:w-10 object-contain"
            />
            <span className="font-bold text-base sm:text-lg">Level Up Agency</span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-6 text-sm">
            <Link to="/blog" className="text-gray-700 hover:text-yellow-600 transition-smooth font-medium flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Blog</span>
              <span className="sm:hidden">Blog</span>
            </Link>
            <Link to="/login" className="text-gray-700 hover:text-yellow-600 transition-smooth font-medium">Login</Link>
          </nav>
        </div>
      </header>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-6">
          <Link 
            to="/blog" 
            className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors"
          >
            {article.category}
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-6 text-gray-900">
          {article.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600 mb-8 pb-8 border-b border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(article.published_at || article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{article.read_time}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>By {article.author}</span>
          </div>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 ml-auto text-yellow-600 hover:text-yellow-700 transition-colors"
            aria-label="Share article"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Featured Image */}
        {article.image && (
          <div className="mb-12 rounded-2xl overflow-hidden border border-yellow-500/30">
            <img 
              src={article.image} 
              alt={article.title}
              className="w-full aspect-video object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-lg max-w-none">
          <div className="text-gray-700 leading-relaxed space-y-6">
            {article.content.split('\n\n').map((paragraph, index) => {
              // Handle markdown headings
              if (paragraph.startsWith('# ')) {
                return <h1 key={index} className="text-3xl font-bold text-gray-900 mt-12 mb-6">{paragraph.substring(2)}</h1>;
              }
              if (paragraph.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold text-gradient-gold mt-10 mb-4">{paragraph.substring(3)}</h2>;
              }
              if (paragraph.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-bold text-yellow-600 mt-8 mb-3">{paragraph.substring(4)}</h3>;
              }
              
              // Handle lists
              if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                const items = paragraph.split('\n').filter(line => line.startsWith('- ') || line.startsWith('* '));
                return (
                  <ul key={index} className="list-disc list-inside space-y-2 my-4">
                    {items.map((item, i) => (
                      <li key={i} className="text-gray-700">{item.substring(2)}</li>
                    ))}
                  </ul>
                );
              }
              
              // Handle numbered lists
              if (/^\d+\./.test(paragraph)) {
                const items = paragraph.split('\n').filter(line => /^\d+\./.test(line));
                return (
                  <ol key={index} className="list-decimal list-inside space-y-2 my-4">
                    {items.map((item, i) => (
                      <li key={i} className="text-gray-700">{item.replace(/^\d+\.\s/, '')}</li>
                    ))}
                  </ol>
                );
              }
              
              // Handle bold text and emphasis
              let processedParagraph = paragraph;
              processedParagraph = processedParagraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>');
              processedParagraph = processedParagraph.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
              
              // Regular paragraphs
              return <p key={index} className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: processedParagraph }} />;
            })}
          </div>
        </div>

        {/* Article Footer - CTA */}
        <div className="mt-16 pt-12 border-t border-yellow-500/20">
          <div className="rounded-2xl glass border border-yellow-500/30 p-8 text-center">
            <h3 className="text-2xl font-bold text-gradient-gold mb-4">
              Ready to Apply What You've Learned?
            </h3>
            <p className="text-gray-700 mb-6">
              Join Level Up Agency and get personalized AI coaching, professional training, and support from our community
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/dashboard" 
                className="px-8 py-3 rounded-xl gradient-gold text-black font-bold shadow-gold-lg transition-smooth hover:scale-105"
              >
                Get Started Today
              </Link>
              <Link 
                to="/blog" 
                className="px-8 py-3 rounded-xl border-2 border-yellow-500/40 text-yellow-400 font-bold transition-smooth hover:border-yellow-400 hover:bg-yellow-500/10"
              >
                Read More Articles
              </Link>
            </div>
          </div>
        </div>

        {/* SEO Keywords (hidden) */}
        {article.seo_keywords && article.seo_keywords.length > 0 && (
          <div className="hidden">
            {article.seo_keywords.map((keyword, index) => (
              <span key={index}>{keyword}</span>
            ))}
          </div>
        )}
      </article>

      {/* Footer */}
      <footer className="border-t border-yellow-500/30 py-10 text-center text-gray-400 bg-black/50">
        <p className="text-sm font-medium">© {new Date().getFullYear()} Level Up Agency. All rights reserved.</p>
        <p className="text-xs mt-2 text-yellow-500/50">Powered by LVL UP Coach AI Technology</p>
      </footer>
    </div>
  );
}

export default BlogPostPage;
