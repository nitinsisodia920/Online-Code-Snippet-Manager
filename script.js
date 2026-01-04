// Create stars
        const starsContainer = document.getElementById('stars');
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }

        const API_KEY = '3045dd712ffe6e702e3245525ac7fa38';
        let currentWeatherData = null;

        function getWeatherIcon(code) {
            const icons = {
                '01d': '☀️', '01n': '🌙',
                '02d': '⛅', '02n': '☁️',
                '03d': '☁️', '03n': '☁️',
                '04d': '☁️', '04n': '☁️',
                '09d': '🌧️', '09n': '🌧️',
                '10d': '🌦️', '10n': '🌧️',
                '11d': '⛈️', '11n': '⛈️',
                '13d': '❄️', '13n': '❄️',
                '50d': '🌫️', '50n': '🌫️'
            };
            return icons[code] || '🌤️';
        }

        async function getWeather() {
            const city = document.getElementById('cityInput').value.trim();
            if (!city) {
                showError('Please enter a city name');
                return;
            }

            try {
                hideError();
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
                );

                if (!response.ok) throw new Error('City not found');

                const data = await response.json();
                currentWeatherData = data;
                displayWeather(data);
                getForecast(data.coord.lat, data.coord.lon);
                getAIInsights(data);
            } catch (error) {
                showError(error.message);
            }
        }

        async function getCurrentLocation() {
            if (!navigator.geolocation) {
                showError('Geolocation is not supported by your browser');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        hideError();
                        const response = await fetch(
                            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
                        );
                        const data = await response.json();
                        currentWeatherData = data;
                        document.getElementById('cityInput').value = data.name;
                        displayWeather(data);
                        getForecast(latitude, longitude);
                        getAIInsights(data);
                    } catch (error) {
                        showError('Failed to fetch weather data');
                    }
                },
                () => showError('Unable to retrieve your location')
            );
        }

        function displayWeather(data) {
            document.getElementById('mainWeather').style.display = 'flex';
            document.getElementById('statsCard').style.display = 'block';
            document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
            document.getElementById('weatherDesc').textContent = data.weather[0].description;
            document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°`;
            document.getElementById('weatherIcon').textContent = getWeatherIcon(data.weather[0].icon);

            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = `
                <div class="stat-item">
                    <div class="stat-icon">🌡️</div>
                    <div class="stat-label">Feels Like</div>
                    <div class="stat-value">${Math.round(data.main.feels_like)}°C</div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon">💧</div>
                    <div class="stat-label">Humidity</div>
                    <div class="stat-value">${data.main.humidity}%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon">💨</div>
                    <div class="stat-label">Wind Speed</div>
                    <div class="stat-value">${Math.round(data.wind.speed * 3.6)} km/h</div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon">🔽</div>
                    <div class="stat-label">Pressure</div>
                    <div class="stat-value">${data.main.pressure} hPa</div>
                </div>
            `;
        }

        async function getForecast(lat, lon) {
            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
                );
                const data = await response.json();
                displayTimeline(data);
            } catch (error) {
                console.error('Forecast error:', error);
            }
        }

        function displayTimeline(data) {
            const timeline = document.getElementById('timeline');
            timeline.innerHTML = '';
            
            const dailyData = {};
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000).toLocaleDateString();
                if (!dailyData[date]) {
                    dailyData[date] = item;
                }
            });

            Object.entries(dailyData).slice(0, 5).forEach(([date, item], index) => {
                const card = document.createElement('div');
                card.className = 'forecast-item';
                if (index === 0) card.classList.add('active');
                
                const dayName = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
                
                card.innerHTML = `
                    <div class="forecast-day">${dayName}</div>
                    <div class="forecast-icon">${getWeatherIcon(item.weather[0].icon)}</div>
                    <div class="forecast-temp">${Math.round(item.main.temp)}°C</div>
                    <div class="forecast-desc">${item.weather[0].main}</div>
                `;
                
                timeline.appendChild(card);
            });
        }

        async function getAIInsights(data) {
            const aiDiv = document.getElementById('aiInsights');
            aiDiv.innerHTML = '<div class="loading-spinner"></div> Generating AI insights...';

            const temp = data.main.temp;
            const humidity = data.main.humidity;
            const windSpeed = data.wind.speed * 3.6;
            const condition = data.weather[0].main;
            const description = data.weather[0].description;

            try {
                const response = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1000,
                        messages: [{
                            role: "user",
                            content: `You are a friendly weather AI assistant. Based on this weather data for ${data.name}, provide a brief, personalized insight (2-3 sentences):
                            
Temperature: ${temp}°C
Condition: ${condition} (${description})
Humidity: ${humidity}%
Wind Speed: ${windSpeed} km/h

Give practical advice about what to wear, activities to do, and any weather-related tips. Be conversational and helpful.`
                        }]
                    })
                });

                const result = await response.json();
                const insight = result.content[0].text;
                
                aiDiv.textContent = insight;
            } catch (error) {
                aiDiv.textContent = getBasicInsight(data);
            }
        }

        function getBasicInsight(data) {
            const temp = data.main.temp;
            let insight = '';

            if (temp < 10) {
                insight = "It's quite cold! Bundle up with a warm jacket, and maybe bring a scarf. Great weather for hot chocolate! ☕";
            } else if (temp < 20) {
                insight = "Pleasant temperature! A light jacket should be perfect. Good day for a walk in the park. 🚶";
            } else if (temp < 30) {
                insight = "Lovely warm weather! T-shirt weather for sure. Don't forget sunscreen if you're heading out! ☀️";
            } else {
                insight = "It's hot out there! Stay hydrated, seek shade when possible, and wear light, breathable clothing. 🥤";
            }

            if (data.weather[0].main === 'Rain') {
                insight += " Don't forget your umbrella! ☔";
            }

            return insight;
        }

        function showError(message) {
            const errorDiv = document.getElementById('error');
            errorDiv.textContent = '⚠️ ' + message;
            errorDiv.style.display = 'block';
        }

        function hideError() {
            document.getElementById('error').style.display = 'none';
        }

        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') getWeather();
        });

        getCurrentLocation();