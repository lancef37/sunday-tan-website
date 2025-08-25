const { SquareClient, SquareEnvironment } = require('square')

// Replace this with your actual access token from the Square dashboard
const ACCESS_TOKEN = 'PASTE_YOUR_ACCESS_TOKEN_HERE'

const client = new SquareClient({
  accessToken: ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox
})

async function getLocations() {
  try {
    const response = await client.locations.list()
    
    if (response.result && response.result.locations) {
      console.log('✅ Available locations:')
      response.result.locations.forEach((location, index) => {
        console.log(`${index + 1}. Name: ${location.name}`)
        console.log(`   ID: ${location.id}`)
        console.log(`   Status: ${location.status}`)
        console.log(`   Address: ${location.address ? location.address.addressLine1 : 'No address'}`)
        console.log('---')
      })
      
      // Show which one to use
      const activeLocation = response.result.locations.find(loc => loc.status === 'ACTIVE')
      if (activeLocation) {
        console.log(`🎯 Use this Location ID: ${activeLocation.id}`)
      }
    } else {
      console.log('❌ No locations found')
    }
  } catch (error) {
    console.error('❌ Error fetching locations:', error.message)
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.category}: ${err.detail}`)
      })
    }
  }
}

getLocations()