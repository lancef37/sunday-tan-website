'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MobileNav from '@/components/MobileNav'

export default function CarePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState<'pre' | 'post'>('pre')

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-tan-50 via-white to-tan-50">
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-tan-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <Link href="/" className="group">
              <h1 className="text-2xl font-serif font-semibold text-tan-900 tracking-wide transition-all duration-300 group-hover:text-tan-700">
                Sunday Tan
              </h1>
              <div className="h-0.5 w-0 bg-tan-500 transition-all duration-300 group-hover:w-full"></div>
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="nav-link">
                Home
              </Link>
              <Link href="/book" className="nav-link">
                Book Now
              </Link>
              <Link href="/care" className="nav-link font-semibold text-tan-700">
                Tan Care
              </Link>
              <Link href="/faq" className="nav-link">
                FAQ
              </Link>
              {isLoggedIn ? (
                <Link href="/account" className="nav-link">
                  My Account
                </Link>
              ) : (
                <Link href="/login" className="nav-link">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-serif font-bold text-tan-900 mb-4">
            Professional Tan Care Guide
          </h1>
          <p className="text-lg text-tan-700 mb-6">
            Expert recommendations for optimal spray tan results and longevity
          </p>
          {/* Professional Disclaimer */}
          <div className="max-w-3xl mx-auto bg-tan-50 border border-tan-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-tan-600 italic">
              These guidelines are based on professional spray tanning best practices.
              Individual results may vary. Always follow the specific instructions provided to you at your appointment.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full bg-tan-100 p-1">
            <button
              onClick={() => setActiveTab('pre')}
              className={`px-8 py-3 rounded-full font-medium transition-all duration-300 ${
                activeTab === 'pre'
                  ? 'bg-tan-900 text-white shadow-lg'
                  : 'text-tan-700 hover:text-tan-900'
              }`}
            >
              Pre-Tan Prep
            </button>
            <button
              onClick={() => setActiveTab('post')}
              className={`px-8 py-3 rounded-full font-medium transition-all duration-300 ${
                activeTab === 'post'
                  ? 'bg-tan-900 text-white shadow-lg'
                  : 'text-tan-700 hover:text-tan-900'
              }`}
            >
              Post-Tan Care
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid lg:grid-cols-2 gap-8">
          {activeTab === 'pre' ? (
            <>
              {/* Pre-Tan Do's */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-tan-100 hover:shadow-2xl transition-shadow duration-300">
                <div className="mb-8 pb-4 border-b border-tan-100">
                  <h2 className="text-2xl font-bold text-tan-900">Essential Preparation</h2>
                  <p className="text-sm text-tan-600 mt-1">24-48 Hours Before Your Appointment</p>
                </div>
                <ul className="space-y-5">
                  <li>
                    <strong className="text-tan-900 text-lg">Exfoliate 24 hours before</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Use a gentle exfoliating mitt or scrub to remove dead skin cells. Pay extra attention to dry areas like elbows, knees, and ankles.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Waxing needs to be done 48 or more hours before. If shaving, please complete 24-48 hours before</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Complete all hair removal at least a day before your appointment to avoid irritation.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Shower the morning of your appointment</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Take a thorough shower using only water and gentle soap. Rinse well to remove all residue. DO NOT apply any lotion, deodorant, or face makeup after this final shower before your appointment.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Wear dark, loose clothing</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Bring loose-fitting, dark cotton clothes and flip-flops to wear after your session.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Remove jewelry and accessories</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Take off all jewelry, watches, and hair accessories before your appointment.</p>
                  </li>
                </ul>
              </div>

              {/* Pre-Tan Don'ts */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-tan-100 hover:shadow-2xl transition-shadow duration-300">
                <div className="mb-8 pb-4 border-b border-tan-100">
                  <h2 className="text-2xl font-bold text-tan-900">Important Restrictions</h2>
                  <p className="text-sm text-tan-600 mt-1">Day of Your Appointment</p>
                </div>
                <ul className="space-y-5">
                  <li>
                    <strong className="text-tan-900 text-lg">Don't apply lotions or oils</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Avoid moisturizers, perfumes, deodorants, or makeup on the day of your appointment. These create barriers.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Don't exercise before your appointment</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Skip the gym on tan day. Sweating can affect how the solution develops on your skin.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Don't get other treatments same day</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Avoid manicures, pedicures, massages, or facials on the day of your spray tan.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Don't wear tight clothing</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Tight bras, socks, or waistbands can leave marks and affect tan development.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Don't arrive with wet hair</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Make sure your hair is completely dry. Wet hair can drip and cause streaking.</p>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* First 24 Hours */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-tan-100 hover:shadow-2xl transition-shadow duration-300">
                <div className="mb-8 pb-4 border-b border-tan-100">
                  <h2 className="text-2xl font-bold text-tan-900">Critical First Day</h2>
                  <p className="text-sm text-tan-600 mt-1">First 24 Hours After Application</p>
                </div>
                <ul className="space-y-5">
                  <li>
                    <strong className="text-tan-900 text-lg">Wait before your first full shower</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Wait at least 8-12 hours before showering. This does not include your warm water rinse.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Pat dry, don't rub</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">After showering, gently pat your skin dry with a towel instead of rubbing.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Avoid water activities</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Any swimming, hot tubs, saunas, or excessive sweating will shorten the life of a spray tan.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Sleep in loose clothing</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Wear loose pajamas and avoid heavy blankets that might cause sweating.</p>
                  </li>
                </ul>
              </div>

              {/* Maintaining Your Tan */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-tan-100 hover:shadow-2xl transition-shadow duration-300">
                <div className="mb-8 pb-4 border-b border-tan-100">
                  <h2 className="text-2xl font-bold text-tan-900">Long-Term Care</h2>
                  <p className="text-sm text-tan-600 mt-1">Maximize Your Tan's Lifespan</p>
                </div>
                <ul className="space-y-5">
                  <li>
                    <strong className="text-tan-900 text-lg">Moisturize daily</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Apply a hydrating, alcohol-free moisturizer twice daily to extend your tan's life. Well-hydrated skin holds color better.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Use gentle products</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Choose sulfate-free body washes and avoid harsh soaps that can strip your tan.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Quick, cool showers</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Take shorter showers with cooler water. Hot water and long soaks will fade your tan faster.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Avoid exfoliation</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Skip exfoliating products and treatments until you're ready for your tan to fade.</p>
                  </li>
                  <li>
                    <strong className="text-tan-900 text-lg">Tan touch-ups</strong>
                    <p className="text-tan-600 mt-1.5 leading-relaxed">Your tan typically lasts 7-10 days. Book your next appointment to maintain your glow!</p>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Quick Tips Section */}
        <div className="mt-12 bg-gradient-to-br from-tan-50 via-white to-amber-50 rounded-2xl p-8 shadow-xl border border-tan-200">
          <h2 className="text-2xl font-bold text-tan-900 mb-8 text-center">Professional Recommendations</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group">
              <div className="bg-gradient-to-br from-white to-tan-50 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 h-full">
                <h3 className="font-bold text-tan-900 mb-2 text-center">Perfect Timing</h3>
                <p className="text-tan-600 text-sm text-center leading-relaxed">Schedule your tan 2 days before your event for optimal color development and settling</p>
              </div>
            </div>
            <div className="group">
              <div className="bg-gradient-to-br from-white to-tan-50 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 h-full">
                <h3 className="font-bold text-tan-900 mb-2 text-center">Optimal Hydration</h3>
                <p className="text-tan-600 text-sm text-center leading-relaxed">Maintain proper hydration before and after your appointment for enhanced tan absorption</p>
              </div>
            </div>
            <div className="group">
              <div className="bg-gradient-to-br from-white to-tan-50 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 h-full">
                <h3 className="font-bold text-tan-900 mb-2 text-center">Personal Support</h3>
                <p className="text-tan-600 text-sm text-center leading-relaxed">Contact me anytime for personalized advice and professional tan care guidance</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <h3 className="text-2xl font-semibold text-tan-900 mb-6">Ready for Your Perfect Glow?</h3>
          <Link 
            href="/book" 
            className="inline-block bg-tan-900 hover:bg-tan-800 text-white font-medium py-4 px-10 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
          >
            Book Your Appointment
          </Link>
        </div>
      </div>
    </div>
  )
}