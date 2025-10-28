"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 mt-auto shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-lg shadow-md shadow-blue-600/20">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm">Student Exchange Portal</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Connecting students worldwide for enriching educational experiences.
                </p>
              </div> */}

          {/* <div>
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">Quick Links</h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li>
                    <a href="#" className="hover:text-blue-600 transition-colors duration-200 font-medium">
                      Browse Programs
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-600 transition-colors duration-200 font-medium">
                      Application Process
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-600 transition-colors duration-200 font-medium">
                      FAQs
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-600 transition-colors duration-200 font-medium">
                      Resources
                    </a>
                  </li>
                </ul>
              </div> */}

          {/* <div>
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">Contact Us</h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <a
                      href="mailto:info@exchange.edu"
                      className="hover:text-blue-600 transition-colors duration-200 font-medium"
                    >
                      info@exchange.edu
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <a
                      href="tel:+1234567890"
                      className="hover:text-blue-600 transition-colors duration-200 font-medium"
                    >
                      +1 (234) 567-890
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="font-medium">Available 24/7</span>
                  </li>
                </ul>
              </div> */}
        </div>

        <div className="border-t border-slate-200 mt-6 pt-5 text-center text-xs text-slate-500 font-medium">
          <p>&copy; 2025 Student Exchange Portal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
