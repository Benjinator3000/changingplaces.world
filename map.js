// map.js - volledig bestand met geïntegreerde hover map options
let map = L.map('mapid');
let knownLocations = [];
function getCurrentLang() {
  return window.currentLang || 'en';
}

const BASE_URL = 'https://changingplaces-backend.onrender.com';

console.log("map.js geladen");
console.log("Checking against knownLocations:", knownLocations);
console.log("✅ knownLocations beschikbaar voor confirmatie:", knownLocations);

let draggableMarker = null;

const esriLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles © Esri'
});

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
});

esriLayer.addTo(map);
osmLayer.addTo(map);
osmLayer.setOpacity(0.15);

const layerControlHover = L.Control.extend({
  onAdd: function () {
    const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
    container.style.position = 'relative';

    const popup = L.DomUtil.create('div', 'map-style-popup dropdown-menu p-3 shadow', container);
    popup.style.position = 'absolute';
    popup.style.top = '0';
    popup.style.right = '100%';
    popup.style.zIndex = '1000';
    popup.style.minWidth = '200px';
    popup.style.backgroundColor = getComputedStyle(document.querySelector('.dropdown .btn')).backgroundColor;
    popup.style.display = 'none';

    const label = L.DomUtil.create('div', '', container);
    label.innerText = '🗺️';
    label.style.fontSize = '1.4rem';
    label.style.backgroundColor = '#98ff98';
    label.style.borderRadius = '6px';
    label.style.padding = '4px 10px';
    label.style.cursor = 'pointer';

    popup.innerHTML = `
    <label style="font-weight: bold;">🗺️ Map Layers</label><br/>
    <div class="form-check">
      <input class="form-check-input" type="checkbox" id="esriToggle" checked>
      <label class="form-check-label" for="esriToggle">Esri World Street</label>
      <input type="range" class="form-range mt-1" id="esriOpacity" min="0" max="1" step="0.05" value="1">
<span id="esriOpacityValue">100%</span>
    </div>
    <div class="form-check mt-2">
      <input class="form-check-input" type="checkbox" id="osmToggle" checked>
      <label class="form-check-label" for="osmToggle">OpenStreetMap</label>
      <input type="range" class="form-range mt-1" id="osmOpacity" min="0" max="1" step="0.05" value="0.15">
<span id="osmOpacityValue">15%</span>
</div>
<div class="d-flex justify-content-between mt-2">
      <button class="btn btn-sm btn-outline-secondary" id="resetOpacity" title="🔁 Reset opaciteit" style="transition: background-color 0.3s ease;">🔁 Reset</button>
    </div>`;

    document.addEventListener('input', function (e) {
      if (e.target.id === 'esriOpacity') {
        const val = parseFloat(e.target.value);
        esriLayer.setOpacity(val);
        document.getElementById('esriOpacityValue').innerText = `${Math.round(val * 100)}%`;
      }
      if (e.target.id === 'osmOpacity') {
        const val = parseFloat(e.target.value);
        osmLayer.setOpacity(val);
        document.getElementById('osmOpacityValue').innerText = `${Math.round(val * 100)}%`;
      }
    });    

    L.DomEvent.disableClickPropagation(popup);
    L.DomEvent.disableScrollPropagation(popup);
    container.appendChild(popup);
    container.addEventListener('mouseenter', () => { popup.style.display = 'block'; });
    container.addEventListener('mouseleave', () => { popup.style.display = 'none'; });

    setTimeout(() => {
      const resetBtn = popup.querySelector('#resetOpacity');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          document.getElementById('esriOpacity').value = 1;
          document.getElementById('osmOpacity').value = 0.15;
          esriLayer.setOpacity(1);
          osmLayer.setOpacity(0.15);
          document.getElementById('esriOpacityValue').innerText = '100%';
          document.getElementById('osmOpacityValue').innerText = '15%';
        });
        resetBtn.addEventListener('mouseenter', () => {
          resetBtn.style.backgroundColor = '#cce5ff';
        });
        resetBtn.addEventListener('mouseleave', () => {
          resetBtn.style.backgroundColor = '';
        });
      }
    }, 0);
    return container;// Capitalize first letter of each word
  }
});

const countryCityMap = {
  "United States": ["Washington", "San Francisco"],
  "Belgium": ["Gent"],
  "Netherlands": [],
  "Hungary": ["Budapest"],
  "Montenegro": [],
  "Andorra": [],
  "Spain": ["Barcelona"],
  "Norway": [],
  "Germany": ["Berlin"],
  "Ireland": ["Dublin"],
  "France": [],
  "Luxembourg": [],
  "United Kingdom": ["London"],
  "Australia": ["Perth", "Hobart", "Sydney"]
};


const equipmentSet = new Set();

function populateEquipmentFilter(locations) {
  equipmentSet.clear();
  locations.forEach(loc => {
    if (loc.equipment) {
      loc.equipment.split(',').forEach(equip => {
        const trimmed = equip.trim();
        if (trimmed) equipmentSet.add(trimmed);
      });
    }
  });

  const equipmentFilter = $('#equipmentFilter');
  equipmentFilter.empty();

  Array.from(equipmentSet).sort().forEach(eq => {
    const newOption = new Option(eq, eq);
    equipmentFilter.append(newOption);
  });

  equipmentFilter.selectpicker('refresh');
}

document.getElementById('countryFilter').addEventListener('change', function () {
  const selectedCountry = this.value;
  const citySelect = $('#cityFilter');
  citySelect.find('option:gt(0)').remove();

  if (countryCityMap[selectedCountry]) {
    countryCityMap[selectedCountry].forEach(city => {
      const newOption = new Option(city, city);
      citySelect.append(newOption);
    });
  }

  citySelect.selectpicker('refresh');
});

function filterLocations(locations, selectedEquipments) {
  return locations.filter(loc => {
    if (!selectedEquipments.length) return true;
    if (!loc.equipment) return false;
    const locationEquip = loc.equipment.split(',').map(e => e.trim());
    return selectedEquipments.every(se => locationEquip.includes(se));
  });
}


function formatCSVField(input) {
  return input
    .split(',')
    .map(item => {
      const trimmed = item.trim().toLowerCase();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .join(', ');
}

map.addControl(new layerControlHover({ position: 'topright' }));

const DateTime = luxon.DateTime;

function isOpenNow(hours, timezone) {
  if (!hours || typeof hours !== 'string') return null;

  if (hours.trim() === '24/7') return true;

  const noHoursPattern = /^mon:\s*-\s*,\s*tue:\s*-\s*,\s*wed:\s*-\s*,\s*thu:\s*-\s*,\s*fri:\s*-\s*,\s*sat:\s*-\s*,\s*sun:\s*-$/i;
  if (noHoursPattern.test(hours.trim())) return null;

  try {
    const now = luxon.DateTime.now().setZone(timezone);
    const dayKey = now.toFormat('ccc').toLowerCase().slice(0, 3);
    const regex = new RegExp(`${dayKey}:\\s*(\\d{2}:\\d{2})-(\\d{2}:\\d{2})`, 'i');
    const match = hours.match(regex);
    if (!match) return null;

    const [_, open, close] = match;
    const openTime = luxon.DateTime.fromFormat(open, 'HH:mm', { zone: timezone }).set({ year: now.year, month: now.month, day: now.day });
    const closeTime = luxon.DateTime.fromFormat(close, 'HH:mm', { zone: timezone }).set({ year: now.year, month: now.month, day: now.day });

    return now >= openTime && now <= closeTime;
  } catch (err) {
    console.warn('Timezone parse error:', err);
    return null;
  }
}


document.addEventListener('change', function (e) {
  if (e.target.id === 'esriToggle') {
    e.target.checked ? map.addLayer(esriLayer) : map.removeLayer(esriLayer);
  }
  if (e.target.id === 'osmToggle') {
    e.target.checked ? map.addLayer(osmLayer) : map.removeLayer(osmLayer);
  }
});

document.addEventListener('input', function (e) {
  if (e.target.id === 'layerOpacity') {
    const val = parseFloat(e.target.value);
    esriLayer.setOpacity(val);
    osmLayer.setOpacity(val);
  }
});

const greenIcon = new L.Icon({
  iconUrl: '/static/images/changing_place_pin.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [30, 50],
  iconAnchor: [15, 50],
  popupAnchor: [0, -50],
  shadowSize: [41, 41]
});

const avocadoIcon = new L.Icon({
  iconUrl: '/static/images/changing_place_pin_V7.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [30, 50],
  iconAnchor: [15, 50],
  popupAnchor: [0, -50],
  shadowSize: [41, 41]
});

let markers = [];

// Add openNow toggle logic
document.getElementById('openNowToggle').addEventListener('click', (e) => {
  e.currentTarget.classList.toggle('active'); // Toggle the button class
  fetchLocations(); // Refresh the markers
});

function fetchLocations() {
  const country = document.getElementById('countryFilter').value;
  const city = document.getElementById('cityFilter').value;
  const openNow = document.getElementById('openNowToggle')?.classList.contains('active');
  const params = new URLSearchParams();

  if (country) params.append('country', country);
  if (city) params.append('city', city);

  const equipmentSelect = document.getElementById('equipmentFilter');
  const selectedEquipments = Array.from(equipmentSelect.selectedOptions).map(opt => opt.value);
  if (selectedEquipments.length > 0) {
    params.append('equipment', selectedEquipments.join(','));
  }

  fetch('https://changingplaces-backend.onrender.com/locations?' + params.toString())
    .then(response => response.json())
    .then(locations => {
      if (openNow) {
        locations = locations.filter(loc => {
          return isOpenNow(loc.hours, loc.timezone) === true;
        });
      }
      showMarkers(locations);
      if (locations.length) {
        const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
        map.fitBounds(bounds);
      } else {
        map.setView([51.05, 3.72], 4); // Europa
      }
    });
}


function showMarkers(locations) {
  console.log("🎯 showMarkers ontvangt:", locations);
  console.log("✅ knownLocations wordt gevuld met:", locations.map(loc => ({
    name: loc.name.toLowerCase().trim(),
    address: loc.address.toLowerCase().trim()
  })));
  
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  knownLocations = locations.map(loc => ({
    name: loc.name.toLowerCase().trim(),
    address: loc.address.toLowerCase().trim()
  }));

  locations.forEach(loc => {
    const icon = loc.name === "HOGENT campus Mercator" ? avocadoIcon : greenIcon;

    const marker = L.marker([loc.lat, loc.lng], { icon })
      .addTo(map)
      .bindPopup(createPopup(loc));
    markers.push(marker);
  });



  if (locations.length) {
    const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
    map.fitBounds(bounds, { padding: [50, 50], animate: true });
  }
}


function createPopup(location) {
  if (location.name === "HOGENT campus Mercator") {
    return `
      <div class="custom-popup advocado-style text-center">
        <a href="/404" style="text-decoration: none; color: inherit;">
          <img src="/static/photos/381f243b-3b1d-475c-ba12-4680f8ae18f4.png" alt="Oops" style="width: 100%; border-radius: 12px; margin-bottom: 0.5rem;" />
          <div style="font-size: 1.2rem; font-weight: bold;">🌀 Meega, nala kweesta! 🌀</div>
          <div style="font-size: 1rem;">Click to uncover the mystery</div>
        </a>
      </div>
    `;
  }
  if (location.name === "Paleis Het Loo") {
    const lang = getCurrentLang();
    const title = lang === 'nl' ? "Paleis Het Loo" : "Loo Palace";
  
    const urls = (location.photo || '').split(',').map(url => url.trim()).filter(Boolean);
  
    let imageBlock = '';
    if (lang === 'en') {
      imageBlock = `
        <img src="/static/photos/ChatGPT_Image_6_jun_2025_15_45_46.png"
             alt="${title}"
             style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; margin: 0.5rem 0;" />
      `;
    } else if (urls.length === 1) {
      imageBlock = `
        <img src="${urls[0]}" alt="${title}"
             style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; margin: 0.5rem 0;" />
      `;
    } else if (urls.length > 1) {
      const uid = Math.random().toString(36).substring(2, 8);
      imageBlock = `
        <div class="slideshow-container" id="slideshow-${uid}" style="position: relative; width: 100%;">
          ${urls.map((url, i) => `
            <img src="${url}" class="slideshow-image slide-${uid}"
                 style="display: ${i === 0 ? 'block' : 'none'}; width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px;" />
          `).join('')}
          <button class="slide-btn prev-slide" onclick="changeSlide('${uid}', -1)">&#10094;</button>
          <button class="slide-btn next-slide" onclick="changeSlide('${uid}', 1)">&#10095;</button>
        </div>
      `;
      setTimeout(() => {
        setInterval(() => changeSlide(uid, 1), 3000);
      }, 100);
    }
    
  
    return `
      <div class="custom-popup advocado-style">
        <div style="text-align: center; font-weight: bold; font-size: 1.2rem;">${title}</div>
        ${imageBlock}
        <div style="text-align: left;">
          📍 <strong>${lang === 'nl' ? 'Adres' : 'Address'}:</strong> ${location.address}<br/>
          <span style="color: red; font-weight: bold;">
            ${lang === 'nl' ? 'Gesloten' : 'Closed'}
          </span><br/>
          🕒 <strong>${lang === 'nl' ? 'Openingsuren' : 'Opening hours'}:</strong> ${location.hours}<br/>
          ♿ <strong>${lang === 'nl' ? 'Toegankelijkheid' : 'Accessibility'}:</strong> ${location.access}<br/>
          🛠️ <strong>${lang === 'nl' ? 'Uitrusting' : 'Equipment'}:</strong> ${location.equipment}<br/>
          🗺️ <strong>${lang === 'nl' ? 'Routebeschrijving' : 'Directions'}:</strong> 
          <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}" target="_blank">Google Maps</a>
        </div>
      </div>
    `;
  }
  if (location.name === "Луштичка Toilet") {
    const lang = getCurrentLang();
    const urls = (location.photo || '').split(',').map(url => url.trim()).filter(Boolean);
    const imageHTML = urls.length ? `<img src="${urls[0]}" alt="${location.name}" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; margin: 0.5rem 0;" />` : '';
    const t = translations[lang] || translations.en;
  
    return `
      <div class="custom-popup advocado-style">
        <div style="text-align: center; font-weight: bold; font-size: 1.2rem;">${location.name}</div>
        ${imageHTML}
        <div style="color: red; font-weight: bold; margin-bottom: 0.5rem;">
          ${lang === 'nl' ? "Ik zou deze plek vermijden als ik jou was." : "I wouldn't try this place if I were you."}
        </div>
        <div style="text-align: left;">
          📍 <strong>${t.address}:</strong> ${location.address}<br/>
          🕒 <strong>${t.hours}:</strong> ${location.hours}<br/>
          🗺️ <strong>${t.directions}:</strong> 
          <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}" target="_blank">Google Maps</a>
        </div>
      </div>
    `;
  }
  
    


  const t = translations[getCurrentLang()] || translations['en']; // fallback
  const equipmentTranslations = t.equipment || {};

  const urls = (location.photo || '').split(',').map(url => url.trim()).filter(Boolean);
  let slideshowHTML = '';
if (urls.length === 1) {
  slideshowHTML = `
    <img src="${urls[0]}" alt="${location.name}"
         style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; margin: 0.5rem 0;" />
  `;
} else if (urls.length > 1) {
  const uid = Math.random().toString(36).substring(2, 8);
  slideshowHTML = `
    <div class="slideshow-container" id="slideshow-${uid}" style="position: relative; width: 100%;">
      ${urls.map((url, i) => `
        <img src="${url}" class="slideshow-image slide-${uid}"
             style="display: ${i === 0 ? 'block' : 'none'}; width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px;" />
      `).join('')}
      <button class="slide-btn prev-slide" onclick="changeSlide('${uid}', -1)">&#10094;</button>
      <button class="slide-btn next-slide" onclick="changeSlide('${uid}', 1)">&#10095;</button>
    </div>
  `;
  setTimeout(() => {
    setInterval(() => changeSlide(uid, 1), 3000);
  }, 100);
}


  const hours = location.hours?.trim();
  const noHours = !hours || /^mon:\s*-\s*,\s*tue:\s*-\s*,\s*wed:\s*-\s*,\s*thu:\s*-\s*,\s*fri:\s*-\s*,\s*sat:\s*-\s*,\s*sun:\s*-$/i.test(hours);
  const openStatus = noHours ? '' : (
    isOpenNow(hours, location.timezone)
      ? `<span style="color: green; font-weight: bold;">${t.openNow}</span><br/>`
      : `<span style="color: red; font-weight: bold;">${t.closed}</span><br/>`
  );
  const hoursLine = noHours
    ? `<strong>🕒 ${t.hours}:</strong> ${t.noHours}<br/>`
    : `🕒 <strong>${t.hours}:</strong> ${hours}<br/>`;

  const formattedAccess = location.access?.trim() || '';
  const formattedEquip = location.equipment?.trim() || '';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address || '')}`;
  const directionsHTML = location.address
    ? `🗺️ <strong>${t.directions}:</strong> <a href="${mapsUrl}" target="_blank">Google Maps</a><br />`
    : '';

    return `
    <div class="custom-popup advocado-style">
      <div style="text-align: center; font-weight: bold; font-size: 1.2rem;">${location.name}</div>
      ${slideshowHTML}
      📍 <strong>${t.address}:</strong> ${location.address}<br />
      ${openStatus}
      ${hoursLine}
      ${formattedAccess ? `♿ <strong>${t.accessibility}:</strong> ${formattedAccess}<br />` : ''}
      ${formattedEquip ? `🛠️ <strong>${t.equipmentLabel}:</strong> ${formattedEquip
        .split(',')
        .map(e => equipmentTranslations[e.trim()] || e.trim())
        .join(', ')}<br />` : ''}
      ${directionsHTML}
    </div>
  `;
}

function translatePopups() {
  // Re-fetch and rebuild markers with translated popups
  fetchLocations();
}

window.addLocation = addLocation;
window.confirmLocation = confirmLocation;

function addLocation() {
  const address = document.getElementById('locAddress').value;
  if (!address) {
    showAlertPopup("⚠️ Please enter an address first.");
    return;
  }

  const name = document.getElementById('locName').value;
  if (!name) {
    showAlertPopup("⚠️ Please enter a name.");
    return;
  }

  fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}`)
    .then(response => response.json())
    .then(data => {
      if (data.length === 0) {
        showAlertPopup("⚠️ Could not find coordinates for the address.");
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      const cityField = document.getElementById('locCity');
      const suggestedCity = data[0]?.address?.city || data[0]?.address?.town || data[0]?.address?.village || '';
      if (suggestedCity && !cityField.value) cityField.value = suggestedCity;
      placeDraggableMarker(lat, lng);
    });
}

function placeDraggableMarker(lat, lng) {
  if (draggableMarker) map.removeLayer(draggableMarker);
  draggableMarker = L.marker([lat, lng], {
    draggable: true,
    icon: avocadoIcon
  }).addTo(map).bindPopup("<div class='custom-popup'>Drag me and confirm.<br/>Click very close to the marker to remove it.</div>")
  .openPopup();
  map.setView([lat, lng], 16);
}


function confirmLocation() {
  if (!draggableMarker) {
    showAlertPopup("⚠️ Please add and adjust the marker first.");
    return;
  }

  const name = document.getElementById('locName').value.trim();
  const city = document.getElementById('locCity').value.trim();
  const address = document.getElementById('locAddress').value.trim();
  if (!name || !city || !address) {
    showAlertPopup("⚠️ Name, city, and address are required.");
    return;
  }

  console.log("form input name:", name, "address:", address);

  function normalize(text) {
    return text.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  }
  
  const normalizedInputName = normalize(name);
  const normalizedInputAddress = normalize(address);
  
  console.log("🔎 Vergelijk input:", normalizedInputName, normalizedInputAddress);
  console.log("📍 Bekende locaties:", knownLocations.map(l => [normalize(l.name), normalize(l.address)]));
  
  const duplicate = knownLocations.find(loc =>
    normalize(loc.name).includes(normalizedInputName) &&
    normalize(loc.address).includes(normalizedInputAddress)
  );
  
  if (duplicate) {
    console.log("🎯 DUPLICAAT GEVONDEN:", duplicate);
    showDuplicatePopup();
    return;
  }

  console.log("Input name/address:", normalizedInputName, normalizedInputAddress);
  console.log("Known:", knownLocations.map(l => [normalize(l.name), normalize(l.address)]));

  const data = {
    name,
    city,
    address,
    access: formatCSVField(document.getElementById('locAccess').value),
    equipment: formatCSVField(document.getElementById('locEquip').value),
    photo: document.getElementById('locPhoto').value,
    lat: draggableMarker.getLatLng().lat,
    lng: draggableMarker.getLatLng().lng,
    hours: (() => {
      const isAlwaysOpen = document.getElementById('24_7')?.checked;
      if (isAlwaysOpen) return '24/7';
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      return days.map(day => {
        const isClosed = document.getElementById(`${day}_closed`).checked;
        if (isClosed) return `${day}: Closed`;
        const open = document.getElementById(`${day}_open`)?.value || '';
        const close = document.getElementById(`${day}_close`)?.value || '';
        return `${day}: ${open}-${close}`;
      }).join(', ');
    })()
  };

  
  fetch('https://changingplaces-backend.onrender.com/locations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(result => {
      showSuccessPopup();
      document.getElementById('locationForm').reset();
      fetchLocations();
      map.removeLayer(draggableMarker);
      draggableMarker = null;
    });
}

map.on('click', function (e) {
  const popupEl = document.querySelector('.map-style-popup');
  if (popupEl && popupEl.style.display === 'block') return;

  const { lat, lng } = e.latlng;

  if (draggableMarker) {
    const distance = map.latLngToLayerPoint(draggableMarker.getLatLng())
                       .distanceTo(map.latLngToLayerPoint(e.latlng));
    if (distance < 30) {
      map.removeLayer(draggableMarker);
      draggableMarker = null;
      return;
    } else {
      map.removeLayer(draggableMarker);
    }
  }

  draggableMarker = L.marker([lat, lng], {
    draggable: true,
    icon: avocadoIcon
  }).addTo(map).bindPopup("<div class='custom-popup'>Drag me and confirm.<br/>Click very close to the marker to remove it.</div>").openPopup();

  // Center view on new marker
  map.setView([lat, lng], 16);

  // 🧠 Fetch reverse geocoding data
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then(res => res.json())
    .then(data => {
      const address = data?.display_name || '';
      const city = data?.address?.city || data?.address?.town || data?.address?.village || '';
      const road = data?.address?.road || '';
      const nameSuggestion = `${road || city || 'Location'} Toilet`;

      // 🖊️ Fill form fields
      document.getElementById('locAddress').value = address;
      document.getElementById('locCity').value = city;
      if (!document.getElementById('locName').value) {
        document.getElementById('locName').value = nameSuggestion;
      }
    })
    .catch(err => {
      console.error("Reverse geocoding failed:", err);
    });
});

document.addEventListener("DOMContentLoaded", function () {
  if (window.location.hash === "#mapid") {
    // Scroll the map into center view with offset
    const mapElement = document.getElementById("mapid");
    if (mapElement) {
      setTimeout(() => {
        mapElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200); // kleine delay om zeker te zijn dat layout klaar is
    }
  }
});

document.getElementById('countryFilter').addEventListener('change', function () {
  const selectedCountry = this.value;
  const citySelect = $('#cityFilter');
  const cityOptions = citySelect[0].options;

  // Clear existing city options (except first)
  citySelect.find('option:gt(0)').remove();

  // Add cities for selected country
  if (countryCityMap[selectedCountry]) {
    countryCityMap[selectedCountry].forEach(city => {
      const newOption = new Option(city, city);
      citySelect.append(newOption);
    });
  } else {
    // If no country selected, show all cities again
    Object.values(countryCityMap).flat().forEach(city => {
      const newOption = new Option(city, city);
      citySelect.append(newOption);
    });
  }

  citySelect.selectpicker('refresh');
});

function showDuplicatePopup() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div id="duplicate-popup" style="
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      background-color: #009B7D;
      color: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
      z-index: 9999;
      text-align: center;
      font-size: 1.2rem;
      max-width: 400px;
      animation: fadeIn 0.5s ease-in-out;
    ">
     <strong>✨ Wow, so much dedication!✨ </strong><br><br>
      However, I will have to disappoint you as this location is already included on the map...<br><br>
      <strong>A for effort though!</strong>
    </div>
  `;

  document.body.appendChild(container);

  // Simpele "firework" animatie (confetti-achtig)
  for (let i = 0; i < 25; i++) {
    const sparkle = document.createElement('div');
    const x = `${Math.random() * 200 - 100}px`;
    const y = `${Math.random() * -200}px`;
  
    sparkle.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      z-index: 9999;
      animation: explode 1s ease-out forwards;
      --x: ${x};
      --y: ${y};
    `;
  
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1000);
  }

  setTimeout(() => container.remove(), 4000); // 4 seconds
}


function showSuccessPopup() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div id="success-popup" style="
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      background-color: #009B7D;
      color: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
      z-index: 9999;
      text-align: center;
      font-size: 1.2rem;
      max-width: 400px;
      animation: fadeIn 0.5s ease-in-out;
    ">
     <strong>✨Success!✨</strong><br><br>
      The location was added to the map.<br><br>
      Great work, your contribution just made the world a little more accessible! 💪🌍
    </div>
  `;

  document.body.appendChild(container);

  for (let i = 0; i < 25; i++) {
    const sparkle = document.createElement('div');
    const x = `${Math.random() * 200 - 100}px`;
    const y = `${Math.random() * -200}px`;

    sparkle.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      z-index: 9999;
      animation: explode 1s ease-out forwards;
      --x: ${x};
      --y: ${y};
    `;

    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1000);
  }

  setTimeout(() => container.remove(), 4000); // 4 seconds
}

function showAlertPopup(message) {
  const popup = document.createElement('div');
  popup.className = 'custom-alert-popup';
  popup.innerHTML = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1500); // 1.5 seconds
}


['locAccess', 'locEquip'].forEach(id => {
  const field = document.getElementById(id);
  if (field) {
    field.addEventListener('blur', () => {
      field.value = formatCSVField(field.value);
    });
  }
});

document.getElementById('countryFilter').addEventListener('change', fetchLocations);
document.getElementById('cityFilter').addEventListener('change', fetchLocations);
document.getElementById('equipmentFilter').addEventListener('change', fetchLocations);

fetchLocations();
function handleConfirmLocation() {
  if (!knownLocations || knownLocations.length === 0) {
    showAlertPopup("⚠️ ⚠️ Please wait for existing locations to load before confirming.");
    return;
  }
  confirmLocation();
}
document.getElementById('confirmBtn').disabled = false;

