'use client'

import { useRouter } from 'next/navigation'

export default function WaiverPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-tan-50 via-tan-100 to-tan-200 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-serif font-light text-tan-900">
              Spray Tanning Release Form
            </h1>
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-tan-100 hover:bg-tan-200 text-tan-700 transition-all duration-200"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="prose prose-tan max-w-none space-y-4 text-gray-700">
            <p className="font-medium">Please read, understand, and sign the following:</p>

            <p>
              Spray tanning is accomplished by application of a solution containing the active ingredient: DHA (Dihydroxyacetone). 
              DHA is generally considered to be safe and has been FDA approved ONLY if you follow guide lines to protect mucous membranes. 
              The FDA advises asking the following questions when considering the application of DHA products by spraying or misting:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>Are you protected from exposure in the entire area of the eyes, in addition to the eyes themselves?</li>
              <li>Are you protected from exposure on the lips and all parts of the body covered by mucous membrane?</li>
              <li>Are you protected from internal exposure caused by inhaling or ingesting the product?</li>
            </ul>

            <p>
              If the answer to any of these questions is "no," you are not protected from the unapproved use of DHA. 
              You should request measures to protect your eyes and mucous membranes and prevent inhalation.
            </p>

            <div className="bg-tan-50 p-4 rounded-lg border border-tan-200 mt-6">
              <h2 className="text-lg font-semibold text-tan-900 mb-3">What to expect:</h2>
              <p className="mb-3">
                You will enter a private room where you will remove your clothing. This is up to you and your level of comfort. 
                Dress down as much as you feel comfortable.
                The solution will wash out of most clothing. 
                It is advised to wash the undergarment or clothing worn as soon as possible after your session.
              </p>
              <p className="mb-3">
                Next, you will be sprayed. This process will take approximately ten to fifteen minutes. 
                After spraying, your skin should be dry before putting your clothes back on and you should not bathe or sweat excessively for 1-6 hours. 
                
              </p>
              <p>
                The solution will give you an immediate bronzing effect. The bronzing effect is a result of a temporary coloring additive in the solution 
                that will remain on the skin until your warm water rinse. When you shower, the temporary coloring will come off and your spray tan will develop over the next 12-16 hours.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <p>
                All people, all skin, is different. All ingredients used in this procedure are intended for cosmetic use and generally regarded as safe. 
                There are, however, occasions where individuals may be allergic to one or more ingredients in the spray tan solution. 
                Please read the ingredients list if you have any known allergies. Please discuss with me if you have any questions.
              </p>

              <p>
                Be advised there is a small percentage of people whose skin may not react favorably to spray tanning. 
                For this reason, we do NOT advise being sprayed for the first time when your appearance is critical; 
                (wedding/special occasion/prom) Please schedule a practice session 30 days before your event, for best results.
              </p>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-6">
              <p className="font-semibold text-amber-900 mb-2">Common Sense Caution:</p>
              <p>
                Pregnant or nursing women should consult their physician, and obtain a written release before using. 
                Spray tanning is not normally contraindicated, when a mask or nose filters are used. 
                But each pregnancy is different, your medical care provider may prefer a more cautious approach based on your specific needs and health concerns.
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-6">
              <p className="font-semibold text-red-900 mb-2">Warning:</p>
              <p>
                This product does not contain a sunscreen and does not protect against sunburn. 
                Repeated exposure of unprotected skin to U.V. Light may increase the risk of skin aging, skin cancer and other harmful effects to the skin even if you do not burn.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-300 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Acknowledgment:</h3>
              <p className="mb-3">
                I have been provided with spray tan care instructions, which I have read and understand completely. 
                To my knowledge, I have no medical condition or allergy which would preclude me from having this procedure done. 
                I have been honest and accurate about the information that I have provided on this waiver.
              </p>
              <p className="mb-3">
                I take sole responsibility of any reaction I may have, staining of clothing and/or personal belongings.
              </p>
              <p className="font-medium">
                I have read and completely understand this consent form. (let me know if you have any questions)
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => router.back()}
              className="px-8 py-3 bg-tan-700 hover:bg-tan-800 text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Return to Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}