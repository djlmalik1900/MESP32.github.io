      // ESP32 configuration
    let espIp = '10.220.226.85';
    let connectionStatus = false;
    
    // Control states
    let lightRoom1On = false;
    let lightRoom2On = false;
    let pumpOn = false;
    let allOn = false;
    
    // DOM elements
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const currentIp = document.getElementById('currentIp');

    // Test connection to ESP32 with better error handling
    async function checkConnection() {
        statusText.textContent = 'Checking...';
        statusDot.style.background = '#ffaa00';
        
        try {
            // Use a more robust connection test with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`http://${espIp}/`, {
                method: 'GET',
                mode: 'no-cors', // Important for local network requests
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            setConnectionStatus(true);
            console.log('Connection successful!');
            
        } catch (error) {
            console.error('Connection failed:', error);
            
            // Try alternative method - create an image request (bypasses CORS)
            testConnectionAlternative();
        }
    }

    // Alternative connection test using Image object (bypasses CORS)
    function testConnectionAlternative() {
        const img = new Image();
        img.onload = function() {
            setConnectionStatus(true);
            console.log('Connection successful (alternative method)!');
        };
        img.onerror = function() {
            setConnectionStatus(false);
            console.log('Connection failed (alternative method)');
        };
        
        // Use a timestamp to avoid caching
        img.src = `http://${espIp}/?t=${new Date().getTime()}`;
    }

    // Set connection status visual
    function setConnectionStatus(connected) {
        connectionStatus = connected;
        statusDot.className = 'status-dot' + (connected ? ' connected' : '');
        statusText.textContent = connected ? 'Connected' : 'Disconnected';
        
        if (connected) {
            // Auto-get status when connected
            setTimeout(getStatus, 500);
        }
    }

    
    // Get current status from ESP32
    async function getStatus() {
        if (!connectionStatus) {
            if (!confirm('Not connected to ESP32! Try to get status anyway?')) {
                return;
            }
        }
        
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `http://${espIp}/status`, true);
            xhr.timeout = 5000;
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const status = xhr.responseText;
                    
                    // Parse status (format: "Fan:1,Light:0,Pump:1")
                    const statusDisplay = document.getElementById('statusDisplay');
                    statusDisplay.innerHTML = `
                        <div style="display: grid; gap: 10px; margin-top: 10px;">
                            <div><strong>Fan (Pin 45):</strong> <span style="color: ${status.includes('Fan:1') ? '#4CAF50' : '#ff4444'}">${status.includes('Fan:1') ? 'ON' : 'OFF'}</span></div>
                            <div><strong>Light (Pin 48):</strong> <span style="color: ${status.includes('Light:1') ? '#4CAF50' : '#ff4444'}">${status.includes('Light:1') ? 'ON' : 'OFF'}</span></div>
                            <div><strong>Pump (Pin 47):</strong> <span style="color: ${status.includes('Pump:1') ? '#4CAF50' : '#ff4444'}">${status.includes('Pump:1') ? 'ON' : 'OFF'}</span></div>
                            <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">Last updated: ${new Date().toLocaleTimeString()}</div>
                        </div>
                    `;
                    
                    // Update button states
                    fanOn = status.includes('Fan:1');
                    lightOn = status.includes('Light:1');
                    pumpOn = status.includes('Pump:1');
                    
                    document.getElementById('fan-btn').classList.toggle('active', fanOn);
                    document.getElementById('light-btn').classList.toggle('active', lightOn);
                    document.getElementById('pump-btn').classList.toggle('active', pumpOn);
                    updateAllButton();
                    
                    console.log('Status updated successfully');
                    
                } else {
                    throw new Error(`HTTP ${xhr.status}`);
                }
            };
            
            xhr.onerror = function() {
                throw new Error('Network error');
            };
            
            xhr.send();
            
        } catch (error) {
            console.error('Status check failed:', error);
            document.getElementById('statusDisplay').innerHTML = `
                <div style="color: #ff4444;">
                    <p>Failed to get status: ${error.message}</p>
                    <p>Make sure ESP32 is running and IP is correct.</p>
                </div>
            `;
        }
    }

    // Manual test function - try direct browser access
    function manualTest() {
        window.open(`http://${espIp}/`, '_blank');
    }
// Toggle individual control with better error handling
    async function toggleControl(device) {
        if (!connectionStatus) {
            if (!confirm('Not connected to ESP32! Try anyway?')) {
                return;
            }
        }
        
        let url;
        let button;
        
        switch(device) {
            case 'lightroom1':
                lightRoom1On = !lightRoom1On;
                url = `/lightroom1/${lightRoom1On ? 'on' : 'off'}`;
                button = document.getElementById('light-room1');
                break;
            case 'lightroom2':
                lightRoom2On = !lightRoom2On;
                url = `/lightroom2/${lightRoom2On ? 'on' : 'off'}`;
                button = document.getElementById('light-room2');
                break;
            case 'pump':
                pumpOn = !pumpOn;
                url = `/pump/${pumpOn ? 'on' : 'off'}`;
                button = document.getElementById('pump-btn');
                break;
        }
        
        try {
            // Use XMLHttpRequest which has better CORS handling for local networks
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `http://${espIp}${url}`, true);
            xhr.timeout = 5000;
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    button.classList.toggle('active');
                    updateAllButton();
                    console.log(`${device} toggled successfully`);
                } else {
                    throw new Error(`HTTP ${xhr.status}`);
                }
            };
            
            xhr.onerror = function() {
                throw new Error('Network error');
            };
            
            xhr.ontimeout = function() {
                throw new Error('Request timeout');
            };
            
            xhr.send();
            
        } catch (error) {
            console.error('Control failed:', error);
            // Revert the state change since the command failed
            switch(device) {
                case 'fan': fanOn = !fanOn; break;
                case 'light': lightOn = !lightOn; break;
                case 'pump': pumpOn = !pumpOn; break;
            }
            alert(`Failed to control ${device}: ${error.message}`);
        }
    }
    // Initial connection check
    window.addEventListener('load', function() {
        console.log('Dashboard loaded, testing connection to:', espIp);
        checkConnection();
        
        // Add manual test button to config panel
        const configPanel = document.querySelector('.config-panel');
        const testButton = document.createElement('button');
        testButton.textContent = 'Manual Test';
        testButton.onclick = manualTest;
        testButton.style.marginLeft = '10px';
        testButton.style.padding = '8px 15px';
        testButton.style.background = '#2196F3';
        document.querySelector('.config-input').appendChild(testButton);
    });

    // Auto-refresh status every 10 seconds when connected
    setInterval(() => {
        if (connectionStatus) {
            getStatus();
        }
    }, 10000);
