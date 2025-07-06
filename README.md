# NHAI Road Survey Dashboard

An interactive web dashboard that synchronises road-survey video playback with geospatial and pavement-condition data.  Built with **React + Vite**, **Mapbox GL JS**, **Chart.js**, Tailwind CSS, and PapaParse.

<p align="center">
  <img src="./screenshot.png" alt="Dashboard screenshot"/>
</p>

---

## ✨ Features

1. **Synchronised Playback** – Video (`public/L2.mp4`), map marker and data table progress together.  When the video ends, the marker reaches the final chainage and graphs stop.
2. **Mapbox Visualisation** – Poly-line of Lane 2 plotted from `public/NHAI.csv`; marker auto-centres.
3. **Dynamic Analytics** – Table highlights roughness severity, live mean-index graph updates in real-time.
4. **Responsive UI** – Tailwind-powered dark theme; works on desktop & tablets.
5. **CSV Driven** – No hard-coding; change the CSV / video and the dashboard adapts.

---

## 📂 Project Structure

```
NHAI/
├── public/
│   ├── L2.mp4          # Survey video
│   └── NHAI.csv        # Source data (lane coords + condition metrics)
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx  # main synced view
│   │   └── Roadmap.jsx    # standalone exploratory map
│   ├── App.jsx            # router entry
│   └── main.jsx           # Vite entry
├── index.html
└── tailwind.config.js
```

---

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Add Mapbox token** – open `src/components/Dashboard.jsx` & `Roadmap.jsx` and replace the placeholder `mapboxgl.accessToken` with your token.
3. **Run dev server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

4. **Production build**
   ```bash
   npm run build
   npm run preview  # optional local preview
   ```

---

## 🔄 Data Format

`public/NHAI.csv` columns of interest (0-indexed):

| Index | Column                                             | Used           |
|-------|----------------------------------------------------|----------------|
| 1–3   | Start/End Chainage & Segment Length                | Table & graph  |
| 9-12  | Lane 2 Start( lat,lng ) & End( lat,lng )           | Map line       |
| 35    | **L2 Lane Roughness BI (mm/km)**                   | Mean index     |
| 49    | **L2 Rut Depth (mm)**                              | Mean index     |
| 57    | **L2 Crack Area (% area)**                         | Mean index     |
| 66    | **L2 Area (% area)** *(ravelling)*                 | Mean index     |

Modify indices in `Dashboard.jsx` if your CSV differs.

---

## 📊 Mean Condition Index
```
Mean = ( Roughness + RutDepth + CrackArea + Ravelling ) / 4
```
Displayed as cyan line chart, recalculated every `timeupdate` event.

---

## 🛠  Useful Scripts

| Command            | Description                     |
|--------------------|---------------------------------|
| `npm run dev`      | Start Vite dev server           |
| `npm run build`    | Production build (dist/)        |
| `npm run preview`  | Preview production build        |
| `npm run lint`     | ESLint check (if configured)    |

---

## 🙌 Contributing
Pull requests are welcome!  For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License
This project is MIT licensed.


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
