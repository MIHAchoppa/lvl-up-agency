import React, { useMemo } from 'react';
import { Mic, Users, Video, Calendar, MessageCircle, TrendingUp } from 'lucide-react';

// Static features array moved outside component to prevent recreation on every render
const FEATURES_DATA = [
  {
    id: 'ai-voice',
    IconComponent: Mic,
    title: "AI Voice Coaching",
    description: "Get personalized coaching from LVL UP Coach, your AI-powered voice assistant that helps you improve your streaming skills in real-time."
  },
  {
    id: 'auditions',
    IconComponent: Video,
    title: "Easy Auditions",
    description: "Upload your audition video directly through our platform and get fast feedback from our experienced team."
  },
  {
    id: 'events',
    IconComponent: Calendar,
    title: "Event Management",
    description: "Never miss an important stream event. Our calendar keeps you organized with automatic reminders and RSVP tracking."
  },
  {
    id: 'chat',
    IconComponent: MessageCircle,
    title: "Community Chat",
    description: "Connect with fellow hosts, share tips, and grow together in our supportive group chat environment."
  },
  {
    id: 'analytics',
    IconComponent: TrendingUp,
    title: "Growth Analytics",
    description: "Track your progress with detailed analytics and get insights on how to maximize your earnings and viewer engagement."
  },
  {
    id: 'support',
    IconComponent: Users,
    title: "Agency Support",
    description: "Join a thriving community of hosts with dedicated support from Level Up Agency mentors and staff."
  }
];

// Memoized Feature Card component to prevent unnecessary re-renders
const FeatureCard = React.memo(({ feature }) => {
  const IconComponent = feature.IconComponent;
  
  return (
    <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 card-hover">
      <div className="w-16 h-16 bg-gold-100 rounded-lg flex items-center justify-center mb-6 text-gold-600">
        <IconComponent className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-semibold font-serif text-gray-900 mb-3">
        {feature.title}
      </h3>
      <p className="text-gray-600 leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';

function LvlUpRecruitr() {

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-serif text-gray-900 mb-4">
            Why Choose Level Up Agency?
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Join hundreds of successful BIGO Live hosts who have transformed their streaming careers with our AI-powered platform and expert guidance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES_DATA.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-gold-500 to-gold-600 rounded-2xl p-8 md:p-12 text-center shadow-xl">
          <h3 className="text-3xl md:text-4xl font-bold font-serif text-white mb-4">
            Ready to Level Up?
          </h3>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Start your journey with LVL UP Coach and join our community of successful BIGO Live hosts today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-white text-gold-600 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors shadow-lg btn-glow">
              Start Your Audition
            </button>
            <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Memoize the entire component since it has no props and doesn't change
export default React.memo(LvlUpRecruitr);
