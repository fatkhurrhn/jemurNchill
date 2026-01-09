import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // State management ESP
  const [espIp, setEspIp] = useState('192.168.1.6');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    angle: 0,
    rain_state: false,
    rssi: -84,
    free_memory: 0,
    uptime: 0,
    ip: '192.168.1.6',
    wifi_status: 'connected'
  });

  // State weather
  const [weather, setWeather] = useState({
    current: {
      temp: 28,
      humidity: 75,
      condition: 'Cerah Berawan',
      icon: 'ri-sun-cloudy-line',
      feels_like: 30
    },
    forecast: [
      { time: '1 jam', temp: 29, humidity: 72, condition: 'Cerah', icon: 'ri-sun-line', rain_chance: 10 },
      { time: 'Besok', temp: 27, humidity: 80, condition: 'Hujan Ringan', icon: 'ri-cloudy-line', rain_chance: 60 },
      { time: 'Lusa', temp: 26, humidity: 85, condition: 'Hujan Sedang', icon: 'ri-heavy-showers-line', rain_chance: 80 }
    ],
    drying_estimate: '2-3 jam',
    location: 'Jakarta',
    last_update: new Date().toLocaleTimeString('id-ID', { hour12: false })
  });

  const [history, setHistory] = useState([
    { id: 1, time: '12:30:45', date: '10 Mar 2024', action: 'Sistem dimulai', type: 'system' },
    { id: 2, time: '12:31:20', date: '10 Mar 2024', action: 'Servo ditutup (0°)', type: 'close' },
    { id: 3, time: '12:35:10', date: '10 Mar 2024', action: 'Hujan terdeteksi', type: 'rain' },
    { id: 4, time: '12:35:12', date: '10 Mar 2024', action: 'Servo dibuka (180°)', type: 'open' },
    { id: 5, time: '12:40:05', date: '10 Mar 2024', action: 'Kondisi kering', type: 'dry' },
    { id: 6, time: '12:40:06', date: '10 Mar 2024', action: 'Servo ditutup (0°)', type: 'close' }
  ]);

  const [message, setMessage] = useState({ text: '', type: '' });
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showFloatingButtons, setShowFloatingButtons] = useState(true);

  // Konfigurasi ESP
  const BASE_URL = `http://${espIp}`;

  // OpenWeather API Key dari environment variable
  const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  const WEATHER_URL = `https://api.openweathermap.org/data/2.5/forecast?q=Jakarta&appid=${WEATHER_API_KEY}&units=metric&lang=id`;

  // Cek koneksi ke ESP8266
  const checkConnection = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/status`, { timeout: 3000 });
      setConnected(true);
      setStatus(response.data);
      showMessage('Berhasil terhubung ke ESP8266', 'success');
      addToHistory('Terhubung ke sistem', 'connection');
    } catch (error) {
      setConnected(false);
      showMessage('Gagal terhubung ke ESP8266', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Ambil status dari ESP8266
  const fetchStatus = async () => {
    if (!connected) return;

    try {
      const response = await axios.get(`${BASE_URL}/status`);
      setStatus(response.data);

      // Logika auto rain detection
      if (response.data.rain_state && response.data.angle !== 180) {
        addToHistory('Hujan terdeteksi - Servo dibuka', 'rain');
      } else if (!response.data.rain_state && response.data.angle !== 0) {
        addToHistory('Kondisi kering - Servo ditutup', 'dry');
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  // Ambil data cuaca
  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      // Gunakan API key dari environment variable
      if (WEATHER_API_KEY && WEATHER_API_KEY !== '0fc2796feceaddf4058f2c75de8dacf3') {
        const response = await axios.get(WEATHER_URL);
        const data = response.data;

        // Process weather data
        const current = data.list[0];
        const forecast = [
          {
            time: '1 jam',
            temp: Math.round(current.main.temp),
            humidity: current.main.humidity,
            condition: current.weather[0].description,
            icon: getWeatherIcon(current.weather[0].id),
            rain_chance: current.pop * 100
          },
          {
            time: 'Besok',
            temp: Math.round(data.list[8].main.temp),
            humidity: data.list[8].main.humidity,
            condition: data.list[8].weather[0].description,
            icon: getWeatherIcon(data.list[8].weather[0].id),
            rain_chance: data.list[8].pop * 100
          },
          {
            time: 'Lusa',
            temp: Math.round(data.list[16].main.temp),
            humidity: data.list[16].main.humidity,
            condition: data.list[16].weather[0].description,
            icon: getWeatherIcon(data.list[16].weather[0].id),
            rain_chance: data.list[16].pop * 100
          }
        ];

        const newWeather = {
          current: {
            temp: Math.round(current.main.temp),
            humidity: current.main.humidity,
            condition: current.weather[0].description,
            icon: getWeatherIcon(current.weather[0].id),
            feels_like: Math.round(current.main.feels_like)
          },
          forecast: forecast,
          location: data.city.name,
          last_update: new Date().toLocaleTimeString('id-ID', { hour12: false })
        };

        // Hitung estimasi pengeringan
        newWeather.drying_estimate = calculateDryingEstimate(newWeather.current);
        setWeather(newWeather);

      } else {
        // Fallback ke data dummy jika API key tidak valid
        throw new Error('API key tidak valid');
      }

      showMessage('Data cuaca diperbarui', 'success');

    } catch (error) {
      console.error('Error fetching weather:', error);

      // Data dummy untuk demo
      const dummyWeather = {
        current: {
          temp: Math.floor(Math.random() * 5) + 26,
          humidity: Math.floor(Math.random() * 20) + 65,
          condition: ['Cerah', 'Cerah Berawan', 'Berawan', 'Hujan Ringan'][Math.floor(Math.random() * 4)],
          icon: ['ri-sun-line', 'ri-sun-cloudy-line', 'ri-cloudy-line', 'ri-drizzle-line'][Math.floor(Math.random() * 4)],
          feels_like: Math.floor(Math.random() * 5) + 28
        },
        forecast: [
          {
            time: '1 jam',
            temp: Math.floor(Math.random() * 5) + 27,
            humidity: Math.floor(Math.random() * 20) + 60,
            condition: ['Cerah', 'Cerah Berawan'][Math.floor(Math.random() * 2)],
            icon: ['ri-sun-line', 'ri-sun-cloudy-line'][Math.floor(Math.random() * 2)],
            rain_chance: Math.floor(Math.random() * 30)
          },
          {
            time: 'Besok',
            temp: Math.floor(Math.random() * 5) + 25,
            humidity: Math.floor(Math.random() * 25) + 65,
            condition: ['Berawan', 'Hujan Ringan'][Math.floor(Math.random() * 2)],
            icon: ['ri-cloudy-line', 'ri-drizzle-line'][Math.floor(Math.random() * 2)],
            rain_chance: Math.floor(Math.random() * 40) + 30
          },
          {
            time: 'Lusa',
            temp: Math.floor(Math.random() * 5) + 24,
            humidity: Math.floor(Math.random() * 25) + 70,
            condition: ['Hujan Ringan', 'Hujan Sedang'][Math.floor(Math.random() * 2)],
            icon: ['ri-drizzle-line', 'ri-heavy-showers-line'][Math.floor(Math.random() * 2)],
            rain_chance: Math.floor(Math.random() * 40) + 50
          }
        ],
        location: 'Jakarta',
        last_update: new Date().toLocaleTimeString('id-ID', { hour12: false })
      };

      // Hitung estimasi pengeringan
      dummyWeather.drying_estimate = calculateDryingEstimate(dummyWeather.current);
      setWeather(dummyWeather);

      showMessage('Menggunakan data cuaca demo', 'info');
    } finally {
      setWeatherLoading(false);
    }
  };

  // Helper function untuk mendapatkan icon cuaca berdasarkan OpenWeather ID
  const getWeatherIcon = (weatherId) => {
    if (weatherId >= 200 && weatherId < 300) return 'ri-thunderstorms-line';
    if (weatherId >= 300 && weatherId < 400) return 'ri-drizzle-line';
    if (weatherId >= 500 && weatherId < 600) return 'ri-heavy-showers-line';
    if (weatherId >= 600 && weatherId < 700) return 'ri-snowy-line';
    if (weatherId >= 700 && weatherId < 800) return 'ri-fog-line';
    if (weatherId === 800) return 'ri-sun-line';
    if (weatherId > 800 && weatherId < 900) return 'ri-cloudy-line';
    return 'ri-sun-cloudy-line';
  };

  // Hitung estimasi pengeringan
  const calculateDryingEstimate = (currentWeather) => {
    const { temp, humidity } = currentWeather;

    // Rumus lebih akurat
    let estimate = 4; // default 4 jam

    if (temp > 32 && humidity < 50) {
      estimate = '1-2 jam';
    } else if (temp > 30 && humidity < 60) {
      estimate = '2-3 jam';
    } else if (temp > 28 && humidity < 70) {
      estimate = '3-4 jam';
    } else if (temp > 25 && humidity < 80) {
      estimate = '4-5 jam';
    } else {
      estimate = '5-6 jam';
    }

    return estimate;
  };

  // Kontrol servo
  const controlServo = async (angle) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('angle', angle);

      await axios.post(`${BASE_URL}/control`, formData);

      setStatus(prev => ({ ...prev, angle }));

      const action = angle === 180 ? 'Servo dibuka' : 'Servo ditutup';
      showMessage(`${action} (${angle}°)`, 'success');
      addToHistory(`${action} (${angle}°)`, angle === 180 ? 'open' : 'close');

    } catch (error) {
      showMessage('Gagal mengontrol servo', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tambah ke riwayat
  const addToHistory = (text, type) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('id-ID', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const dateStr = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const newEntry = {
      id: Date.now(),
      time: timestamp,
      date: dateStr,
      action: text,
      type: type
    };

    setHistory(prev => [newEntry, ...prev.slice(0, 19)]);
  };

  // Tampilkan pesan
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Format waktu aktif
  const formatUptime = (millis) => {
    const seconds = Math.floor(millis / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Kualitas sinyal WiFi
  const getSignalQuality = (rssi) => {
    if (rssi > -50) return { level: 'Sangat Baik', color: 'text-green-600', icon: 'ri-wifi-fill' };
    if (rssi > -60) return { level: 'Baik', color: 'text-green-500', icon: 'ri-wifi-fill' };
    if (rssi > -70) return { level: 'Cukup', color: 'text-yellow-500', icon: 'ri-wifi-line' };
    return { level: 'Lemah', color: 'text-red-500', icon: 'ri-wifi-off-line' };
  };

  const signalQuality = getSignalQuality(status.rssi);

  // Warna berdasarkan kondisi cuaca
  const getWeatherColor = (condition) => {
    if (condition.includes('Cerah')) return 'text-yellow-600';
    if (condition.includes('Berawan')) return 'text-blue-400';
    if (condition.includes('Hujan')) return 'text-blue-600';
    return 'text-gray-600';
  };

  // Warna berdasarkan tipe history
  const getHistoryColor = (type) => {
    switch (type) {
      case 'open': return 'bg-green-50 border-green-200';
      case 'close': return 'bg-red-50 border-red-200';
      case 'rain': return 'bg-blue-50 border-blue-200';
      case 'dry': return 'bg-yellow-50 border-yellow-200';
      case 'connection': return 'bg-purple-50 border-purple-200';
      case 'system': return 'bg-gray-50 border-gray-200';
      case 'error': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // Icon berdasarkan tipe history
  const getHistoryIcon = (type) => {
    switch (type) {
      case 'open': return <i className="ri-lock-unlock-line text-green-600 text-lg"></i>;
      case 'close': return <i className="ri-lock-line text-red-600 text-lg"></i>;
      case 'rain': return <i className="ri-cloudy-line text-blue-600 text-lg"></i>;
      case 'dry': return <i className="ri-sun-line text-yellow-600 text-lg"></i>;
      case 'connection': return <i className="ri-wifi-line text-purple-600 text-lg"></i>;
      case 'system': return <i className="ri-cpu-line text-gray-600 text-lg"></i>;
      case 'error': return <i className="ri-error-warning-line text-red-600 text-lg"></i>;
      default: return <i className="ri-time-line text-gray-600 text-lg"></i>;
    }
  };

  // Auto-refresh status
  useEffect(() => {
    // Cek jika ada IP yang disimpan di localStorage
    const savedIp = localStorage.getItem('esp_ip');
    if (savedIp) {
      setEspIp(savedIp);
    }

    checkConnection();
    fetchWeather();

    if (connected) {
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }

    // Refresh cuaca setiap 10 menit
    const weatherInterval = setInterval(fetchWeather, 600000);
    return () => clearInterval(weatherInterval);
  }, [connected, espIp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.key === '1' || e.key === ' ') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        controlServo(180);
      } else if ((e.key === '0' || e.key === 'Escape') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        controlServo(0);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Toggle floating buttons
  const toggleFloatingButtons = () => {
    setShowFloatingButtons(!showFloatingButtons);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-[1fr_auto] items-center py-3 sm:py-4 gap-3">

            {/* Brand */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <i className="ri-cpu-line text-blue-600"></i>
                jemurNchill
              </h1>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5">
                Kontrol servo dengan prediksi cuaca
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">

              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium
          ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <i className={`ri-${connected ? 'wifi-fill' : 'wifi-off-line'} text-sm`}></i>
                <span className="hidden sm:inline">
                  {connected ? 'Terhubung' : 'Terputus'}
                </span>
              </div>

              <button
                onClick={checkConnection}
                disabled={loading}
                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5
                     bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh"
              >
                <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
                <span className="hidden sm:inline ml-1">
                  {loading ? '...' : 'Refresh'}
                </span>
              </button>

            </div>

          </div>

        </div>
      </div>


      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <i className="ri-server-line text-blue-600 text-lg"></i>
                <div>
                  <div className="text-xs text-gray-500">IP Address</div>
                  <div className="font-mono text-sm font-semibold text-gray-800">{espIp}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <i className={signalQuality.icon + " " + signalQuality.color + " text-lg"}></i>
                <div>
                  <div className="text-xs text-gray-500">Sinyal WiFi</div>
                  <div className="text-sm font-semibold text-gray-800">{status.rssi} dBm</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <i className="ri-time-line text-purple-600 text-lg"></i>
                <div>
                  <div className="text-xs text-gray-500">Waktu Aktif</div>
                  <div className="text-sm font-semibold text-gray-800">{formatUptime(status.uptime)}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <i className="ri-sd-card-line text-yellow-600 text-lg"></i>
                <div>
                  <div className="text-xs text-gray-500">Memori Tersedia</div>
                  <div className="text-sm font-semibold text-gray-800">{Math.floor(status.free_memory / 1024)} KB</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
              message.type === 'info' ? 'bg-blue-50 border border-blue-200' :
                'bg-yellow-50 border border-yellow-200'
            }`}>
            <i className={`ri-${message.type === 'success' ? 'checkbox-circle-line text-green-600' :
              message.type === 'error' ? 'error-warning-line text-red-600' :
                message.type === 'info' ? 'information-line text-blue-600' :
                  'alert-line text-yellow-600'} text-lg`}></i>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Weather & Control */}
          <div className="lg:col-span-2 space-y-6">
            {/* Weather Forecast — Mobile Friendly */}
            <div className="bg-gradient-to-br from-blue-500/90 to-blue-600/90 sm:from-blue-500 sm:to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">

              {/* Header */}
              <div className="grid grid-cols-[1fr_auto] items-start mb-4 sm:mb-6 gap-2">

                <div>
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <i className="ri-cloud-line"></i>
                    Ramalan Cuaca
                  </h2>
                  <p className="text-blue-100 text-[11px] sm:text-sm mt-0.5">
                    {weather.location} • Update: {weather.last_update}
                  </p>
                </div>

                <button
                  onClick={fetchWeather}
                  disabled={weatherLoading}
                  className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 
               bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                  title="Update Cuaca"
                >
                  <i className={`ri-refresh-line text-base sm:text-sm ${weatherLoading ? 'animate-spin' : ''}`}></i>
                </button>

              </div>


              {/* Current Weather */}
              <div className="mb-4 sm:mb-6">

                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <i className={`${weather.current.icon} text-2xl sm:text-3xl`}></i>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold">{weather.current.temp}°C</div>
                      <div className="text-blue-100 text-xs sm:text-base">
                        {weather.current.condition}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] sm:text-sm text-blue-100">Kelembapan</div>
                    <div className="text-lg sm:text-2xl font-bold">{weather.current.humidity}%</div>
                    <div className="text-[10px] sm:text-xs text-blue-100">
                      Terasa {weather.current.feels_like}°C
                    </div>
                  </div>
                </div>

                {/* Drying Estimate */}
                <div className="bg-white/20 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <i className="ri-timer-line"></i>
                      <span className="font-medium">Estimasi Pengeringan</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold">{weather.drying_estimate}</div>
                  </div>
                  <div className="text-[10px] sm:text-sm text-blue-100 mt-1">
                    Suhu {weather.current.temp}°C • Kelembapan {weather.current.humidity}%
                  </div>
                </div>
              </div>

              {/* Forecast Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {weather.forecast.map((day, index) => (
                  <div
                    key={index}
                    className={`
        bg-white/20 rounded-xl p-3 sm:p-4 text-center
        ${index === 2 ? 'col-span-2 sm:col-span-1' : ''}
      `}
                  >
                    <div className="font-semibold text-sm sm:text-base mb-1">{day.time}</div>
                    <i className={`${day.icon} text-xl sm:text-2xl mb-1 block`}></i>
                    <div className="text-lg sm:text-xl font-bold mb-0.5">{day.temp}°C</div>
                    <div className="text-[10px] sm:text-sm mb-1">{day.condition}</div>
                    <div className="flex items-center justify-center gap-1 text-[10px] sm:text-sm">
                      <i className="ri-drop-line"></i>
                      <span>{day.humidity}% • {day.rain_chance}%</span>
                    </div>
                  </div>
                ))}
              </div>


            </div>


            {/* Control Panel */}
            {/* <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <i className="ri-gamepad-line text-blue-600"></i>
                  Kontrol Servo
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFloatingButtons}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title={`${showFloatingButtons ? 'Sembunyikan' : 'Tampilkan'} tombol floating`}
                  >
                    <i className={`ri-${showFloatingButtons ? 'eye-off-line' : 'eye-line'}`}></i>
                  </button>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.rain_state ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    <i className={status.rain_state ? 'ri-cloudy-line' : 'ri-sun-line'}></i>
                    {status.rain_state ? 'Hujan Terdeteksi' : 'Kondisi Kering'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => controlServo(180)}
                  disabled={loading || !connected}
                  className="group relative p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white hover:from-green-600 hover:to-emerald-700 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-95"
                >
                  <div className="flex flex-col items-center">
                    <i className="ri-lock-unlock-line text-4xl mb-3 group-hover:scale-110 transition-transform"></i>
                    <span className="text-xl font-bold mb-1">BUKA SERVO</span>
                    <span className="text-lg font-semibold mb-2">180°</span>
                    <div className="text-sm opacity-90 bg-white/20 px-3 py-1 rounded-full">
                      Tombol [1] atau [Space]
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => controlServo(0)}
                  disabled={loading || !connected}
                  className="group relative p-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl text-white hover:from-red-600 hover:to-rose-700 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-95"
                >
                  <div className="flex flex-col items-center">
                    <i className="ri-lock-line text-4xl mb-3 group-hover:scale-110 transition-transform"></i>
                    <span className="text-xl font-bold mb-1">TUTUP SERVO</span>
                    <span className="text-lg font-semibold mb-2">0°</span>
                    <div className="text-sm opacity-90 bg-white/20 px-3 py-1 rounded-full">
                      Tombol [0] atau [Esc]
                    </div>
                  </div>
                </button>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
                  <i className="ri-information-line text-gray-600"></i>
                  <div className="text-sm text-gray-700">
                    Servo saat ini: <span className="font-bold text-gray-900 ml-1">{status.angle}°</span>
                    <span className="mx-2">•</span>
                    Prediksi cuaca: <span className={`font-bold ml-1 ${getWeatherColor(weather.current.condition)}`}>
                      {weather.current.condition}
                    </span>
                  </div>
                </div>
              </div>
            </div> */}

            {/* Weather Info & Status */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                <i className="ri-dashboard-line text-blue-600"></i>
                Status & Informasi Cuaca
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

                {/* Suhu */}
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                      <i className="ri-temp-hot-line text-base sm:text-xl text-blue-600"></i>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Suhu</div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-800">
                        {weather.current.temp}°C
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">
                    Terasa seperti {weather.current.feels_like}°C
                  </div>
                </div>

                {/* Kelembapan */}
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                      <i className="ri-drop-line text-base sm:text-xl text-green-600"></i>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Kelembapan</div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-800">
                        {weather.current.humidity}%
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">
                    {weather.current.humidity > 80 ? 'Sangat lembap' :
                      weather.current.humidity > 60 ? 'Lembap' : 'Normal'}
                  </div>
                </div>

                {/* Estimasi */}
                <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg">
                      <i className="ri-timer-line text-base sm:text-xl text-yellow-600"></i>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Estimasi Kering</div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-800">
                        {weather.drying_estimate}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">
                    {weather.drying_estimate.includes('1-2') ? 'Cepat kering' :
                      weather.drying_estimate.includes('2-3') ? 'Agak cepat' : 'Lama kering'}
                  </div>
                </div>

                {/* Servo */}
                <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                      <i className="ri-focus-2-line text-base sm:text-xl text-purple-600"></i>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Posisi Servo</div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-800">
                        {status.angle}°
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">
                    {status.angle === 0 ? 'Tertutup' : 'Terbuka'} • {status.rain_state ? 'Hujan' : 'Kering'}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column - History & Config */}
          <div className="space-y-6">
            {/* History Panel */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <i className="ri-history-line text-blue-600"></i>
                  Riwayat Aktivitas
                </h2>
                <button
                  onClick={() => setHistory([])}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  title="Hapus riwayat"
                >
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${getHistoryColor(item.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getHistoryIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="font-medium text-gray-800 text-sm truncate">
                            {item.action}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {item.time}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.date}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <i className="ri-inbox-line text-3xl mb-2"></i>
                    <p>Belum ada riwayat aktivitas</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                      <span>Buka</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                      <span>Tutup</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                      <span>Hujan</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                      <span>Kering</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Panel */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                <i className="ri-settings-3-line text-blue-600"></i>
                Konfigurasi
              </h2>

              <div className="space-y-5">

                {/* IP Config */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    IP Address ESP8266
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={espIp}
                      onChange={(e) => setEspIp(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Masukkan IP ESP8266"
                    />

                    <button
                      onClick={() => {
                        localStorage.setItem('esp_ip', espIp);
                        showMessage('IP berhasil disimpan', 'success');
                        checkConnection();
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-sm 
                     bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <i className="ri-save-line"></i>
                      Simpan
                    </button>
                  </div>
                </div>

                {/* Weather Info */}
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <i className="ri-information-line text-blue-600 mt-0.5"></i>
                    <div className="text-xs sm:text-sm text-blue-700 space-y-0.5">
                      <p className="font-medium">Weather API</p>
                      <p>Lokasi: {weather.location}</p>
                      <p>Update: {weather.last_update}</p>
                      <p>Interval: 10 menit</p>
                      <p>
                        API Key: {WEATHER_API_KEY ? '✓ Terkonfigurasi' : '✗ Belum dikonfigurasi'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shortcuts */}
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Keyboard Shortcuts</p>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    {[
                      ['1', 'Buka Servo'],
                      ['0', 'Tutup Servo'],
                      ['Space', 'Buka Servo'],
                      ['Esc', 'Tutup Servo']
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">{key}</kbd>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <i className="ri-lightbulb-line text-green-600 mt-0.5"></i>
                    <div className="text-xs sm:text-sm text-green-700 space-y-0.5">
                      <p className="font-medium">Tips Penggunaan</p>
                      <p>• Sistem otomatis membuka saat hujan</p>
                      <p>• Tutup manual saat sudah kering</p>
                      <p>• Pantau prediksi cuaca</p>
                      <p>• Gunakan tombol floating untuk kontrol cepat</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Floating Control Buttons (Compact) */}
      {showFloatingButtons && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 px-3 py-1">

            <button
              onClick={() => controlServo(180)}
              disabled={loading || !connected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 shadow"
              title="Buka Servo (180°)"
            >
              <i className="ri-lock-unlock-line text-base"></i>
              <span className="font-semibold">BUKA</span>
            </button>

            <div className="w-px h-6 bg-gray-300"></div>

            <div className="text-center min-w-[60px]">
              <div className="text-[10px] text-gray-500">Servo</div>
              <div className="text-base font-bold text-gray-800">{status.angle}°</div>
              <div className="text-[10px] text-gray-500">
                {status.rain_state ? '💧 Hujan' : '☀️ Kering'}
              </div>
            </div>

            <div className="w-px h-6 bg-gray-300"></div>

            <button
              onClick={() => controlServo(0)}
              disabled={loading || !connected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full text-sm hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 shadow"
              title="Tutup Servo (0°)"
            >
              <span className="font-semibold">TUTUP</span>
              <i className="ri-lock-line text-base"></i>
            </button>

          </div>
        </div>
      )}


      {/* Toggle Button untuk Floating Controls (ketika hidden) */}
      {!showFloatingButtons && (
        <button
          onClick={toggleFloatingButtons}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white p-3 rounded-full shadow-xl hover:bg-blue-700 transition-all hover:scale-110"
          title="Tampilkan tombol kontrol"
        >
          <i className="ri-gamepad-line text-lg"></i>
        </button>
      )}

      {/* Footer */}
      <footer className="mt-2 mb-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row text-center justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <p>ESP8266 Smart Rain Control • MAC: 50:02:91:67:C4:13</p>
              <p className="mt-1">IP: {espIp} • Signal: {status.rssi} dBm • Cuaca: {weather.current.temp}°C</p>
            </div>
            <div className="text-sm text-gray-500">
              <p>© {new Date().getFullYear()} • ESP8266 + React + Weather API</p>
              <p className="mt-1 text-xs">API Status: {WEATHER_API_KEY ? '✓ Aktif' : '✗ Demo Mode'}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;