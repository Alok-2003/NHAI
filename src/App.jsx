import './App.css'
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RoadMap from './components/Roadmap';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router>
      <div className="h-screen w-full flex flex-col">
        {/* Routes */}
        <div className="">
          <Routes>
            <Route path="/" element={<RoadMap />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
