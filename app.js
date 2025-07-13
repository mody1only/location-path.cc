let userCoords = null;
let locations = [];
let sortedLocations = [];
let currentIndex = 0;

let map = L.map('map').setView([30.0444, 31.2357], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

let markersGroup = L.layerGroup().addTo(map);
let routeLine = null;

function getUserLocation() {
  navigator.geolocation.getCurrentPosition(pos => {
    userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    sortLocations();
    showCurrentPoint();
    updateMap();
  }, err => alert("خطأ في تحديد الموقع: " + err.message));
}

function extractLatLonFromUrl(url) {
  try {
    const regex = /@([-\.\d]+),([-\.\d]+)/;
    const match = url.match(regex);
    if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };

    const qParam = new URL(url).searchParams.get('q');
    if (qParam && qParam.includes(',')) {
      const [lat, lon] = qParam.split(',');
      return { lat: parseFloat(lat), lon: parseFloat(lon) };
    }
  } catch (e) {}
  return null;
}

function addLocation() {
  const input = document.getElementById("locationInput").value.trim();
  if (!input) return;

  let name = input;
  let coords = null;

  if (input.startsWith("http")) {
    coords = extractLatLonFromUrl(input);
    if (!coords) return alert("لم يتم استخراج الإحداثيات من الرابط.");
    name = `موقع ${locations.length + 1}`;
  } else {
    const parts = input.split(",");
    if (parts.length === 2 && !isNaN(parts[0])) {
      coords = { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
    }
  }

  if (!coords) return alert("أدخل إحداثيات صحيحة أو رابط لوكيشن.");
  locations.push({ name, ...coords });
  document.getElementById("locationInput").value = "";
  alert("تمت الإضافة");
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function sortLocations() {
  sortedLocations = locations.map(loc => ({
    ...loc,
    distance: getDistance(userCoords.lat, userCoords.lon, loc.lat, loc.lon)
  })).sort((a, b) => a.distance - b.distance);
  currentIndex = 0;
}

function showCurrentPoint() {
  const box = document.getElementById("currentPoint");
  const name = document.getElementById("pointName");
  const restartBtn = document.getElementById("restartBtn");

  if (currentIndex >= sortedLocations.length) {
    name.innerText = "تم الانتهاء من كل النقاط ✅";
    document.getElementById("openMapBtn").style.display = "none";
    document.getElementById("doneBtn").style.display = "none";
    restartBtn.style.display = "block";
    return;
  }

  const loc = sortedLocations[currentIndex];
  name.innerText = loc.name;
  box.style.display = "block";
  restartBtn.style.display = "none";
  map.setView([loc.lat, loc.lon], 15);
}

function openInMap() {
  const loc = sortedLocations[currentIndex];
  const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}`;
  window.open(url, "_blank");
}

function nextPoint() {
  currentIndex++;
  showCurrentPoint();
}

function restartPath() {
  currentIndex = 0;
  sortedLocations = [];
  locations = [];
  document.getElementById("currentPoint").style.display = "none";
  localStorage.removeItem("savedLocations");
  markersGroup.clearLayers();
  if (routeLine) map.removeLayer(routeLine);
  alert("ابدأ إضافة مسار جديد ✨");
}

function saveLocations() {
  localStorage.setItem("savedLocations", JSON.stringify(locations));
  alert("تم حفظ المسار ✅");
}

function loadLocations() {
  const saved = localStorage.getItem("savedLocations");
  if (saved) {
    locations = JSON.parse(saved);
    alert("تم تحميل المسار المحفوظ.");
  } else {
    alert("لا يوجد مسار محفوظ.");
  }
}

function updateMap() {
  markersGroup.clearLayers();
  if (routeLine) map.removeLayer(routeLine);

  const points = [userCoords, ...sortedLocations.map(loc => ({ lat: loc.lat, lon: loc.lon }))];
  const latlngs = points.map(p => [p.lat, p.lon]);

  for (let i = 0; i < sortedLocations.length; i++) {
    const loc = sortedLocations[i];
    const marker = L.marker([loc.lat, loc.lon]).bindPopup(loc.name);
    markersGroup.addLayer(marker);
  }

  routeLine = L.polyline(latlngs, { color: 'blue' }).addTo(map);
  map.fitBounds(routeLine.getBounds());
}