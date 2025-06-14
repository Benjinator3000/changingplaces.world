### Vereiste pakketten (requirements.txt)

flask
flask-cors
pandas
openpyxl

### Hoe start je de server lokaal

1. **Installeer Python dependencies**
   Open een terminal in de projectmap en voer uit:

   =============
bash (cmd):
   pip install -r requirements.txt
   =============

2. **Start de Flask server**
   Zorg dat alle bestanden zoals `app.py`, `index.html`, `map.js`, `style.css`, `locations.xlsx` en het SVG-logo zich in dezelfde map bevinden.

   Start de server met:

   =============
bash (cmd):
   python app.py
   =============

3. **Open je browser**
   Ga naar:

   =============
   http://127.0.0.1:5000/
   =============

   Hier draait je volledige frontend en backend lokaal, inclusief kaart, pins, formulier en API.

=============

📁 Projectstructuur:
=============
project-folder/
├── app.py
├── index.html
├── map.js
├── style.css
├── locations.xlsx
├── adult changing table.svg
├── requirements.txt

=============
!!!!!!! Zorg dat je je project altijd via `python app.py` start, niet via Live Server of `file:///`, anders werken de API-aanroepen niet!!!!!
=============

### Verantwoording publieke API en functionaliteiten

=============
**Gebruik van publieke API**:
- Via OpenStreetMap’s Nominatim API wordt een adres van de gebruiker omgezet naar coördinaten.
- De response wordt **gebruikt om een marker op de kaart te tonen**, en **een popup met informatie te genereren**.
=============

=============
**Weergave op de kaart én in tekstueel deel**:
- Marker verschijnt op Leaflet-kaart
- Popup toont gegevens zoals naam, adres, uitrusting, foto (tekstueel weergegeven binnen de kaartinterface)
=============

=============
**Functionaliteiten**:
- 🌙 **Dark mode toggle**: schakelt het kleurenschema van de hele interface om
- ➕ **Locatie toevoegen via formulier**:
   - Gebruiker vult naam, adres, stad, enz. in
   - Klikt op “Add Location” → een marker wordt getoond op de kaart
   - Deze marker is **versleepbaar**, waarna de gebruiker op “Confirm Location” klikt
- 📍 **Direct toevoegen via klik op kaart**:
   - Klik op de kaart → marker verschijnt, versleepbaar
   - Vul daarna aanvullende data in en bevestig
- 🗺️ **Hoverknop voor kaartlagen**:
   - Zweef rechtsboven op het 🗺️-icoon → kies tussen Esri en OpenStreetMap
   - Pas transparantie aan via slider
   - De transparantie laadt standaard in op 35%
   - De Ersi kaart leunt aan bij de layout echter was de OSM kaart nodig voor woningen te visualiseren
- 🔍 **Filters voor landen, steden, uitrusting**:
   - Drop-down menu’s bovenaan filteren de gepinde locaties dynamisch
- ℹ️ **Meer info bij pin-click**:
   - Klik op een marker → popup met naam, adres, openingsuren, toegankelijkheid...
- 💾 **Locaties worden opgeslagen in een Excel-bestand**:
   - Na bevestigen wordt de locatie toegevoegd aan `locations.xlsx`
   - De backend leest dit bestand continu in voor actuele pins
=============



