export const loadGoogleMapsScript = (apiKey: string, callback: () => void) => {
    const existingScript = document.getElementById("googleMapsScript")
    if (!existingScript) {
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.id = "googleMapsScript"
      document.body.appendChild(script)
      script.onload = () => {
        if (callback) callback()
      }
    }
    if (existingScript && callback) callback()
  }
  
  