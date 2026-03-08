import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountryData {
  code: string;
  name: string;
  flag: string;
  miners: number;
  color: string;
  // Position as percentage of the map container
  x: number;
  y: number;
}

const COUNTRIES: CountryData[] = [
  { code: "CA", name: "Canada", flag: "🇨🇦", miners: 185, color: "#10b981", x: 13, y: 16 },
  { code: "US", name: "United States", flag: "🇺🇸", miners: 620, color: "#3b82f6", x: 15, y: 34 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", miners: 210, color: "#d946ef", x: 27, y: 68 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", miners: 390, color: "#ef4444", x: 39, y: 10 },
  { code: "DE", name: "Germany", flag: "🇩🇪", miners: 145, color: "#e11d48", x: 47, y: 18 },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", miners: 4850, color: "#22c55e", x: 42, y: 40 },
  { code: "GH", name: "Ghana", flag: "🇬🇭", miners: 920, color: "#eab308", x: 35, y: 52 },
  { code: "CM", name: "Cameroon", flag: "🇨🇲", miners: 380, color: "#06b6d4", x: 44, y: 58 },
  { code: "EG", name: "Egypt", flag: "🇪🇬", miners: 195, color: "#0ea5e9", x: 54, y: 30 },
  { code: "KE", name: "Kenya", flag: "🇰🇪", miners: 710, color: "#14b8a6", x: 58, y: 48 },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", miners: 285, color: "#ec4899", x: 54, y: 62 },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", miners: 350, color: "#8b5cf6", x: 49, y: 72 },
  { code: "AE", name: "UAE", flag: "🇦🇪", miners: 155, color: "#6366f1", x: 64, y: 36 },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", miners: 420, color: "#84cc16", x: 70, y: 26 },
  { code: "IN", name: "India", flag: "🇮🇳", miners: 1580, color: "#f97316", x: 74, y: 44 },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", miners: 680, color: "#14b8a6", x: 78, y: 34 },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", miners: 535, color: "#f43f5e", x: 82, y: 54 },
  { code: "PH", name: "Philippines", flag: "🇵🇭", miners: 390, color: "#f59e0b", x: 88, y: 40 },
];

/* ── World map continent polygons (simplified outlines as SVG-friendly point arrays) ── */
const CONTINENT_POLYGONS: number[][][] = [
  // North America
  [[10,22],[12,18],[15,15],[18,12],[22,11],[26,12],[28,14],[27,18],[25,22],[23,26],[21,30],[20,34],[18,38],[16,40],[14,42],[13,40],[11,36],[10,30],[9,26]],
  // Greenland
  [[33,8],[36,6],[39,5],[41,6],[40,9],[37,12],[34,12]],
  // Central America & Caribbean
  [[16,42],[18,40],[20,42],[22,44],[24,46],[22,48],[20,46],[18,44]],
  // South America
  [[22,48],[24,46],[26,44],[28,44],[30,46],[32,48],[34,50],[35,54],[34,58],[33,62],[32,66],[30,70],[28,74],[26,76],[24,74],[23,70],[22,66],[21,62],[22,58],[23,54],[22,50]],
  // Europe
  [[38,16],[40,14],[42,13],[44,12],[46,13],[48,14],[50,15],[52,14],[54,16],[52,18],[50,20],[48,22],[46,24],[44,26],[42,28],[40,26],[38,24],[37,20]],
  // Scandinavia
  [[46,8],[48,6],[50,5],[52,7],[51,10],[49,12],[47,11]],
  // Africa
  [[38,30],[40,28],[42,28],[44,30],[46,32],[48,34],[50,36],[52,38],[54,40],[56,42],[58,44],[58,48],[57,52],[56,56],[55,60],[54,64],[52,68],[50,72],[48,74],[46,72],[44,68],[42,64],[40,60],[38,56],[36,52],[35,48],[36,44],[37,40],[38,36]],
  // Middle East
  [[56,28],[58,26],[60,28],[62,30],[64,32],[66,34],[64,36],[62,38],[60,36],[58,34],[56,32]],
  // Russia / Central Asia
  [[54,14],[56,12],[58,10],[62,8],[66,7],[70,8],[74,9],[78,10],[82,11],[86,12],[88,14],[86,16],[84,18],[80,20],[76,18],[72,16],[68,14],[64,13],[60,14],[56,15]],
  // South Asia (India)
  [[66,36],[68,34],[70,32],[72,34],[74,36],[76,38],[78,40],[76,44],[74,48],[72,50],[70,48],[68,44],[66,40]],
  // East Asia
  [[78,16],[80,14],[82,16],[84,18],[86,20],[88,22],[86,26],[84,30],[82,34],[80,36],[78,34],[76,30],[76,26],[77,22],[78,18]],
  // Southeast Asia
  [[80,38],[82,36],[84,38],[86,40],[84,44],[82,46],[80,44],[78,42]],
  // Japan / Korea
  [[86,24],[88,22],[89,26],[87,28],[85,26]],
  // Indonesia
  [[82,48],[84,46],[86,48],[88,50],[86,52],[84,52],[82,50]],
  // Australia
  [[82,58],[84,56],[86,56],[88,58],[90,60],[92,62],[92,66],[90,70],[88,72],[86,74],[84,72],[82,68],[80,64],[80,60]],
  // New Zealand
  [[92,72],[93,70],[94,72],[93,76],[92,74]],
];

function isPointInPolygon(px: number, py: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function DotMap() {
  const dots: { cx: number; cy: number; opacity: number }[] = [];
  const step = 1.6;

  for (let x = 0; x <= 100; x += step) {
    for (let y = 0; y <= 85; y += step) {
      for (const poly of CONTINENT_POLYGONS) {
        if (isPointInPolygon(x, y, poly)) {
          dots.push({ cx: x, cy: y, opacity: 0.2 + Math.random() * 0.15 });
          break;
        }
      }
    }
  }

  return (
    <svg
      viewBox="0 0 100 85"
      className="w-full h-full absolute inset-0"
      preserveAspectRatio="xMidYMid meet"
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={0.4}
          fill="#4a9eff"
          opacity={d.opacity}
        />
      ))}
    </svg>
  );
}

/* ── Single country flag marker ── */
function FlagMarker({
  country,
  isActive,
  delay,
}: {
  country: CountryData;
  isActive: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, type: "spring", stiffness: 200 }}
      className="absolute flex flex-col items-center"
      style={{
        left: `${country.x}%`,
        top: `${country.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: isActive ? 20 : 10,
      }}
    >
      {/* Pulse ring */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute rounded-full"
            style={{
              width: 36,
              height: 36,
              border: `2px solid ${country.color}`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Flag circle */}
      <motion.div
        animate={{
          boxShadow: isActive
            ? `0 0 16px 4px ${country.color}88, 0 0 32px 8px ${country.color}44`
            : `0 0 6px 1px ${country.color}33`,
          scale: isActive ? 1.15 : 1,
        }}
        transition={{ duration: 0.4 }}
        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-sm md:text-base relative"
        style={{
          background: `linear-gradient(135deg, ${country.color}22, ${country.color}44)`,
          border: `1.5px solid ${country.color}88`,
          backdropFilter: "blur(4px)",
        }}
      >
        {country.flag}
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{ opacity: isActive ? 1 : 0.6 }}
        className="mt-1 text-[9px] md:text-[10px] font-bold tracking-wider uppercase"
        style={{
          color: isActive ? country.color : "rgba(255,255,255,0.5)",
          textShadow: isActive ? `0 0 8px ${country.color}88` : "none",
        }}
      >
        {country.code}
      </motion.span>
    </motion.div>
  );
}

/* ── Exported component ── */
export default function GlobeMap() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % COUNTRIES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full relative" style={{ aspectRatio: "2/1", minHeight: 300, maxHeight: 520 }}>
      {/* Dot matrix map */}
      <DotMap />

      {/* Country flags */}
      {COUNTRIES.map((c, i) => (
        <FlagMarker
          key={c.code}
          country={c}
          isActive={activeIndex === i}
          delay={0.1 + i * 0.05}
        />
      ))}

      {/* Active country indicator dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
        {COUNTRIES.map((c, i) => (
          <div
            key={c.code}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: activeIndex === i ? c.color : "rgba(255,255,255,0.12)",
              boxShadow: activeIndex === i ? `0 0 8px ${c.color}` : "none",
              transform: activeIndex === i ? "scale(1.5)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
