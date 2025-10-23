import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
              alt="Level Up Agency" 
              className="h-8 w-8 object-contain"
            />
            <span className="text-gray-700 font-medium">
              © {currentYear} Level Up Agency
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">Powered by</span>
            <img 
              src="https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp" 
              alt="LVL UP Coach" 
              className="h-6 w-6 object-contain"
            />
            <span className="text-gold-600 font-semibold text-sm">LVL UP Coach</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
