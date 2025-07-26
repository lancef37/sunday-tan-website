'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-tan-bronze">Sunday Tan</h1>
            </div>
            <nav className="flex space-x-8">
              <Link href="/" className="text-gray-600 hover:text-tan-bronze">Home</Link>
              <Link href="/book" className="text-gray-600 hover:text-tan-bronze">Book Now</Link>
              <Link href="/admin" className="text-gray-600 hover:text-tan-bronze">Admin</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-tan-cream to-tan-gold py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Professional Mobile Spray Tan
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Get a beautiful, natural-looking tan in the comfort of your own home. 
            Professional mobile spray tan services that come to you.
          </p>
          <Link 
            href="/book" 
            className="btn-primary text-lg px-8 py-4 inline-block"
          >
            Book Your Tan Now
          </Link>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h3>
            <p className="text-lg text-gray-600">Professional spray tan services delivered to your door</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <h4 className="text-xl font-semibold mb-4">Mobile Service</h4>
              <p className="text-gray-600">We come to you! No need to travel - enjoy your tan session at home.</p>
            </div>
            <div className="card text-center">
              <h4 className="text-xl font-semibold mb-4">Professional Quality</h4>
              <p className="text-gray-600">High-quality products and expert application for natural-looking results.</p>
            </div>
            <div className="card text-center">
              <h4 className="text-xl font-semibold mb-4">Flexible Scheduling</h4>
              <p className="text-gray-600">Book appointments that work with your schedule, including evenings and weekends.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-tan-bronze py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">Ready to Get Your Glow On?</h3>
          <p className="text-xl text-white mb-8">Book your appointment today and get ready to feel confident and radiant.</p>
          <Link 
            href="/book" 
            className="bg-white text-tan-bronze hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 inline-block"
          >
            Schedule Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 Sunday Tan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}