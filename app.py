from flask import Flask, send_from_directory, jsonify, request, render_template
from flask_cors import CORS
import pandas as pd
import os
import requests
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

EXCEL_FILE = 'locations.xlsx'
GOOGLE_API_KEY = 'AIzaSyAqEswmwUSMKF0992_UPa8kOp1o06Vm5Pg'
PHOTO_DIR = 'static/photos'
GEONAMES_USERNAME = 'benjinomercy'  # Replace with your GeoNames username
os.makedirs(PHOTO_DIR, exist_ok=True)


def fetch_timezone_from_geonames(lat, lng):
    try:
        url = f"http://api.geonames.org/timezoneJSON?lat={lat}&lng={lng}&username={GEONAMES_USERNAME}"
        response = requests.get(url)
        data = response.json()
        return data.get('timezoneId')
    except Exception as e:
        print(f"Timezone fetch failed: {e}")
        return None

def fetch_timezone_from_google(lat, lng):
    try:
        url = f"https://maps.googleapis.com/maps/api/timezone/json?location={lat},{lng}&timestamp={int(datetime.utcnow().timestamp())}&key={GOOGLE_API_KEY}"
        response = requests.get(url)
        data = response.json()
        return data.get('timeZoneId')
    except Exception as e:
        print(f"Google Timezone fallback failed: {e}")
        return None

@app.route("/reva.html")
def reva():
    return render_template("reva.html")

@app.route("/contact.html")
def contact():
    return render_template("contact.html")

@app.route("/who-we-are.html")
def who_we_are():
    return render_template("who-we-are.html")

@app.route('/mission.html')
def mission():
    return render_template("mission.html")

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/map.js')
def serve_map():
    return send_from_directory('.', 'map.js')

@app.route('/style.css')
def serve_style():
    return send_from_directory('.', 'style.css')

@app.route('/adult changing table.svg')
def serve_svg():
    return send_from_directory('.', 'adult changing table.svg')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/upload_photos', methods=['POST'])
def upload_photos():
    if 'photos' not in request.files:
        return jsonify({'error': 'No photos part in the request'}), 400

    files = request.files.getlist('photos')
    if len(files) > 10:
        return jsonify({'error': 'Maximum 10 photos allowed'}), 400

    saved_files = []
    for file in files:
        if file.filename:
            filename = secure_filename(file.filename)
            file_path = os.path.join(PHOTO_DIR, filename)
            file.save(file_path)
            saved_files.append(f"/static/photos/{filename}")

    return jsonify({'uploaded': saved_files}), 200

@app.route('/locations', methods=['GET'])
def get_locations():
    if not os.path.exists(EXCEL_FILE):
        return jsonify([])

    df = pd.read_excel(EXCEL_FILE)
    df = df.dropna(subset=['lat', 'lng'])
    country = request.args.get('country')
    city = request.args.get('city')
    equipment = request.args.get('equipment')

    if country:
        df = df[df['country'].str.lower() == country.lower()]
    if city:
        df = df[df['city'].str.lower() == city.lower()]
    if equipment:
        keywords = [e.strip().lower() for e in equipment.split(',')]
        df = df[df['equipment'].str.lower().apply(lambda eq: any(k in eq for k in keywords) if isinstance(eq, str) else False)]

    locations = df.where(pd.notnull(df), None).to_dict(orient='records')
    updated = False
    for loc in locations:
        if not loc.get('timezone') and loc.get('lat') and loc.get('lng'):
            timezone = fetch_timezone_from_geonames(loc['lat'], loc['lng']) or fetch_timezone_from_google(loc['lat'], loc['lng'])
            if timezone:
                loc['timezone'] = timezone
                row_filter = (df['lat'] == loc['lat']) & (df['lng'] == loc['lng'])
                df.loc[row_filter, 'timezone'] = timezone
                updated = True
    if updated:
        df.to_excel(EXCEL_FILE, index=False)

    return jsonify(locations)

@app.route('/locations', methods=['POST'])
def add_location():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400

    required_fields = ['name', 'city', 'address']
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({'error': f"Missing required fields: {', '.join(missing)}"}), 400

    if not data.get('country'):
        lat = data.get('lat')
        lng = data.get('lng')
        if lat and lng:
            geo_url = 'https://maps.googleapis.com/maps/api/geocode/json'
            params = {
                'latlng': f"{lat},{lng}",
                'key': GOOGLE_API_KEY
            }
            response = requests.get(geo_url, params=params).json()
            if response.get('results'):
                for component in response['results'][0].get('address_components', []):
                    if 'country' in component['types']:
                        data['country'] = component['long_name']
                        break

    if not data.get('timezone') and data.get('lat') and data.get('lng'):
        timezone = fetch_timezone_from_geonames(data['lat'], data['lng']) or fetch_timezone_from_google(data['lat'], data['lng'])
        if timezone:
            data['timezone'] = timezone

    for key in ['access', 'equipment', 'photo', 'hours']:
        if key not in data or pd.isna(data.get(key)):
            data[key] = ''

    df = pd.DataFrame([data])
    if os.path.exists(EXCEL_FILE):
        df_existing = pd.read_excel(EXCEL_FILE)
        df = pd.concat([df_existing, df], ignore_index=True)

    expected_columns = ['name', 'city', 'address', 'country', 'hours', 'access', 'equipment', 'photo', 'lat', 'lng', 'timezone']
    for col in expected_columns:
        if col not in df.columns:
            df[col] = None
    df = df[expected_columns]

    df.to_excel(EXCEL_FILE, index=False)

    return jsonify({'message': 'Location added successfully'}), 201

def parse_google_time(t):
    try:
        clean = t.replace('\u202f', '').replace('\xa0', '').replace(' ', '')
        return datetime.strptime(clean.strip(), '%I:%M%p').strftime('%H:%M')
    except Exception:
        return None

@app.route('/fetch_hours', methods=['GET'])
def fetch_hours():
    place_name = request.args.get('name')
    address = request.args.get('address')
    if not place_name:
        return jsonify({'error': 'Missing place name'}), 400

    find_url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    find_params = {
        'input': f"{place_name}, {address}" if address else place_name,
        'inputtype': 'textquery',
        'fields': 'place_id',
        'key': GOOGLE_API_KEY
    }
    find_response = requests.get(find_url, params=find_params).json()
    candidates = find_response.get('candidates', [])
    if not candidates:
        return jsonify({'error': 'Place not found'}), 404

    place_id = candidates[0].get('place_id')
    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
    details_params = {
        'place_id': place_id,
        'fields': 'opening_hours',
        'key': GOOGLE_API_KEY
    }
    details_response = requests.get(details_url, params=details_params).json()
    weekday_text = details_response.get('result', {}).get('opening_hours', {}).get('weekday_text', [])

    day_map = {
        "Monday": "mon",
        "Tuesday": "tue",
        "Wednesday": "wed",
        "Thursday": "thu",
        "Friday": "fri",
        "Saturday": "sat",
        "Sunday": "sun"
    }

    hours = {}
    for entry in weekday_text:
        day, times = entry.split(": ", 1)
        key = day_map.get(day.strip(), day.lower())
        if "Closed" in times:
            hours[key] = ["Closed"]
        else:
            try:
                open_time, close_time = times.split("–")
                parsed_open = parse_google_time(open_time.strip())
                parsed_close = parse_google_time(close_time.strip())
                if parsed_open and parsed_close:
                    hours[key] = [parsed_open, parsed_close]
                else:
                    hours[key] = ["Closed"]
            except ValueError:
                hours[key] = ["Closed"]

    return jsonify({'hours': hours})

@app.route('/autocomplete_address', methods=['GET'])
def autocomplete_address():
    name = request.args.get('name')
    address = request.args.get('address')

    if not name and not address:
        return jsonify({'error': 'Missing name or address'}), 400

    input_query = name if name else address

    find_url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
    find_params = {
        'input': input_query,
        'inputtype': 'textquery',
        'fields': 'place_id',
        'key': GOOGLE_API_KEY
    }
    find_response = requests.get(find_url, params=find_params).json()
    candidates = find_response.get('candidates', [])
    if not candidates:
        return jsonify({'error': 'No result found'}), 404

    place_id = candidates[0]['place_id']

    details_url = 'https://maps.googleapis.com/maps/api/place/details/json'
    details_params = {
        'place_id': place_id,
        'fields': 'name,formatted_address,address_components',
        'key': GOOGLE_API_KEY
    }
    details_response = requests.get(details_url, params=details_params).json()
    result_data = details_response.get('result', {})

    result = {
        'name': result_data.get('name', '') if not name else '',
        'address': result_data.get('formatted_address', '') if not address else '',
        'city': ''
    }

    for component in result_data.get('address_components', []):
        if 'locality' in component['types']:
            result['city'] = component['long_name']
            break

    return jsonify(result)

@app.route('/fetch_photo_url', methods=['GET'])
def fetch_photo_url():
    name = request.args.get('name')
    if not name:
        return jsonify({'error': 'Missing name'}), 400

    url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
    params = {
        'input': name,
        'inputtype': 'textquery',
        'fields': 'photos,place_id',
        'key': GOOGLE_API_KEY
    }
    response = requests.get(url, params=params).json()
    candidates = response.get('candidates', [])
    if not candidates:
        return jsonify({'error': 'Place not found'}), 404

    photos = candidates[0].get('photos', [])
    if not photos:
        return jsonify({'error': 'No photos found'}), 404

    photo_reference = photos[0]['photo_reference']
    photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_reference}&key={GOOGLE_API_KEY}"

    return jsonify({'photo_url': photo_url})


def fetch_timezone_from_geonames(lat, lng):
    GEONAMES_USERNAME = 'benjinomercy'  # <-- your_geonames_username
    try:
        url = f"http://api.geonames.org/timezoneJSON?lat={lat}&lng={lng}&username={GEONAMES_USERNAME}"
        response = requests.get(url)
        data = response.json()
        return data.get('timezoneId')
    except Exception as e:
        print(f"Timezone fetch failed: {e}")
        return None

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
