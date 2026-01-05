import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // State management
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

  const [history, setHistory] = useState([
    { id: 1, time: '12:30:45', date: '10 Mar 2024', action: 'Sistem dimulai', type: 'system' },
    { id: 2, time: '12:31:20', date: '10 Mar 2024', action: 'Servo ditutup (0°)', type: 'close' },
    { id: 3, time: '12:35:10', date: '10 Mar 2024', action: 'Hujan terdeteksi', type: 'rain' },
    { id: 4, time: '12:35:12', date: '10 Mar 2024', action: 'Servo dibuka (180°)', type: 'open' },
    { id: 5, time: '12:40:05', date: '10 Mar 2024', action: 'Kondisi kering', type: 'dry' },
    { id: 6, time: '12:40:06', date: '10 Mar 2024', action: 'Servo ditutup (0°)', type: 'close' }
  ]);

  const [message, setMessage] = useState({ text: '', type: '' });

  // Konfigurasi ESP
  const BASE_URL = `http://${espIp}`;

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
    checkConnection();

    if (connected) {
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <i className="ri-cpu-line text-blue-600"></i>
                ESP8266 Servo Control
              </h1>
              <p className="text-gray-600 text-sm mt-1">Kontrol servo dengan sensor hujan</p>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <i className={`ri-${connected ? 'wifi-fill' : 'wifi-off-line'}`}></i>
                <span className="text-sm font-medium">{connected ? 'Terhubung' : 'Terputus'}</span>
              </div>

              <button
                onClick={checkConnection}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
                {loading ? '...' : 'Refresh'}
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
                'bg-blue-50 border border-blue-200'
            }`}>
            <i className={`ri-${message.type === 'success' ? 'checkbox-circle-line text-green-600' : 'error-warning-line text-red-600'} text-lg`}></i>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Control & Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Control Panel */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <i className="ri-gamepad-line text-blue-600"></i>
                  Kontrol Servo
                </h2>
                <div className="flex items-center gap-2">
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
                  <div className="absolute top-3 right-3 text-xs bg-white/30 px-2 py-1 rounded">
                    Manual
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
                  <div className="absolute top-3 right-3 text-xs bg-white/30 px-2 py-1 rounded">
                    Manual
                  </div>
                </button>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
                  <i className="ri-information-line text-gray-600"></i>
                  <div className="text-sm text-gray-700">
                    Servo saat ini: <span className="font-bold text-gray-900 ml-1">{status.angle}°</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Detail */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <i className="ri-dashboard-line text-blue-600"></i>
                Status Detail
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <i className="ri-focus-2-line text-blue-600 text-xl"></i>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Posisi Servo</div>
                      <div className="text-2xl font-bold text-gray-800">{status.angle}°</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {status.angle === 0 ? 'Servo dalam posisi tertutup' : 'Servo dalam posisi terbuka'}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <i className={signalQuality.icon + " " + signalQuality.color + " text-xl"}></i>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Kualitas Sinyal</div>
                      <div className="text-2xl font-bold text-gray-800">{status.rssi} dBm</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: <span className={signalQuality.color + " font-medium"}>{signalQuality.level}</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <i className="ri-cloud-line text-purple-600 text-xl"></i>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Sensor Hujan</div>
                      <div className={`text-2xl font-bold ${status.rain_state ? 'text-blue-600' : 'text-yellow-600'}`}>
                        {status.rain_state ? 'BASAH' : 'KERING'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {status.rain_state ? 'Air terdeteksi pada sensor' : 'Sensor dalam kondisi kering'}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <i className="ri-time-line text-yellow-600 text-xl"></i>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Uptime</div>
                      <div className="text-2xl font-bold text-gray-800">{formatUptime(status.uptime)}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Sistem telah berjalan selama
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
                  <div className="flex items-center gap-4 flex-wrap">
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
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <i className="ri-settings-3-line text-blue-600"></i>
                Konfigurasi
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IP Address ESP8266
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={espIp}
                      onChange={(e) => setEspIp(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Masukkan IP ESP8266"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('esp_ip', espIp);
                        showMessage('IP berhasil disimpan', 'success');
                        checkConnection();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <i className="ri-save-line"></i>
                      Simpan
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <i className="ri-information-line text-blue-600 mt-0.5"></i>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Informasi Koneksi</p>
                      <p>MAC: 50:02:91:67:C4:13</p>
                      <p>Hostname: ESP-67C413</p>
                      <p className="mt-1">Pastikan ESP dan perangkat dalam WiFi yang sama</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Keyboard Shortcuts:</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">1</kbd>
                        <span>Buka Servo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">0</kbd>
                        <span>Tutup Servo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Space</kbd>
                        <span>Buka Servo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Esc</kbd>
                        <span>Tutup Servo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <p>ESP8266 Servo Control System • MAC: 50:02:91:67:C4:13</p>
              <p className="mt-1">IP: {espIp} • Signal: {status.rssi} dBm • Status: {connected ? 'Terhubung' : 'Terputus'}</p>
            </div>
            <div className="text-sm text-gray-500">
              <p>© {new Date().getFullYear()} • Dibuat dengan ESP8266 & React</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;