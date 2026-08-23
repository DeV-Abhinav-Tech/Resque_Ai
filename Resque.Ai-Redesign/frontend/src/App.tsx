
import { Cloud, Shield, Activity, Satellite, Settings, HelpCircle, Search, AlertTriangle, Globe, Users } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen overflow-hidden flex font-body-md text-body-md dark">
      {/* SideNavBar */}
      <nav aria-label="Sidebar Navigation" className="bg-surface-container-low/70 backdrop-blur-xl docked left-0 h-full w-20 hover:w-64 transition-all duration-300 border-r border-white/10 shadow-2xl ease-in-out fixed left-0 top-16 h-[calc(100vh-64px)] z-40 flex flex-col py-4 group hidden md:flex">
        <div className="px-4 mb-8 flex items-center gap-4 overflow-hidden">
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border border-primary/30 bg-black flex items-center justify-center">
            {/* Using an icon since the logo image is external and might not load reliably */}
            <Globe className="w-8 h-8 text-primary" />
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            <span className="font-headline-md text-headline-md text-primary font-bold tracking-tight">BHARAT</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">National Command</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 flex-grow px-2">
          <a className="bg-primary-container text-on-primary-container rounded-xl shadow-[0_0_15px_rgba(76,215,246,0.3)] hover:bg-white/5 flex items-center gap-4 p-3 overflow-hidden" href="#">
            <Cloud className="flex-shrink-0" />
            <span className="font-label-caps text-label-caps opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">IMD</span>
          </a>
          <a className="text-on-surface-variant hover:text-on-surface hover:bg-white/5 flex items-center gap-4 p-3 rounded-xl overflow-hidden transition-colors" href="#">
            <Shield className="flex-shrink-0" />
            <span className="font-label-caps text-label-caps opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">NDMA</span>
          </a>
          <a className="text-on-surface-variant hover:text-on-surface hover:bg-white/5 flex items-center gap-4 p-3 rounded-xl overflow-hidden transition-colors" href="#">
            <Activity className="flex-shrink-0" />
            <span className="font-label-caps text-label-caps opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">NDRF</span>
          </a>
          <a className="text-on-surface-variant hover:text-on-surface hover:bg-white/5 flex items-center gap-4 p-3 rounded-xl overflow-hidden transition-colors" href="#">
            <Satellite className="flex-shrink-0" />
            <span className="font-label-caps text-label-caps opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">ISRO</span>
          </a>
        </div>
        
        <div className="flex flex-col gap-2 px-2 mt-auto">
          <a className="text-on-surface-variant hover:text-on-surface hover:bg-white/5 flex items-center gap-4 p-3 rounded-xl overflow-hidden transition-colors" href="#">
            <Settings className="flex-shrink-0" />
            <span className="font-label-caps text-label-caps opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Settings</span>
          </a>
          <a className="text-on-surface-variant hover:text-on-surface hover:bg-white/5 flex items-center gap-4 p-3 rounded-xl overflow-hidden transition-colors" href="#">
            <HelpCircle className="flex-shrink-0" />
            <span className="font-label-caps text-label-caps opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Support</span>
          </a>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col md:ml-20 mt-16 p-margin overflow-y-auto h-[calc(100vh-64px)] w-full">
        <div className="max-w-container-max mx-auto w-full flex flex-col gap-gutter">
          {/* Bento Grid Section */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            
            <div className="glass-panel rounded-xl p-6 border-l-2 border-l-red-500 glow-red relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-500/5 pointer-events-none"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="font-label-caps text-label-caps text-on-surface-variant">IMD Active Alerts</span>
                <AlertTriangle className="text-red-400" />
              </div>
              <div className="font-display-lg text-display-lg text-on-surface relative z-10">14</div>
              <div className="font-telemetry-mono text-telemetry-mono text-red-400 mt-2 relative z-10">+3 since last cycle</div>
            </div>
            
            <div className="glass-panel rounded-xl p-6 border-l-2 border-l-primary glow-cyan relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Global Data Sources</span>
                <Globe className="text-primary" />
              </div>
              <div className="font-display-lg text-display-lg text-on-surface relative z-10">2,450</div>
              <div className="font-telemetry-mono text-telemetry-mono text-primary mt-2 relative z-10">Sync: Operational</div>
            </div>
            
            <div className="glass-panel rounded-xl p-6 border-l-2 border-l-primary glow-cyan relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="font-label-caps text-label-caps text-on-surface-variant">ISRO NavIC Constellation</span>
                <Satellite className="text-primary" />
              </div>
              <div className="font-display-lg text-display-lg text-on-surface relative z-10">8/8</div>
              <div className="font-telemetry-mono text-telemetry-mono text-primary mt-2 relative z-10">Coverage: Nominal</div>
            </div>
            
            <div className="glass-panel rounded-xl p-6 border-l-2 border-l-secondary glow-amber relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-secondary/5 pointer-events-none"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Impacted Population</span>
                <Users className="text-secondary" />
              </div>
              <div className="font-display-lg text-display-lg text-on-surface relative z-10">1.2M</div>
              <div className="font-telemetry-mono text-telemetry-mono text-secondary mt-2 relative z-10">Estimated Area: 5,420 km²</div>
            </div>

          </section>

          {/* Spatial Map & Side Panel */}
          <section className="flex flex-col lg:flex-row gap-gutter h-[600px]">
            
            {/* 3D Spatial Map Widget */}
            <div className="flex-grow lg:w-2/3 glass-panel rounded-xl overflow-hidden relative border border-primary/20 glow-cyan">
              <div className="absolute inset-0 z-0 bg-surface-container-lowest/80 flex items-center justify-center">
                 {/* Placeholder for Leaflet Map */}
                 <div className="text-center">
                    <Globe className="w-16 h-16 text-primary/50 mx-auto mb-4 animate-pulse" />
                    <p className="font-telemetry-mono text-primary">INITIALIZING SPATIAL RENDERER...</p>
                 </div>
              </div>
              
              {/* Map UI Overlays */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <div className="bg-surface-container-highest/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary pulse-slow"></span>
                  LIVE FEED
                </div>
                <div className="bg-surface-container-highest/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 font-label-caps text-label-caps text-on-surface">
                  3D TERRAIN
                </div>
              </div>

              <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                <button className="bg-surface-container-highest/90 hover:bg-primary/20 p-2 rounded-lg border border-white/10 transition-colors">
                  <span className="material-symbols-outlined text-primary">add</span>
                </button>
                <button className="bg-surface-container-highest/90 hover:bg-primary/20 p-2 rounded-lg border border-white/10 transition-colors">
                  <span className="material-symbols-outlined text-primary">remove</span>
                </button>
              </div>
            </div>

            {/* Side Panel */}
            <div className="lg:w-1/3 flex flex-col gap-gutter">
              
              {/* Live Sync Widget */}
              <div className="glass-panel rounded-xl p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Data Streams</h3>
                  <span className="material-symbols-outlined text-primary pulse-slow">sync</span>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {/* Stream Item */}
                  <div className="bg-surface-container/50 rounded-lg p-4 border border-white/5 hover:border-primary/30 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-caps text-label-caps text-primary">USGS EARTHQUAKES</span>
                      <span className="text-xs font-telemetry-mono text-green-400">OK</span>
                    </div>
                    <div className="font-body-md text-on-surface-variant">M 4.5 - Andaman Islands</div>
                    <div className="text-xs text-on-surface-variant/50 mt-1">2 mins ago</div>
                  </div>

                  {/* Stream Item */}
                  <div className="bg-surface-container/50 rounded-lg p-4 border border-white/5 hover:border-primary/30 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-caps text-label-caps text-secondary">OPEN-METEO AQI</span>
                      <span className="text-xs font-telemetry-mono text-secondary">WARN</span>
                    </div>
                    <div className="font-body-md text-on-surface-variant">AQI 350 - Delhi NCR</div>
                    <div className="text-xs text-on-surface-variant/50 mt-1">15 mins ago</div>
                  </div>

                  {/* Stream Item */}
                  <div className="bg-surface-container/50 rounded-lg p-4 border border-white/5 hover:border-primary/30 transition-colors cursor-pointer border-l-2 border-l-red-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-caps text-label-caps text-red-400">NASA EONET</span>
                      <span className="text-xs font-telemetry-mono text-red-400 pulse-slow">CRIT</span>
                    </div>
                    <div className="font-body-md text-on-surface-variant">Wildfire - Uttarakhand</div>
                    <div className="text-xs text-on-surface-variant/50 mt-1">Live Tracking</div>
                  </div>
                </div>
              </div>

            </div>
          </section>

        </div>
      </main>

      {/* Top Navbar (Fixed) */}
      <header className="fixed top-0 left-0 w-full h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6">
        
        {/* Mobile Menu Toggle (Placeholder for responsive) */}
        <div className="md:hidden">
          <button className="p-2 text-on-surface hover:text-primary transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        {/* Global Search */}
        <div className="hidden md:flex flex-1 max-w-md ml-20">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-on-surface-variant w-5 h-5" />
            </div>
            <input 
              type="text" 
              className="w-full bg-surface-container/50 border border-outline-variant text-on-surface rounded-md py-2 pl-10 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder-on-surface-variant/50" 
              placeholder="Search coordinates, regions, or incident IDs..." 
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-2 bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20 px-4 py-2 rounded-lg font-label-caps text-label-caps transition-all glow-amber">
            <AlertTriangle className="w-4 h-4" />
            REPORT INCIDENT
          </button>
          
          <button className="hidden lg:flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 px-4 py-2 rounded-lg font-label-caps text-label-caps transition-all glow-red pulse-slow">
            <Activity className="w-4 h-4" />
            50KM MASS BROADCAST
          </button>

          <button className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold font-label-caps text-label-caps transition-colors shadow-[0_0_20px_rgba(220,38,38,0.6)]">
            EMERGENCY SOS
          </button>
        </div>
      </header>

    </div>
  );
}

export default App;
