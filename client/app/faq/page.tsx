'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MobileNav from '../../components/MobileNav'

interface FAQItem {
  question: string
  answer: string
}

export default function FAQPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  const faqData: FAQItem[] = [
    {
      question: 'Do you do spray tan parties?',
      answer: 'Yes! Text me to schedule a spray tan party. Must be 5+ individuals if you want me to come to you. You also must be an established client for mobile tans.'
    },
    {
      question: 'Do you do mobile tans?',
      answer: 'Yes for parties of 5 or more. You must be an established client for mobile tans. Text me to schedule a mobile service.'
    },
    {
      question: 'How long does a spray tan last?',
      answer: 'A professional spray tan typically lasts 7-10 days, depending on your skin type, lifestyle, and aftercare routine. Following our pre and post-tan care guidelines will help maximize the longevity of your tan.'
    },
    {
      question: 'Is spray tanning safe?',
      answer: 'Yes! Our spray tanning solution contains DHA (dihydroxyacetone), a colorless sugar that interacts with amino acids in your skin\'s surface layer. It\'s FDA-approved for external use and has been safely used in cosmetics for decades. The process is completely UV-free, making it a much safer alternative to tanning beds.'
    },
    {
      question: 'Will I turn orange?',
      answer: 'No! My professional-grade solutions are carefully formulated to create natural-looking, golden-brown tans. Orange tans are typically caused by low-quality products or incorrect application. I will customize the solution to match your skin tone for the most natural results.'
    },
    {
      question: 'Can I get a spray tan if I\'m pregnant or breastfeeding?',
      answer: 'While DHA is considered safe for external use, I recommend consulting with your healthcare provider before getting a spray tan during pregnancy or while breastfeeding. Many clients choose to wait until after their first trimester.'
    },
    {
      question: 'What should I wear to my appointment?',
      answer: 'Wear dark, loose-fitting clothing and flip-flops or sandals. Most clients choose to wear a swimsuit, undergarments, or go nude during the application - whatever makes you most comfortable!'
    },
    {
      question: 'How long does an appointment take?',
      answer: 'A typical spray tan session takes about 15-20 minutes. Plan for 30 minutes total to allow time for consultation, preparation, and drying. First-time clients may need an extra 10 minutes for the initial consultation.'
    },
    {
      question: 'Can I tan with a friend?',
      answer: 'While I apply spray tans individually for privacy and optimal results, you\'re welcome to book back-to-back appointments with friends! It\'s a fun way to prepare for events together.'
    },
    {
      question: 'Do I need to exfoliate before my appointment?',
      answer: 'Yes! Exfoliating 24 hours before your appointment is crucial for an even, long-lasting tan. Focus on rough areas like elbows, knees, and heels. Use a gentle scrub or exfoliating mitt - avoid oil-based products.'
    },
    {
      question: 'Should I shave before or after?',
      answer: 'Shave 24-48 hours before your appointment. Any waxing should be done 48 or more hours before your appointment. Shaving after your tan can cause it to fade faster and become patchy. If you must shave after, wait at least 24 hours and use a new razor with gentle pressure.'
    },
    {
      question: 'Can I wear makeup/deodorant to my appointment?',
      answer: 'Please arrive with clean, product-free skin. Remove all makeup, deodorant, perfume, and lotions before your appointment. These products can create a barrier and prevent even tan development.'
    },
    {
      question: 'What if I have dry skin?',
      answer: 'If you have naturally dry skin, lightly moisturize problem areas (elbows, knees, hands, feet) the night before your appointment. On the day of, arrive with clean, dry skin - no lotions or oils.'
    },
    {
      question: 'When can I shower after my spray tan?',
      answer: 'Wait at least 1-4 hours before your first shower (I will give you specific timing based on your solution). Your first shower should be quick, lukewarm, and rinse-only. Some bronzer washing off is completely normal!'
    },
    {
      question: 'Can I work out after my spray tan?',
      answer: 'Avoid sweating or strenuous exercise for at least 24 hours after your spray tan. Sweating during the development period can cause streaking or uneven fading. After 24 hours, pat sweat dry rather than wiping.'
    },
    {
      question: 'Can I swim with a spray tan?',
      answer: 'Wait at least 24 hours before swimming. Chlorinated pools and salt water will fade your tan faster. Apply a water-resistant sunscreen and moisturize immediately after swimming to help preserve your tan.'
    },
    {
      question: 'How do I make my tan last longer?',
      answer: 'Moisturize twice daily with an alcohol-free lotion, take quick cool showers, pat dry instead of rubbing, avoid exfoliating products, and stay hydrated. Consider purchasing my Sunday Tan take-home foam to extend your glow between appointments ($30).'
    },
    {
      question: 'My tan looks too dark! What should I do?',
      answer: 'Don\'t panic! The initial bronzer makes you appear darker than your final result. After your first shower, much of this washes off, revealing your true tan color which continues developing for 24-48 hours.'
    },
    {
      question: 'My tan is fading unevenly. Is this normal?',
      answer: 'Some uneven fading is normal, especially in areas that experience more friction (inner thighs, underarms). Regular moisturizing helps minimize this. For your next tan, let me know about any problem areas for special attention during application.'
    },
    {
      question: 'What if I have eczema or psoriasis?',
      answer: 'Spray tanning is generally safe with these conditions, but affected areas may develop differently. Well-moisturized skin tans more evenly. Consult your dermatologist if you have concerns, and always inform me about skin conditions.'
    },
    {
      question: 'Will spray tanning cover my stretch marks or scars?',
      answer: 'Spray tanning can help minimize the appearance of stretch marks, scars, and other skin imperfections by evening out your skin tone. However, these areas may tan slightly differently due to texture variations.'
    },
    {
      question: 'I have acne. Can I still get sprayed?',
      answer: 'Yes! Spray tanning can actually help camouflage acne and create a more even complexion. The DHA in my solution has antibacterial properties. Just ensure any topical acne medications are fully absorbed before your appointment.'
    },
    {
      question: 'Can I leave you a review?',
      answer: 'Yes, please do! Google reviews are so helpful for small businesses like mine. If you leave a review (link can be found in your Account page), I will offer you a $10 discount on your next tan. Good or bad, your feedback is valuable to me and helps me improve. Just show me the review at the time of your appointment.'
    }
  ]

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-tan-50 via-white to-tan-50">
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-tan-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 md:py-5">
            <Link href="/" className="group">
              <h1 className="text-xl sm:text-2xl font-serif font-semibold text-tan-900 tracking-wide transition-all duration-300 group-hover:text-tan-700">
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
              <Link href="/care" className="nav-link">
                Tan Care
              </Link>
              <Link href="/faq" className="nav-link font-semibold text-tan-700">
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Title */}
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-tan-900 mb-3 sm:mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-base sm:text-lg text-tan-700">
            Everything you need to know about your spray tan experience
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between hover:bg-tan-50 transition-colors duration-200"
              >
                <h3 className="text-base sm:text-lg font-semibold text-tan-900 pr-4">
                  {faq.question}
                </h3>
                <div className={`transform transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}>
                  <svg 
                    className="w-5 h-5 text-tan-600" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-500 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                  <p className="text-sm sm:text-base text-tan-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 bg-gradient-to-r from-tan-100 to-amber-50 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-semibold text-tan-900 mb-4">
            Still Have Questions?
          </h2>
          <p className="text-tan-700 mb-6 max-w-2xl mx-auto">
            I'm here to help! If you couldn't find the answer you're looking for, feel free to reach out to me directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/book" 
              className="bg-tan-900 hover:bg-tan-800 text-white font-medium py-3 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
            >
              Book Now
            </Link>
            <div className="text-tan-700">
              <p className="font-medium">Text me anytime</p>
              <p className="text-sm mt-1">907 947 2882</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Link href="/care" className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-3">
              <div className="bg-tan-100 p-3 rounded-full mr-3 group-hover:bg-tan-200 transition-colors">
                <svg className="w-6 h-6 text-tan-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="font-semibold text-tan-900">Pre & Post Care</h3>
            </div>
            <p className="text-tan-600 text-sm">
              View our complete guide for preparing and maintaining your tan
            </p>
          </Link>

          <Link href="/book" className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-3">
              <div className="bg-tan-100 p-3 rounded-full mr-3 group-hover:bg-tan-200 transition-colors">
                <svg className="w-6 h-6 text-tan-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-tan-900">Book Now</h3>
            </div>
            <p className="text-tan-600 text-sm">
              Ready to glow? Schedule your spray tan appointment today
            </p>
          </Link>

          <Link href="/membership" className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-3">
              <div className="bg-tan-100 p-3 rounded-full mr-3 group-hover:bg-tan-200 transition-colors">
                <svg className="w-6 h-6 text-tan-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-tan-900">Membership</h3>
            </div>
            <p className="text-tan-600 text-sm">
              Save with our monthly membership plans
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}