import React from 'react';
import { Link } from 'react-router-dom';
import { getAllArticles } from '../data/blogData';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';

function BlogPage() {
  const articles = getAllArticles();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
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
            <Link to="/" className="text-gray-300 hover:text-yellow-400 transition-smooth font-medium flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <Link to="/login" className="text-gray-300 hover:text-yellow-400 transition-smooth font-medium">Login</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-yellow-500/10 blur-3xl animate-pulse-glow" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
            <span className="text-gradient-gold">BIGO Live Host</span>
            <br />
            <span className="text-white">Resources & Guides</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto">
            Expert insights, proven strategies, and success stories to help you thrive as a BIGO Live host
          </p>
        </div>
      </section>

      {/* Blog Articles Grid */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                to={`/blog/${article.slug}`}
                className="group rounded-2xl border border-yellow-500/30 glass overflow-hidden hover-lift transition-smooth hover:border-yellow-500/50 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Article Image */}
                <div className="aspect-video overflow-hidden bg-gradient-to-br from-yellow-500/20 to-amber-500/20">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                
                {/* Article Content */}
                <div className="p-6">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      {article.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-white mb-3 group-hover:text-gradient-gold transition-colors">
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>

                  {/* Read More Link */}
                  <div className="mt-4 pt-4 border-t border-yellow-500/20">
                    <span className="text-yellow-400 text-sm font-medium group-hover:text-yellow-300 transition-colors">
                      Read Full Article →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 border-t border-yellow-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient-gold mb-6">
            Ready to Start Your BIGO Journey?
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Join Level Up Agency and get access to AI coaching, professional training, and a supportive community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/dashboard" 
              className="px-8 py-4 rounded-xl gradient-gold text-black font-bold shadow-gold-lg transition-smooth hover:scale-105"
            >
              Get Started Now
            </Link>
            <Link 
              to="/login" 
              className="px-8 py-4 rounded-xl border-2 border-yellow-500/40 text-yellow-400 font-bold transition-smooth hover:border-yellow-400 hover:bg-yellow-500/10"
            >
              Login to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-yellow-500/30 py-10 text-center text-gray-400 bg-black/50">
        <p className="text-sm font-medium">© {new Date().getFullYear()} Level Up Agency. All rights reserved.</p>
        <p className="text-xs mt-2 text-yellow-500/50">Powered by LVL UP Coach AI Technology</p>
      </footer>
    </div>
  );
}

export default BlogPage;
