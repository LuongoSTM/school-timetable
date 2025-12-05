const VALID_USERS = {
            "Administrator": "admin123",
            "Ms K Arakelian": "arakelian123",
            "Ms N Jenkins": "jenkins123"
        };
        let currentUser = null;
        let currentModalData = null;
        // ==============================
        // LOGIN SYSTEM
        // ==============================
        if (localStorage.getItem('currentUser') && VALID_USERS[localStorage.getItem('currentUser')]) {
            currentUser = localStorage.getItem('currentUser');
            document.getElementById('logged-in-user').textContent = currentUser;
            document.getElementById('requests-logged-in-user').textContent = currentUser;
            document.getElementById('login-page').style.display = 'none';
            document.querySelector('.container').style.display = 'block';
            document.getElementById('requests-nav').style.display = 'flex';
        } else {
            document.getElementById('login-page').style.display = 'block';
            document.querySelector('.container').style.display = 'none';
        }
        document.getElementById('login-btn').addEventListener('click', () => {
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            if (VALID_USERS[user] === pass) {
                currentUser = user;
                localStorage.setItem('currentUser', user);
                document.getElementById('logged-in-user').textContent = user;
                document.getElementById('requests-logged-in-user').textContent = user;
                document.getElementById('login-page').style.display = 'none';
                document.querySelector('.container').style.display = 'block';
                document.getElementById('requests-nav').style.display = 'flex';
                generateTimetable();
                renderLessonsCountTable();
                populateTodaysLessonsBox();
                errorEl.textContent = '';
            } else {
                errorEl.textContent = "Invalid username or password.";
            }
        });
        document.getElementById('logout-link').addEventListener('click', (e) => {
            e.preventDefault();
            currentUser = null;
            localStorage.removeItem('currentUser');
            document.getElementById('login-page').style.display = 'block';
            document.querySelector('.container').style.display = 'none';
            document.getElementById('requests-nav').style.display = 'none';
        });
        // ==============================
        // REQUESTS SYSTEM
        // ==============================
        function loadRequests() {
            const requests = [];
            for (let key in localStorage) {
                if (key.startsWith('request_')) {
                    try {
                        const req = JSON.parse(localStorage.getItem(key));
                        if (req) {
                            if (currentUser === "Administrator" || req.teacher === currentUser) {
                                requests.push(req);
                            }
                        }
                    } catch (e) {
                        console.warn("Invalid request in localStorage:", key);
                    }
                }
            }
            return requests.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        }
        function saveRequest(req) {
            const key = `request_${req.teacher}_${req.subject}_${req.period}_${req.day}_${req.week}`;
            req.addedAt = req.addedAt || new Date().toISOString();
            req.lastModified = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(req));
        }
        function deleteRequest(req) {
            const key = `request_${req.teacher}_${req.subject}_${req.period}_${req.day}_${req.week}`;
            localStorage.removeItem(key);
        }
        // ✅ FUNZIONE AGGIORNATA PER RENDERIZZARE CON FILTRO, INDICATORE E SUMMARY
        function renderRequestsPage() {
            const container = document.getElementById('requests-list-container');
            const filterSelect = document.getElementById('requests-teacher-filter');
            const summaryEl = document.getElementById('requests-summary');
            const requests = loadRequests();
            container.innerHTML = '';

            if (requests.length === 0) {
                container.innerHTML = '<div class="no-requests">No lesson requests yet.</div>';
                summaryEl.textContent = 'Total: 0';
                return;
            }

            // Aggiorna riepilogo
            const total = requests.length;
            const arakelian = requests.filter(r => r.teacher === "Ms K Arakelian").length;
            const jenkins = requests.filter(r => r.teacher === "Ms N Jenkins").length;
            summaryEl.innerHTML = `📚 Total: ${total} | 👩‍🏫 Arakelian: ${arakelian} | 👨‍🏫 Jenkins: ${jenkins}`;

            // Applica filtro
            const teacherFilter = filterSelect.value;
            const filtered = requests.filter(r => 
                teacherFilter === 'all' || r.teacher === teacherFilter
            );

            if (filtered.length === 0) {
                container.innerHTML = '<div class="no-requests">No requests match the selected filter.</div>';
                return;
            }

            filtered.forEach(req => {
                const el = document.createElement('div');
                // ✅ Indicatore per richieste recenti (<1h)
                const isNew = (new Date() - new Date(req.addedAt)) < 3600000;
                el.className = 'request-item' + (isNew ? ' request-new' : '');
                const dayName = new Date(req.addedAt).toLocaleDateString('en-US', { weekday: 'short' });
                el.innerHTML = `
                    <div class="request-info">
                        <div><strong>${req.subject}</strong> • ${req.teacher}</div>
                        <div>Period: ${req.period} • ${req.time} • ${req.room || '—'}</div>
                        <div><em>${req.requestText || '—'}</em></div>
                        <div><small>${req.day} • Week ${req.week} • ${dayName}</small></div>
                    </div>
                    <div class="request-actions">
                        <button class="edit-btn" data-key="${btoa(JSON.stringify(req))}">Edit</button>
                        ${currentUser === "Administrator" ? `<button class="delete-btn" data-key="${btoa(JSON.stringify(req))}">Delete</button>` : ''}
                    </div>
                `;
                container.appendChild(el);
            });

            // Aggiungi listener
            container.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const req = JSON.parse(atob(btn.dataset.key));
                    openRequestInModal(req);
                });
            });
            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm("Delete this request?")) {
                        const req = JSON.parse(atob(btn.dataset.key));
                        deleteRequest(req);
                        renderRequestsPage();
                    }
                });
            });
        }

        // ✅ AUTO-REFRESH OGNI 5 MINUTI
        let autoRefreshInterval;
        function startAutoRefresh() {
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            autoRefreshInterval = setInterval(() => {
                if (document.getElementById('requests-page').style.display === 'block') {
                    renderRequestsPage();
                }
            }, 5 * 60 * 1000);
        }

        function openRequestInModal(req) {
            currentModalData = req;
            document.getElementById('modal-teacher').textContent = req.teacher;
            document.getElementById('modal-subject').textContent = req.subject;
            document.getElementById('modal-period').textContent = req.period;
            document.getElementById('modal-time').textContent = req.time;
            document.getElementById('modal-room').textContent = req.room || '—';
            const remaining = countRemainingLessons(req.subject);
            document.getElementById('modal-remaining').textContent = remaining;
            document.getElementById('request-row').style.display = 'flex';
            document.getElementById('modal-request').value = req.requestText || '';
            document.getElementById('save-request-btn').style.display = 'inline-block';
            document.getElementById('add-reminder-btn').style.display = 'none';
            document.getElementById('lesson-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        function exportRequestsToCSV() {
            const requests = loadRequests();
            if (requests.length === 0) {
                alert("No requests to export.");
                return;
            }
            let csv = "Teacher,Subject,Period,Time,Room,Request,Day,Week,AddedAt\n";
            requests.forEach(r => {
                const row = [
                    `"${r.teacher}"`,
                    `"${r.subject}"`,
                    `"${r.period}"`,
                    `"${r.time}"`,
                    `"${r.room || ''}"`,
                    `"${(r.requestText || '').replace(/"/g, '""')}"`,
                    `"${r.day}"`,
                    `"${r.week}"`,
                    `"${new Date(r.addedAt).toISOString()}"`
                ].join(",");
                csv += row + "\n";
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lesson-requests-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        // ==============================
        // MODAL UPDATE
        // ==============================
        function openLessonModal(cellData) {
            if (!cellData.subject || ['Form Time', 'Lunch', ''].includes(cellData.subject)) return;
            currentModalData = cellData;
            document.getElementById('modal-teacher').textContent = cellData.teacher;
            document.getElementById('modal-subject').textContent = cellData.subject;
            document.getElementById('modal-period').textContent = cellData.period;
            document.getElementById('modal-time').textContent = cellData.time;
            document.getElementById('modal-room').textContent = cellData.room || '—';
            const remaining = countRemainingLessons(cellData.subject);
            document.getElementById('modal-remaining').textContent = remaining;
            const canEditRequest = currentUser === "Administrator" || currentUser === cellData.teacher;
            document.getElementById('request-row').style.display = canEditRequest ? 'flex' : 'none';
            if (canEditRequest) {
                const requestKey = `request_${cellData.teacher}_${cellData.subject}_${cellData.period}_${cellData.day}_${cellData.week}`;
                const saved = JSON.parse(localStorage.getItem(requestKey) || '{}');
                document.getElementById('modal-request').value = saved.requestText || '';
                document.getElementById('save-request-btn').style.display = 'inline-block';
            } else {
                document.getElementById('save-request-btn').style.display = 'none';
            }
            document.getElementById('add-reminder-btn').style.display = 'inline-block';
            document.getElementById('reminder-added').style.display = 'none';
            document.getElementById('lesson-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        document.getElementById('save-request-btn').addEventListener('click', () => {
            if (!currentModalData || !currentUser) return;
            const requestText = document.getElementById('modal-request').value.trim();
            const req = {
                teacher: currentModalData.teacher,
                subject: currentModalData.subject,
                period: currentModalData.period,
                time: currentModalData.time,
                room: currentModalData.room,
                day: currentModalData.day,
                week: currentModalData.week,
                requestText
            };
            saveRequest(req);
            alert("Request saved!");
            closeLessonModal();
        });
        // ==============================
        // NAVIGATION
        // ==============================
        function hideAllPages() {
            document.getElementById('requests-page').style.display = 'none';
            document.querySelector('.container').style.display = 'none';
        }
        function setActiveNavItem(navId) {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active', 'requests-active', 'stats-active'));
            document.querySelectorAll('#requests-page .nav-item').forEach(el => el.classList.remove('active', 'requests-active', 'stats-active'));
            if (navId.startsWith('requests-')) {
                document.getElementById(navId).classList.add('requests-active');
            } else {
                document.getElementById(navId).classList.add('active');
            }
        }
        document.getElementById('nav-home').addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            document.querySelector('.container').style.display = 'block';
            setActiveNavItem('nav-timetable');
        });
        document.getElementById('nav-timetable').addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            document.querySelector('.container').style.display = 'block';
            setActiveNavItem('nav-timetable');
        });
        document.getElementById('requests-nav').addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            document.getElementById('requests-page').style.display = 'block';
            setActiveNavItem('requests-nav-current');
            renderRequestsPage();
        });
        // Requests page nav
        document.getElementById('requests-nav-home').addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            document.querySelector('.container').style.display = 'block';
            setActiveNavItem('nav-timetable');
        });
        document.getElementById('requests-nav-timetable').addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            document.querySelector('.container').style.display = 'block';
            setActiveNavItem('nav-timetable');
        });
        document.getElementById('requests-nav-current').addEventListener('click', (e) => {
            e.preventDefault();
            renderRequestsPage();
        });
        document.getElementById('requests-stats-nav').addEventListener('click', (e) => {
            e.preventDefault();
            toggleStatistics();
        });
        document.getElementById('requests-reminders-nav').addEventListener('click', (e) => {
            e.preventDefault();
            toggleReminders();
        });
        document.getElementById('requests-logout-link').addEventListener('click', (e) => {
            document.getElementById('logout-link').click();
        });
        document.getElementById('requests-day-filter-select').addEventListener('change', (e) => {
            document.getElementById('day-filter-select').value = e.target.value;
            handleDayFilter();
        });
        document.getElementById('requests-week-selector').addEventListener('change', (e) => {
            document.getElementById('week-selector').value = e.target.value;
            handleWeekSelector(e);
        });
        document.getElementById('requests-fullscreen-btn').addEventListener('click', toggleFullScreen);
        document.getElementById('requests-dark-mode-toggle').addEventListener('click', toggleDarkMode);
        // ==============================
        // ICONS & DYNAMIC BG
        // ==============================
        const ICONS = {
            default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
            lesson: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12 12h6M12 16h6M12 8h6"/></svg>`,
            break: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
            lunch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18M5 14h.01M12 14h.01M19 14h.01M8 18h8"/></svg>`
        };
        function updateDynamicBackgroundAndShadows() {
            const now = new Date();
            const hour = now.getHours();
            const bg = document.getElementById('dynamic-bg');
            const body = document.body;
            body.classList.remove('time-morning', 'time-afternoon', 'time-evening');
            bg.className = 'dynamic-bg';
            if (hour >= 5 && hour < 12) {
                bg.classList.add('morning-bg');
                body.classList.add('time-morning');
            } else if (hour >= 12 && hour < 18) {
                bg.classList.add('afternoon-bg');
                body.classList.add('time-afternoon');
            } else {
                bg.classList.add('evening-bg');
                body.classList.add('time-evening');
            }
        }
        // ==============================
        // OFFLINE BANNER
        // ==============================
        window.addEventListener('online', () => {
            document.getElementById('offline-banner').style.display = 'none';
        });
        window.addEventListener('offline', () => {
            document.getElementById('offline-banner').style.display = 'block';
        });
        // ==============================
        // TIMETABLE DATA
        // ==============================
        const timetableData = {
            "weekA": {
                "MONDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "12 DT Textile", "room": "T1" }, "Ms N Jenkins": { "subject": "11 Photography", "room": "A1" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "12 / 13 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "9S DT", "room": "T1" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "9M", "room": "A1" }, "Ms N Jenkins": { "subject": "", "room": "" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "", "room": "" }, "Ms N Jenkins": { "subject": "9A", "room": "A1" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "12 DT Textile", "room": "T1" }, "Ms N Jenkins": { "subject": "10 Art", "room": "A1" } } }
                },
                "TUESDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "9S", "room": "A2" }, "Ms N Jenkins": { "subject": "11 Photography", "room": "A1" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "7AC", "room": "A1" }, "Ms N Jenkins": { "subject": "7AC DT", "room": "A2" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "11 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "", "room": "" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "8AC", "room": "A1" }, "Ms N Jenkins": { "subject": "8AC DT", "room": "A2" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "9AC DT", "room": "A1" }, "Ms N Jenkins": { "subject": "", "room": "" } } }
                },
                "WEDNESDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "9HM Food", "room": "HE1" }, "Ms N Jenkins": { "subject": "9C", "room": "A2" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "7AC", "room": "A1" }, "Ms N Jenkins": { "subject": "7AC DT", "room": "A2" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "", "room": "" }, "Ms N Jenkins": { "subject": "11 Photography", "room": "A1" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "7H", "room": "A1" }, "Ms N Jenkins": { "subject": "7H DT", "room": "A2" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "11 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "", "room": "" } } }
                },
                "THURSDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "10 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "9H", "room": "A2" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "10 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "", "room": "" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "11 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "", "room": "" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "", "room": "" }, "Ms N Jenkins": { "subject": "12 / 13 Art", "room": "A1" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "8S", "room": "A1" }, "Ms N Jenkins": { "subject": "8S DT", "room": "A2" } } }
                },
                "FRIDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "7MS", "room": "A1" }, "Ms N Jenkins": { "subject": "7MS DT", "room": "A2" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "8HM", "room": "A1" }, "Ms N Jenkins": { "subject": "8HM DT", "room": "A2" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "8AC", "room": "A1" }, "Ms N Jenkins": { "subject": "8AC DT", "room": "A2" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "7H", "room": "A1" }, "Ms N Jenkins": { "subject": "7H DT", "room": "A2" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "9AC DT", "room": "A1" }, "Ms N Jenkins": { "subject": "12 / 13 Art", "room": "A2" } } }
                }
            },
            "weekB": {
                "MONDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "8S", "room": "A1" }, "Ms N Jenkins": { "subject": "8S DT", "room": "A2" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "9S", "room": "A2" }, "Ms N Jenkins": { "subject": "12 / 13 Art", "room": "A1" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "7MS", "room": "A1" }, "Ms N Jenkins": { "subject": "7MS DT", "room": "A2" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "12 / 13 Art", "room": "A1" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "9S Food", "room": "HE1" }, "Ms N Jenkins": { "subject": "", "room": "" } } }
                },
                "TUESDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "", "room": "A1" }, "Ms N Jenkins": { "subject": "10 Art", "room": "A1" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "PSHE", "room": "A1" }, "Ms N Jenkins": { "subject": "PSHE", "room": "A2" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "", "room": "" }, "Ms N Jenkins": { "subject": "11 Photography", "room": "A1" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "", "room": "" }, "Ms N Jenkins": { "subject": "12 / 13 Art", "room": "A1" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "11 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "", "room": "" } } }
                },
                "WEDNESDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "10 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "", "room": "" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "11 Art", "room": "A1" }, "Ms N Jenkins": { "subject": "9C", "room": "A2" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "8S", "room": "A1" }, "Ms N Jenkins": { "subject": "8S DT", "room": "A2" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "9M", "room": "A1" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "12 / 13 Art", "room": "A1" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "", "room": "" }, "Ms N Jenkins": { "subject": "9A", "room": "A2" } } }
                },
                "THURSDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "9S Food", "room": "HE1" }, "Ms N Jenkins": { "subject": "", "room": "" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "12 / 13 Art", "room": "A2" }, "Ms N Jenkins": { "subject": "11 Photography", "room": "A1" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "9AC DT", "room": "A1" }, "Ms N Jenkins": { "subject": "9H", "room": "A2" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "8HM", "room": "A1" }, "Ms N Jenkins": { "subject": "8HM DT", "room": "A2" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "7MS", "room": "A1" }, "Ms N Jenkins": { "subject": "7MS DT", "room": "A2" } } }
                },
                "FRIDAY": {
                    "Form Time": { "time": "09:00 - 09:30", "teachers": { "Ms K Arakelian": { "subject": "Form Time", "room": "A1" }, "Ms N Jenkins": { "subject": "Form Time", "room": "A2" } } },
                    "1": { "time": "09:30 - 10:20", "teachers": { "Ms K Arakelian": { "subject": "7AC", "room": "A1" }, "Ms N Jenkins": { "subject": "7AC DT", "room": "A2" } } },
                    "2": { "time": "10:20 - 11:30", "teachers": { "Ms K Arakelian": { "subject": "8AC", "room": "A1" }, "Ms N Jenkins": { "subject": "8AC DT", "room": "A2" } } },
                    "3": { "time": "11:30 - 12:30", "teachers": { "Ms K Arakelian": { "subject": "8HM", "room": "A1" }, "Ms N Jenkins": { "subject": "8HM DT", "room": "A2" } } },
                    "4a": { "time": "12:30 - 13:30", "teachers": { "Ms K Arakelian": { "subject": "Lunch", "room": "" }, "Ms N Jenkins": { "subject": "Lunch", "room": "" } } },
                    "4b": { "time": "13:30 - 14:30", "teachers": { "Ms K Arakelian": { "subject": "7H", "room": "A1" }, "Ms N Jenkins": { "subject": "7H DT", "room": "A2" } } },
                    "5": { "time": "14:30 - 15:30", "teachers": { "Ms K Arakelian": { "subject": "9HM Food", "room": "HE1" }, "Ms N Jenkins": { "subject": "9HM DT", "room": "A2" } } }
                }
            }
        };
        let currentMode = 'auto';
        let currentWeek = 'A';
        let currentViewDay = 'all';
        let lessonsFilterMode = 'all';
        let statisticsVisible = false;
        const weekAStartDate = new Date(2025, 8, 1);
        const schoolTerms = [
            { name: "October Half Term", startDate: new Date(2025, 9, 27), endDate: new Date(2025, 9, 31) },
            { name: "Christmas Term", startDate: new Date(2025, 11, 22), endDate: new Date(2026, 0, 2) },
            { name: "February Half Term", startDate: new Date(2026, 1, 16), endDate: new Date(2026, 1, 20) },
            { name: "Easter Term", startDate: new Date(2026, 2, 30), endDate: new Date(2026, 3, 10) },
            { name: "May Half Term", startDate: new Date(2026, 4, 25), endDate: new Date(2026, 4, 29) },
            { name: "Summer Term", startDate: new Date(2026, 6, 20), endDate: new Date(2026, 7, 31) }
        ];
        const nonInclusiveDates = [
            new Date(2025, 8, 1),
            new Date(2025, 8, 2),
            new Date(2025, 8, 25),
            new Date(2025, 9, 9),
            new Date(2025, 10, 21),
            new Date(2025, 11, 19),
            new Date(2026, 0, 5),
            new Date(2026, 2, 19),
            new Date(2026, 4, 4),
            new Date(2026, 5, 26),
            new Date(2026, 6, 3),
            new Date(2026, 6, 16),
            new Date(2026, 6, 17)
        ];
        const nonInclusivePeriods = {
            "2025-09-25": ["4b", "5"],
            "2025-10-09": ["4b", "5"],
            "2026-03-19": ["4b", "5"]
        };
        const schoolYearEnd = new Date(2026, 7, 31);
        const teachers = ['Ms K Arakelian', 'Ms N Jenkins'];
        const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
        const periods = ['Form Time', '1', '2', '3', '4a', '4b', '5'];
        function extractClassNumber(subject) {
            const match = subject.match(/^(\d+)/);
            return match ? parseInt(match[1], 10) : 999;
        }
        function parseTime(timeStr) {
            const match = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (!match) return null;
            return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
        }
        function getCurrentWeekCorrect() {
            const now = new Date();
            let lastTermEnd = new Date(2025, 8, 1);
            for (let term of schoolTerms) {
                if (term.endDate < now) {
                    lastTermEnd = new Date(term.endDate);
                } else {
                    break;
                }
            }
            const nextMonday = new Date(lastTermEnd);
            nextMonday.setDate(lastTermEnd.getDate() + 3);
            const dayOfWeek = nextMonday.getDay();
            if (dayOfWeek !== 1) {
                nextMonday.setDate(nextMonday.getDate() + (1 - dayOfWeek + 7) % 7);
            }
            const diffTime = now.getTime() - nextMonday.getTime();
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            return diffWeeks % 2 === 0 ? 'A' : 'B';
        }
        function getCurrentWeek() {
            if (currentMode === 'auto') return getCurrentWeekCorrect();
            return currentWeek;
        }
        function getSubjectClass(subject) {
            if (!subject || ['Lunch', 'Form Time'].includes(subject)) return '';
            let clean = subject.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/\//g, '-')
                .replace(/[^a-z0-9-]/g, '');
            clean = clean.replace(/-+/g, '-').replace(/^-|-$/g, '');
            return `subject-${clean}`;
        }
        function formatDate(date) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const full = date.toLocaleDateString('en-US', options);
            const parts = full.split(' ');
            const weekday = parts[0].replace(',', '');
            const month = parts[1];
            const day = parts[2]?.replace(',', '') || parts[3]?.replace(',', '');
            const year = parts[parts.length - 1];
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();
            return `<div class="date-weekday">${weekday} <span class="date-day">${day}</span> ${month} ${year}</div>`;
        }
        function isCurrentTime(timeRange) {
            if (!timeRange) return false;
            const now = new Date();
            const [start, end] = timeRange.split(' - ');
            const s = parseTime(start);
            const e = parseTime(end);
            if (!s || !e) return false;
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const startMins = s.hours * 60 + s.minutes;
            const endMins = e.hours * 60 + e.minutes;
            return nowMins >= startMins && nowMins < endMins;
        }
        function getDayDate(day, week) {
            const now = new Date();
            const targetWeekIsA = (week === 'A');
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dayIndex = days.indexOf(day);
            if (dayIndex === -1) return new Date();
            const currentWeekType = getCurrentWeekCorrect();
            const isTodayTargetWeek = (currentWeekType === week);
            if (isTodayTargetWeek) {
                const todayIndex = days.indexOf(today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase());
                const dayDiff = dayIndex - todayIndex;
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + dayDiff);
                return targetDate;
            } else {
                let searchDate = new Date(today);
                let foundDate = null;
                for (let i = 0; i < 14; i++) {
                    const checkDate = new Date(searchDate);
                    checkDate.setDate(searchDate.getDate() + i);
                    const checkWeekType = getWeekTypeForDate(checkDate);
                    const checkDayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                    if (checkWeekType === week && checkDayName === day) {
                        foundDate = checkDate;
                        break;
                    }
                }
                if (foundDate) {
                    return foundDate;
                } else {
                    for (let i = 1; i < 14; i++) {
                        const checkDate = new Date(today);
                        checkDate.setDate(today.getDate() - i);
                        const checkWeekType = getWeekTypeForDate(checkDate);
                        const checkDayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                        if (checkWeekType === week && checkDayName === day) {
                            foundDate = checkDate;
                            break;
                        }
                    }
                }
                return foundDate || new Date();
            }
        }
        function getNextPeriod(currentPeriodIndex, day, week) {
            for (let i = currentPeriodIndex + 1; i < periods.length; i++) {
                const p = periods[i];
                const wd = week === 'A' ? timetableData.weekA : timetableData.weekB;
                if (wd[day] && wd[day][p]) return { period: p, index: i };
            }
            return null;
        }
        function getNextTerm() {
            const now = new Date();
            for (let term of schoolTerms) {
                if (now < term.endDate) return term;
            }
            return null;
        }
        function formatTermDates(term) {
            const start = term.startDate;
            const end = term.endDate;
            const now = new Date();
            let weeksRemaining = 0;
            if (now < start) {
                const diffTime = start - now;
                weeksRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
            } else if (now <= end) {
                const diffTime = end - now;
                weeksRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
            }
            const startDateStr = `${start.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })}`;
            const endDateStr = `${end.getDate()} ${end.toLocaleDateString('en-US', { month: 'short' })} ${start.getFullYear()}`;
            const weeksText = weeksRemaining === 1 ? '1 week' : `${weeksRemaining} weeks`;
            return `${startDateStr} – ${endDateStr} (${weeksText} remaining)`;
        }
        function getCutOffDate(termStartDate) {
            const termMonday = new Date(termStartDate);
            const day = termMonday.getDay();
            const diff = termMonday.getDate() - day + (day === 0 ? -6 : 1);
            const mondayOfTermWeek = new Date(termMonday.setDate(diff));
            const fridayBefore = new Date(mondayOfTermWeek);
            fridayBefore.setDate(mondayOfTermWeek.getDate() - 3);
            return fridayBefore;
        }
        function isNonInclusiveDate(date) {
            const dateStr = date.toDateString();
            return nonInclusiveDates.some(d => d.toDateString() === dateStr);
        }
        function getWeekTypeForDate(date) {
            const searchDate = new Date(date);
            if (isNonInclusiveDate(searchDate)) {
                return null;
            }
            const day = searchDate.getDay();
            const monday = new Date(searchDate);
            monday.setDate(searchDate.getDate() - (day === 0 ? 6 : day - 1));
            for (const term of schoolTerms) {
                const termStart = new Date(term.startDate);
                const termEnd = new Date(term.endDate);
                const termMon = new Date(termStart);
                termMon.setDate(termStart.getDate() - (termStart.getDay() === 0 ? 6 : termStart.getDay() - 1));
                if (monday >= termMon && monday <= termEnd) {
                    return null;
                }
            }
            let refMonday = new Date(weekAStartDate);
            let weekCount = 0;
            while (refMonday <= monday) {
                let skip = false;
                for (const term of schoolTerms) {
                    const termStart = new Date(term.startDate);
                    const termEnd = new Date(term.endDate);
                    const termMon = new Date(termStart);
                    termMon.setDate(termStart.getDate() - (termStart.getDay() === 0 ? 6 : termStart.getDay() - 1));
                    if (refMonday >= termMon && refMonday <= termEnd) {
                        skip = true;
                        break;
                    }
                }
                if (!skip) {
                    if (refMonday < monday) weekCount++;
                }
                const next = new Date(refMonday);
                next.setDate(refMonday.getDate() + 7);
                refMonday = next;
            }
            return weekCount % 2 === 0 ? 'A' : 'B';
        }
        function countLessonsInWeek(weekType) {
            const weekData = timetableData[weekType === 'A' ? 'weekA' : 'weekB'];
            let count = 0;
            for (const day of days) {
                const dayData = weekData[day];
                for (const period in dayData) {
                    const entry = dayData[period];
                    if (!entry || !entry.teachers) continue;
                    for (const teacher of teachers) {
                        const subject = entry.teachers[teacher]?.subject;
                        if (subject && !['Lunch', 'Form Time', ''].includes(subject)) {
                            const dateStr = getDayDate(day, weekType).toISOString().split('T')[0];
                            if (nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period)) {
                                continue;
                            }
                            count++;
                        }
                    }
                }
            }
            return count;
        }
        function countLessonsInMonth(month, year) {
            const now = new Date();
            let count = 0;
            let currentDate = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0).getDate();
            while (currentDate.getDate() <= lastDay) {
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                if (['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].includes(dayName)) {
                    const weekType = getWeekTypeForDate(currentDate);
                    if (weekType) {
                        const weekData = timetableData[weekType === 'A' ? 'weekA' : 'weekB'];
                        const dayData = weekData[dayName];
                        for (const period in dayData) {
                            const entry = dayData[period];
                            if (!entry || !entry.teachers) continue;
                            for (const teacher of teachers) {
                                const subject = entry.teachers[teacher]?.subject;
                                if (subject && !['Lunch', 'Form Time', ''].includes(subject)) {
                                    const dateStr = currentDate.toISOString().split('T')[0];
                                    if (nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period)) {
                                        continue;
                                    }
                                    count++;
                                }
                            }
                        }
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return count;
        }
        function countLessonsUntilYearEnd() {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let count = 0;
            let currentDate = new Date(todayStart);
            while (currentDate <= schoolYearEnd) {
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                if (['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].includes(dayName)) {
                    const weekType = getWeekTypeForDate(currentDate);
                    if (weekType) {
                        const weekData = timetableData[weekType === 'A' ? 'weekA' : 'weekB'];
                        const dayData = weekData[dayName];
                        for (const period in dayData) {
                            const entry = dayData[period];
                            if (!entry || !entry.teachers) continue;
                            for (const teacher of teachers) {
                                const subject = entry.teachers[teacher]?.subject;
                                if (subject && !['Lunch', 'Form Time', ''].includes(subject)) {
                                    const dateStr = currentDate.toISOString().split('T')[0];
                                    if (nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period)) {
                                        continue;
                                    }
                                    count++;
                                }
                            }
                        }
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return count;
        }
        function countLessonsUntilTerm(filterMode = 'all') {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const currentTerm = getNextTerm();
            if (!currentTerm) return { counts: {}, byTeacher: {}, todayLessons: {} };
            let startDate = new Date(todayStart);
            let endDate = new Date(todayStart);
            if (filterMode === 'month') {
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            } else if (filterMode === 'week') {
                const dayOfWeek = todayStart.getDay();
                const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
                endDate = new Date(todayStart);
                endDate.setDate(todayStart.getDate() + daysUntilFriday);
            } else if (filterMode === 'day') {
                endDate = new Date(todayStart);
            } else {
                endDate = getCutOffDate(currentTerm.startDate);
            }
            const subjectCount = {};
            const teacherCounts = { 'Ms K Arakelian': {}, 'Ms N Jenkins': {} };
            const todayLessons = { 'Ms K Arakelian': new Set(), 'Ms N Jenkins': new Set() };
            let currentDate = new Date(startDate);
            const endDateTime = endDate.getTime();
            while (currentDate.getTime() <= endDateTime) {
                const isToday = currentDate.toDateString() === todayStart.toDateString();
                if (isNonInclusiveDate(currentDate)) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    continue;
                }
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                if (!['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(dayName)) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    continue;
                }
                const weekType = getWeekTypeForDate(currentDate);
                if (!weekType) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    continue;
                }
                const dayData = timetableData[weekType === 'A' ? 'weekA' : 'weekB'][dayName];
                if (dayData) {
                    for (const period in dayData) {
                        const entry = dayData[period];
                        if (!entry || !entry.teachers) continue;
                        for (const teacher of teachers) {
                            const subject = entry.teachers[teacher]?.subject;
                            if (!subject || ['Lunch', 'Form Time', ''].includes(subject)) continue;
                            const dateStr = currentDate.toISOString().split('T')[0];
                            if (nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period)) {
                                continue;
                            }
                            let includeLesson = false;
                            if (isToday) {
                                const timeRange = entry.time;
                                if (timeRange) {
                                    const [_, endStr] = timeRange.split(' - ');
                                    const endTime = parseTime(endStr);
                                    if (endTime) {
                                        const nowMins = now.getHours() * 60 + now.getMinutes();
                                        const endMins = endTime.hours * 60 + endTime.minutes;
                                        if (nowMins < endMins) {
                                            includeLesson = true;
                                            todayLessons[teacher].add(subject);
                                        }
                                    }
                                }
                            } else {
                                includeLesson = true;
                            }
                            if (includeLesson) {
                                subjectCount[subject] = (subjectCount[subject] || 0) + 1;
                                teacherCounts[teacher][subject] = (teacherCounts[teacher][subject] || 0) + 1;
                            }
                        }
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return { counts: subjectCount, byTeacher: teacherCounts, todayLessons };
        }
        function countNonInclusiveLessons(filterMode = 'all') {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const currentTerm = getNextTerm();
            if (!currentTerm) return { counts: {}, byTeacher: {} };
            const cutOffDate = getCutOffDate(currentTerm.startDate);
            const thisWeekStart = new Date(todayStart);
            const dayOfWeek = thisWeekStart.getDay();
            thisWeekStart.setDate(todayStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const thisWeekEnd = new Date(thisWeekStart);
            thisWeekEnd.setDate(thisWeekStart.getDate() + 4);
            const subjectCount = {};
            const teacherCounts = { 'Ms K Arakelian': {}, 'Ms N Jenkins': {} };
            let currentDate = new Date(todayStart);
            if (filterMode === 'week') {
                currentDate = new Date(thisWeekStart);
            } else if (filterMode === 'day') {
                currentDate = new Date(todayStart);
            } else if (filterMode === 'month') {
                currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            let endDate = cutOffDate;
            if (filterMode === 'week') {
                endDate = thisWeekEnd;
            } else if (filterMode === 'day') {
                endDate = todayStart;
            } else if (filterMode === 'month') {
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
            while (currentDate <= endDate) {
                if (isNonInclusiveDate(currentDate)) {
                    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                    if (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(dayName)) {
                        const weekType = getWeekTypeForDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
                        if (weekType) {
                            const weekData = weekType === 'A' ? timetableData.weekA : timetableData.weekB;
                            const dayData = weekData[dayName];
                            if (dayData) {
                                for (const period in dayData) {
                                    const entry = dayData[period];
                                    if (!entry || !entry.teachers) continue;
                                    for (const teacher of teachers) {
                                        const subject = entry.teachers[teacher]?.subject;
                                        if (!subject || ['Lunch', 'Form Time', ''].includes(subject)) continue;
                                        const dateStr = currentDate.toISOString().split('T')[0];
                                        if (nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period)) {
                                            continue;
                                        }
                                        subjectCount[subject] = (subjectCount[subject] || 0) + 1;
                                        teacherCounts[teacher][subject] = (teacherCounts[teacher][subject] || 0) + 1;
                                    }
                                }
                            }
                        }
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return { counts: subjectCount, byTeacher: teacherCounts };
        }
        function getTodaysLessons() {
            const now = new Date();
            const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
            const week = getCurrentWeek();
            const wd = week === 'A' ? timetableData.weekA : timetableData.weekB;
            const todayData = wd[today];
            const lessons = { 'Ms K Arakelian': [], 'Ms N Jenkins': [] };
            if (todayData) {
                for (const period in todayData) {
                    const entry = todayData[period];
                    if (entry && entry.teachers) {
                        for (const teacher of teachers) {
                            const lesson = entry.teachers[teacher];
                            if (lesson && lesson.subject && !['Lunch', 'Form Time', ''].includes(lesson.subject)) {
                                const timeRange = entry.time;
                                const [startStr, endStr] = timeRange.split(' - ');
                                const start = parseTime(startStr);
                                const end = parseTime(endStr);
                                if (start && end) {
                                    const nowMins = now.getHours() * 60 + now.getMinutes();
                                    const startMins = start.hours * 60 + start.minutes;
                                    const endMins = end.hours * 60 + end.minutes;
                                    if (nowMins < endMins) {
                                        lessons[teacher].push({
                                            period: period,
                                            subject: lesson.subject,
                                            room: lesson.room,
                                            time: timeRange,
                                            start: startMins
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            for (const teacher in lessons) {
                lessons[teacher].sort((a, b) => a.start - b.start);
            }
            return lessons;
        }
        function populateTodaysLessonsBox() {
            const lessons = getTodaysLessons();
            const contentDiv = document.getElementById('today-lessons-content');
            contentDiv.innerHTML = '';
            for (const teacher in lessons) {
                const teacherLessons = lessons[teacher];
                if (teacherLessons.length === 0) continue;
                const teacherClass = teacher === 'Ms K Arakelian' ? 'today-lesson-arakelian' : 'today-lesson-jenkins';
                const teacherName = teacher === 'Ms K Arakelian' ? 'Arakelian' : 'Jenkins';
                const teacherHeader = document.createElement('div');
                teacherHeader.className = `today-lesson-item ${teacherClass}`;
                teacherHeader.innerHTML = `<span><strong>${teacherName}</strong></span>`;
                contentDiv.appendChild(teacherHeader);
                teacherLessons.forEach(lesson => {
                    const lessonItem = document.createElement('div');
                    lessonItem.className = `today-lesson-item ${teacherClass}`;
                    lessonItem.innerHTML = `<span class="today-lesson-subject">${lesson.subject}</span><span class="today-lesson-room">${lesson.room}</span>`;
                    contentDiv.appendChild(lessonItem);
                });
            }
            if (contentDiv.innerHTML === '') {
                contentDiv.innerHTML = '<div class="today-lesson-item">No lessons scheduled</div>';
            }
        }
        // 📌 BOX: My Reminders – FUNZIONI
        function loadReminders() {
            const reminders = [];
            for (let key in localStorage) {
                if (key.startsWith('reminder_')) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if (item) reminders.push(item);
                    } catch (e) {
                        console.warn("Invalid reminder in localStorage:", key);
                    }
                }
            }
            reminders.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
            return reminders;
        }
        function renderReminders() {
            const list = document.getElementById('reminders-list');
            const reminders = loadReminders();
            if (reminders.length === 0) {
                list.innerHTML = '<div class="no-reminders">No reminders saved yet.</div>';
                return;
            }
            list.innerHTML = '';
            reminders.forEach(rem => {
                const el = document.createElement('div');
                el.className = 'reminder-item';
                const dayName = new Date(rem.addedAt).toLocaleDateString('en-US', { weekday: 'short' });
                el.innerHTML = `
                    <div class="reminder-meta">
                        <span>${rem.subject}</span>
                        <span>${rem.period}</span>
                    </div>
                    <div class="reminder-details">
                        ${rem.teacher} • ${rem.time} • ${rem.room || '—'} • ${dayName}
                    </div>
                `;
                list.appendChild(el);
            });
        }
        function clearAllReminders() {
            for (let key in localStorage) {
                if (key.startsWith('reminder_')) {
                    localStorage.removeItem(key);
                }
            }
            renderReminders();
            if (document.getElementById('reminders-box').style.display === 'block') {
                toggleReminders();
            }
        }
        function exportRemindersToCSV() {
            const reminders = loadReminders();
            if (reminders.length === 0) {
                alert("No reminders to export.");
                return;
            }
            let csv = "Teacher,Subject,Period,Time,Room,Day,Week,AddedAt\n";
            reminders.forEach(r => {
                const row = [
                    `"${r.teacher}"`,
                    `"${r.subject}"`,
                    `"${r.period}"`,
                    `"${r.time}"`,
                    `"${r.room || ''}"`,
                    `"${r.day}"`,
                    `"${r.week}"`,
                    `"${new Date(r.addedAt).toISOString()}"`
                ].join(",");
                csv += row + "\n";
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stm-reminders-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        function toggleReminders() {
            const box = document.getElementById('reminders-box');
            const isVisible = box.style.display === 'block';
            if (isVisible) {
                box.style.display = 'none';
                document.getElementById('reminders-nav').classList.remove('stats-active');
                document.getElementById('requests-reminders-nav').classList.remove('stats-active');
            } else {
                box.style.display = 'block';
                document.getElementById('reminders-nav').classList.add('stats-active');
                document.getElementById('requests-reminders-nav').classList.add('stats-active');
                renderReminders();
            }
        }
        // 📌 BOX: Modal – FUNZIONI
        function countRemainingLessons(subject) {
            const { counts } = countLessonsUntilTerm('all');
            return counts[subject] || 0;
        }
        function closeLessonModal() {
            document.getElementById('lesson-modal').style.display = 'none';
            document.body.style.overflow = '';
        }
        function addToReminders() {
            if (!currentModalData) return;
            if (!currentUser) {
                alert("Please log in to add reminders.");
                return;
            }
            const key = `reminder_${new Date().toISOString().split('T')[0]}_${currentModalData.teacher}_${currentModalData.subject}_${currentModalData.period}`;
            const reminder = {
                teacher: currentModalData.teacher,
                subject: currentModalData.subject,
                period: currentModalData.period,
                time: currentModalData.time,
                room: currentModalData.room,
                day: currentModalData.day,
                week: currentModalData.week,
                addedAt: new Date().toISOString()
            };
            try {
                localStorage.setItem(key, JSON.stringify(reminder));
                document.getElementById('reminder-added').style.display = 'block';
                setTimeout(() => {
                    document.getElementById('reminder-added').style.display = 'none';
                }, 2000);
                if (document.getElementById('reminders-box').style.display === 'block') {
                    renderReminders();
                }
            } catch (e) {
                console.warn("Could not save reminder to localStorage", e);
            }
        }
        // ✅ CORREZIONE FONDAMENTALE: Aggiungiamo `data-cell` in generateTimetable
        function generateTimetable() {
            const week = getCurrentWeek();
            const wd = week === 'A' ? timetableData.weekA : timetableData.weekB;
            const table = document.getElementById('timetable');
            let visibleDays = days;
            if (currentViewDay !== 'all') {
                visibleDays = [currentViewDay];
            } else if (statisticsVisible) {
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                visibleDays = [today];
            }
            const today = new Date().toDateString();
            let html = '<thead><tr><th class="period-cell">Period</th><th class="time-cell">Time</th>';
            visibleDays.forEach(day => {
                const d = getDayDate(day, week);
                const formattedDate = `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getFullYear()}`;
                const dayDate = new Date(d).toDateString();
                const dayName = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
                let dayHeader = dayName;
                if (dayDate === today) {
                    dayHeader += ` <span class="today-badge-inline">Today</span>`;
                }
                html += `<th colspan="2">${dayHeader}<br><small>${formattedDate}</small></th>`;
            });
            html += '</tr><tr><th class="period-cell"></th><th class="time-cell"></th>';
            visibleDays.forEach(() => {
                html += '<th>Ms K. Arakelian</th><th>Ms N. Jenkins</th>';
            });
            html += '</tr></thead><tbody>';
            periods.forEach((period, idx) => {
                const time = wd[days[0]]?.[period]?.time || '';
                html += `<tr><td class="period-cell">${period}</td>`;
                html += `<td class="time-cell">${time}</td>`;
                visibleDays.forEach(day => {
                    const dayDate = getDayDate(day, week).toDateString();
                    const isToday = (dayDate === today);
                    const isNonIncl = isNonInclusiveDate(getDayDate(day, week));
                    const dateStr = getDayDate(day, week).toISOString().split('T')[0];
                    const isPeriodExcluded = nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period);
                    teachers.forEach(teacher => {
                        const data = wd[day]?.[period]?.teachers?.[teacher];
                        let cls = 'subject-cell';
                        let content = '';
                        if (data?.subject && !isPeriodExcluded) {
                            if (data.subject === 'Form Time') {
                                cls += ' form-time';
                                content = 'Form Time';
                            } else if (data.subject === 'Lunch') {
                                cls += ' lunch';
                                content = 'Lunch';
                            } else {
                                cls += ` ${getSubjectClass(data.subject)}`;
                                content = `<div class="subject-name">${data.subject}</div>${data.room ? `<div class="room-name">${data.room}</div>` : ''}`;
                            }
                        } else {
                            if (isToday && time && period !== 'Form Time' && period !== 'Lunch' && !isNonIncl && !isPeriodExcluded) {
                                const [startStr, endStr] = time.split(' - ');
                                const start = parseTime(startStr);
                                const end = parseTime(endStr);
                                if (start && end) {
                                    const now = new Date();
                                    const nowMins = now.getHours() * 60 + now.getMinutes();
                                    const startMins = start.hours * 60 + start.minutes;
                                    const endMins = end.hours * 60 + end.minutes;
                                    if (nowMins < endMins) {
                                        content = `<div class="room-free-badge">Room Free</div>`;
                                    }
                                }
                            }
                        }
                        // ✅ CORREZIONE: aggiungiamo data-cell con info strutturate
                        const cellData = JSON.stringify({
                            subject: data?.subject || '',
                            room: data?.room || '',
                            teacher,
                            time,
                            period,
                            day,
                            week
                        });
                        html += `<td class="${cls}" data-cell='${cellData}' data-teacher="${teacher === 'Ms K Arakelian' ? 'arakelian' : 'jenkins'}">${content}`;
                        // 🟢 AGGIUNGI INDICATORE RICHIESTA
                        const requestKey = `request_${teacher}_${data?.subject}_${period}_${day}_${week}`;
                        if (data?.subject && !['Form Time', 'Lunch', ''].includes(data.subject) && localStorage.getItem(requestKey)) {
                            html += `<div class="request-indicator"></div>`;
                        }
                        html += `</td>`;
                    });
                });
                html += '</tr>';
            });
            table.innerHTML = html;
            // ✅ Aggiungiamo listener dopo la generazione
            document.querySelectorAll('.subject-cell').forEach(cell => {
                if (cell.dataset.cell) {
                    cell.addEventListener('click', () => {
                        const data = JSON.parse(cell.dataset.cell);
                        if (data.subject && !['Form Time', 'Lunch', ''].includes(data.subject)) {
                            openLessonModal(data);
                        }
                    });
                }
            });
        }
        // Event listeners
        document.getElementById('close-btn').addEventListener('click', closeLessonModal);
        document.querySelector('.close-modal').addEventListener('click', closeLessonModal);
        document.getElementById('add-reminder-btn').addEventListener('click', addToReminders);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('lesson-modal').style.display === 'flex') {
                closeLessonModal();
            }
        });
        document.getElementById('reminders-nav').addEventListener('click', function(e) {
            e.preventDefault();
            toggleReminders();
        });
        document.getElementById('clear-reminders-btn').addEventListener('click', clearAllReminders);
        document.getElementById('export-reminders-btn').addEventListener('click', exportRemindersToCSV);
        document.getElementById('export-requests-csv').addEventListener('click', exportRequestsToCSV);
        // ... (RESTO DEL TUO SCRIPT: renderLessonsCountTable, updateClockPrecise, ecc.) ...
        function renderLessonsCountTable() {
            const { counts, byTeacher, todayLessons } = countLessonsUntilTerm(lessonsFilterMode);
            const { counts: nonInclCounts, byTeacher: nonInclByTeacher } = countNonInclusiveLessons(lessonsFilterMode);
            const sortedSubjects = Object.keys(counts).sort((a, b) => {
                const aNum = extractClassNumber(a);
                const bNum = extractClassNumber(b);
                if (aNum !== bNum) return aNum - bNum;
                return a.localeCompare(b);
            });
            const tbody = document.getElementById('lessons-count-tbody');
            tbody.innerHTML = '';
            for (const subject of sortedSubjects) {
                const aCount = byTeacher['Ms K Arakelian'][subject] || 0;
                const jCount = byTeacher['Ms N Jenkins'][subject] || 0;
                const total = aCount + jCount;
                const aNonInclCount = nonInclByTeacher['Ms K Arakelian'][subject] || 0;
                const jNonInclCount = nonInclByTeacher['Ms N Jenkins'][subject] || 0;
                const totalNonIncl = aNonInclCount + jNonInclCount;
                const className = total <= 2 ? 'low-count' : '';
                const isArakelianToday = todayLessons['Ms K Arakelian'].has(subject);
                const isJenkinsToday = todayLessons['Ms N Jenkins'].has(subject);
                let arakelianDisplay = aCount;
                if (aNonInclCount > 0) {
                    arakelianDisplay += ` <span style="color: #007bff; font-size: 0.9em;">[${aNonInclCount}]</span>`;
                }
                let jenkinsDisplay = jCount;
                if (jNonInclCount > 0) {
                    jenkinsDisplay += ` <span style="color: #007bff; font-size: 0.9em;">[${jNonInclCount}]</span>`;
                }
                let totalDisplay = total;
                if (totalNonIncl > 0) {
                    totalDisplay += ` <span style="color: #007bff; font-size: 0.9em;">[${totalNonIncl}]</span>`;
                }
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="${className}">${subject}</td>
                    <td class="${aCount <= 2 ? 'low-count' : ''} ${isArakelianToday ? 'today-arakelian' : ''}">${arakelianDisplay}</td>
                    <td class="${jCount <= 2 ? 'low-count' : ''} ${isJenkinsToday ? 'today-jenkins' : ''}">${jenkinsDisplay}</td>
                    <td class="${total <= 2 ? 'low-count' : ''}">${totalDisplay}</td>
                `;
                tbody.appendChild(tr);
            }
            let totalA = 0, totalJ = 0, grandTotal = 0;
            let totalA_NonIncl = 0, totalJ_NonIncl = 0, grandTotal_NonIncl = 0;
            for (const subject in byTeacher['Ms K Arakelian']) {
                totalA += byTeacher['Ms K Arakelian'][subject];
            }
            for (const subject in byTeacher['Ms N Jenkins']) {
                totalJ += byTeacher['Ms N Jenkins'][subject];
            }
            grandTotal = totalA + totalJ;
            for (const subject in nonInclByTeacher['Ms K Arakelian']) {
                totalA_NonIncl += nonInclByTeacher['Ms K Arakelian'][subject];
            }
            for (const subject in nonInclByTeacher['Ms N Jenkins']) {
                totalJ_NonIncl += nonInclByTeacher['Ms N Jenkins'][subject];
            }
            grandTotal_NonIncl = totalA_NonIncl + totalJ_NonIncl;
            let arakelianTotalDisplay = totalA;
            if (totalA_NonIncl > 0) {
                arakelianTotalDisplay += ` <span style="color: #007bff; font-size: 0.9em;">[${totalA_NonIncl}]</span>`;
            }
            let jenkinsTotalDisplay = totalJ;
            if (totalJ_NonIncl > 0) {
                jenkinsTotalDisplay += ` <span style="color: #007bff; font-size: 0.9em;">[${totalJ_NonIncl}]</span>`;
            }
            let grandTotalDisplay = grandTotal;
            if (grandTotal_NonIncl > 0) {
                grandTotalDisplay += ` <span style="color: #007bff; font-size: 0.9em;">[${grandTotal_NonIncl}]</span>`;
            }
            document.getElementById('arakelian-total').innerHTML = arakelianTotalDisplay;
            document.getElementById('jenkins-total').innerHTML = jenkinsTotalDisplay;
            document.getElementById('lessons-total-count').innerHTML = grandTotalDisplay;
            const nextTerm = getNextTerm();
            const termDate = nextTerm?.startDate
                ? nextTerm.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                : '—';
            document.getElementById('term-end-date').textContent = termDate;
        }
        function updateClockPrecise() {
            const now = new Date();
            document.getElementById('hours').textContent = now.getHours().toString().padStart(2, '0');
            document.getElementById('minutes').textContent = now.getMinutes().toString().padStart(2, '0');
            document.getElementById('seconds').textContent = now.getSeconds().toString().padStart(2, '0');
            document.getElementById('date-info').innerHTML = formatDate(now);
            document.getElementById('requests-hours').textContent = now.getHours().toString().padStart(2, '0');
            document.getElementById('requests-minutes').textContent = now.getMinutes().toString().padStart(2, '0');
            document.getElementById('requests-seconds').textContent = now.getSeconds().toString().padStart(2, '0');
            document.getElementById('requests-date-info').innerHTML = formatDate(now);
            const w = getCurrentWeek();
            document.getElementById('week-info').textContent = `Current Week: ${w}`;
            document.getElementById('requests-week-info').textContent = `Current Week: ${w}`;
        }
        function updateCountdownPrecise() {
            const now = new Date();
            const nextTerm = getNextTerm();
            if (nextTerm) {
                const diff = nextTerm.startDate.getTime() - now.getTime();
                if (diff > 0) {
                    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const secs = Math.floor((diff % (1000 * 60)) / 1000);
                    document.getElementById('countdown-title').textContent = nextTerm.name;
                    document.getElementById('countdown-days').textContent = totalDays.toString().padStart(3, '0');
                    document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
                    document.getElementById('countdown-minutes').textContent = mins.toString().padStart(2, '0');
                    document.getElementById('countdown-seconds').textContent = secs.toString().padStart(2, '0');
                    document.getElementById('term-info-box').textContent = formatTermDates(nextTerm);
                    document.getElementById('requests-countdown-title').textContent = nextTerm.name;
                    document.getElementById('requests-countdown-days').textContent = totalDays.toString().padStart(3, '0');
                    document.getElementById('requests-countdown-hours').textContent = hours.toString().padStart(2, '0');
                    document.getElementById('requests-countdown-minutes').textContent = mins.toString().padStart(2, '0');
                    document.getElementById('requests-countdown-seconds').textContent = secs.toString().padStart(2, '0');
                    document.getElementById('requests-term-info-box').textContent = formatTermDates(nextTerm);
                } else {
                    // term ended
                    document.getElementById('countdown-title').textContent = nextTerm.name;
                    document.getElementById('countdown-days').textContent = "000";
                    document.getElementById('countdown-hours').textContent = "00";
                    document.getElementById('countdown-minutes').textContent = "00";
                    document.getElementById('countdown-seconds').textContent = "00";
                    document.getElementById('term-info-box').textContent = formatTermDates(nextTerm);
                    document.getElementById('requests-countdown-title').textContent = nextTerm.name;
                    document.getElementById('requests-countdown-days').textContent = "000";
                    document.getElementById('requests-countdown-hours').textContent = "00";
                    document.getElementById('requests-countdown-minutes').textContent = "00";
                    document.getElementById('requests-countdown-seconds').textContent = "00";
                    document.getElementById('requests-term-info-box').textContent = formatTermDates(nextTerm);
                }
            } else {
                document.getElementById('countdown-title').textContent = "No More Terms";
                document.getElementById('countdown-days').textContent = "000";
                document.getElementById('countdown-hours').textContent = "00";
                document.getElementById('countdown-minutes').textContent = "00";
                document.getElementById('countdown-seconds').textContent = "00";
                document.getElementById('term-info-box').textContent = "Academic year completed";
                document.getElementById('requests-countdown-title').textContent = "No More Terms";
                document.getElementById('requests-countdown-days').textContent = "000";
                document.getElementById('requests-countdown-hours').textContent = "00";
                document.getElementById('requests-countdown-minutes').textContent = "00";
                document.getElementById('requests-countdown-seconds').textContent = "00";
                document.getElementById('requests-term-info-box').textContent = "Academic year completed";
            }
        }
        function updateNowContextBar() {
            const now = new Date();
            const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
            const isTodayVisible = (currentViewDay === 'all') || (currentViewDay === today) || statisticsVisible;
            const currentDayData = (getCurrentWeek() === 'A' ? timetableData.weekA : timetableData.weekB)[today];
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const nowContextBar = document.getElementById('now-context-bar');
            nowContextBar.className = 'now-context-bar';
            document.querySelectorAll('.now-badge').forEach(el => el.remove());
            document.querySelectorAll('.subject-cell.now-lesson, .subject-cell.now-break').forEach(el => {
                el.classList.remove('now-lesson', 'now-break');
            });
            let summaryText = "No scheduled activity";
            let summaryNextText = "";
            let iconType = 'default';
            let inPeriod = false;
            let isBreakOrLunch = false;
            let nextLessonTime = null;
            let nextLessonStartTime = null;
            if (isTodayVisible && currentDayData) {
                const visibleDays = currentViewDay === 'all' ? days : [currentViewDay];
                const todayIndexInVisible = visibleDays.indexOf(today);
                if (todayIndexInVisible === -1 && !statisticsVisible) {
                    summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • Today not visible`;
                } else {
                    if (isNonInclusiveDate(now)) {
                        summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • Non-inclusive date`;
                        document.getElementById('now-summary-content').innerHTML = summaryText;
                        document.getElementById('now-summary-icon').innerHTML = ICONS['default'] || ICONS.default;
                        document.getElementById('now-summary-next').innerHTML = "";
                        return;
                    }
                    let todayColumnOffset = 2;
                    if (!statisticsVisible && todayIndexInVisible !== -1) {
                        todayColumnOffset = 2 + (todayIndexInVisible * 2);
                    }
                    for (let i = 0; i < periods.length; i++) {
                        const period = periods[i];
                        const timeRange = currentDayData[period]?.time;
                        if (!timeRange) continue;
                        const [startStr, endStr] = timeRange.split(' - ');
                        const start = parseTime(startStr);
                        const end = parseTime(endStr);
                        if (!start || !end) continue;
                        const startMinutes = start.hours * 60 + start.minutes;
                        const endMinutes = end.hours * 60 + end.minutes;
                        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                            const row = document.querySelectorAll('#timetable tbody tr')[i];
                            if (row) {
                                const cells = row.querySelectorAll('td');
                                for (let j = todayColumnOffset; j < todayColumnOffset + 2; j++) {
                                    if (cells[j]) {
                                        const cellData = JSON.parse(cells[j].dataset.cell || '{}');
                                        const subject = cellData.subject || '';
                                        const teacher = cellData.teacher || '';
                                        const dateStr = now.toISOString().split('T')[0];
                                        const isPeriodExcluded = nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period);
                                        if (isPeriodExcluded) {
                                            cells[j].classList.remove('now-lesson', 'arakelian', 'jenkins', 'now-break');
                                            const existingBadge = cells[j].querySelector('.now-badge');
                                            if (existingBadge) existingBadge.remove();
                                            continue;
                                        }
                                        let teacherClass = '';
                                        if (teacher === 'Ms K Arakelian') teacherClass = 'arakelian';
                                        else if (teacher === 'Ms N Jenkins') teacherClass = 'jenkins';
                                        let showNowBadge = true;
                                        if (period === '2' && timeRange === '10:20 - 11:30') {
                                            if (currentMinutes >= (10 * 60 + 20) && currentMinutes < (10 * 60 + 40)) {
                                                if (/^(7|8)/.test(subject)) {
                                                    showNowBadge = false;
                                                }
                                            }
                                        }
                                        if (subject === 'Lunch' || subject === 'Form Time') {
                                            cells[j].classList.add('now-break');
                                        } else {
                                            cells[j].classList.add('now-lesson', teacherClass);
                                            if (subject && !['Lunch', 'Form Time', ''].includes(subject) && showNowBadge) {
                                                const badge = document.createElement('div');
                                                badge.className = `now-badge ${teacherClass}`;
                                                badge.textContent = 'Now';
                                                cells[j].appendChild(badge);
                                            }
                                        }
                                    }
                                }
                            }
                            const periodLabel = period === 'Form Time' ? 'Form Time' : `Period ${period}`;
                            let teacherDetails = [];
                            const currentPeriodData = currentDayData[period];
                            if (currentPeriodData && currentPeriodData.teachers) {
                                for (const teacher of teachers) {
                                    const lesson = currentPeriodData.teachers[teacher];
                                    if (lesson && lesson.subject && !['Lunch', ''].includes(lesson.subject)) {
                                        const displaySubject = lesson.subject === 'Form Time' ? 'Form Time' : lesson.subject;
                                        const room = lesson.room ? `(${lesson.room})` : '';
                                        const teacherColor = teacher === 'Ms K Arakelian' ? 'var(--teacher-arakelian-color)' : 'var(--teacher-jenkins-color)';
                                        teacherDetails.push(`<span style="color:${teacherColor};font-weight:bold;">${teacher}</span>: ${displaySubject} ${room}`);
                                    }
                                }
                            }
                            let liveIndicator = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div>`;
                            if (teacherDetails.length > 0) {
                                summaryText = `${liveIndicator} • <span class="now-summary-highlight">${periodLabel}</span> • ${timeRange} • ${teacherDetails.join(' | ')}`;
                            } else {
                                summaryText = `${liveIndicator} • <span class="now-summary-highlight">${periodLabel}</span> • ${timeRange}`;
                            }
                            iconType = 'lesson';
                            nowContextBar.classList.add('lesson');
                            if (teacherDetails.some(t => t.includes('Arakelian'))) nowContextBar.classList.add('arakelian');
                            if (teacherDetails.some(t => t.includes('Jenkins'))) nowContextBar.classList.add('jenkins');
                            inPeriod = true;
                            const nextPeriodInfo = getNextPeriod(i, today, getCurrentWeek());
                            if (nextPeriodInfo) {
                                const nextPeriodData = currentDayData[nextPeriodInfo.period];
                                if (nextPeriodData && nextPeriodData.teachers) {
                                    let nextTeacherDetails = [];
                                    for (const teacher of teachers) {
                                        const nextLesson = nextPeriodData.teachers[teacher];
                                        if (nextLesson && nextLesson.subject && !['Lunch', 'Form Time', ''].includes(nextLesson.subject)) {
                                            const displaySubject = nextLesson.subject;
                                            const room = nextLesson.room ? `(${nextLesson.room})` : '';
                                            const teacherColor = teacher === 'Ms K Arakelian' ? 'var(--teacher-arakelian-color)' : 'var(--teacher-jenkins-color)';
                                            nextTeacherDetails.push(`<span style="color:${teacherColor};font-weight:bold;">${teacher}</span>: ${displaySubject} ${room}`);
                                        }
                                    }
                                    if (nextTeacherDetails.length > 0) {
                                        summaryNextText = `<span class="now-summary-highlight">Next:</span> Period ${nextPeriodInfo.period} ${nextPeriodData.time} • ${nextTeacherDetails.join(' | ')}`;
                                    }
                                }
                            }
                            break;
                        }
                    }
                    if (!inPeriod) {
                        for (let i = 0; i < periods.length; i++) {
                            const period = periods[i];
                            const timeRange = currentDayData[period]?.time;
                            if (!timeRange) continue;
                            const start = parseTime(timeRange.split(' - ')[0]);
                            if (start) {
                                const startMins = start.hours * 60 + start.minutes;
                                if (currentMinutes < startMins) {
                                    const diffMins = startMins - currentMinutes;
                                    const h = Math.floor(diffMins / 60);
                                    const m = diffMins % 60;
                                    nextLessonTime = `${h > 0 ? h + 'h ' : ''}${m}m`;
                                    nextLessonStartTime = timeRange.split(' - ')[0];
                                    let nextTeacherDetails = [];
                                    const nextPeriodData = currentDayData[period];
                                    if (nextPeriodData && nextPeriodData.teachers) {
                                        for (const teacher of teachers) {
                                            const nextLesson = nextPeriodData.teachers[teacher];
                                            if (nextLesson && nextLesson.subject && !['Lunch', 'Form Time', ''].includes(nextLesson.subject)) {
                                                const displaySubject = nextLesson.subject;
                                                const room = nextLesson.room ? `(${nextLesson.room})` : '';
                                                const teacherColor = teacher === 'Ms K Arakelian' ? 'var(--teacher-arakelian-color)' : 'var(--teacher-jenkins-color)';
                                                nextTeacherDetails.push(`<span style="color:${teacherColor};font-weight:bold;">${teacher}</span>: ${displaySubject} ${room}`);
                                            }
                                        }
                                    }
                                    if (nextTeacherDetails.length > 0) {
                                        summaryNextText = `<span class="now-summary-highlight">Next:</span> Period ${period} ${timeRange} • ${nextTeacherDetails.join(' | ')}`;
                                    }
                                    break;
                                }
                            }
                        }
                        const break1Start = 10 * 60 + 20;
                        const break1End = 10 * 60 + 40;
                        const break2Start = 11 * 60 + 10;
                        const break2End = 11 * 60 + 30;
                        const lunch1Start = 12 * 60 + 30;
                        const lunch1End = 13 * 60 + 30;
                        const lunch2Start = 13 * 60 + 30;
                        const lunch2End = 14 * 60 + 30;
                        const dateStr = now.toISOString().split('T')[0];
                        if (currentMinutes >= break1Start && currentMinutes < break1End) {
                            const isPeriodExcluded = nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes('2');
                            if (isPeriodExcluded) {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • Non-inclusive date (period-specific exclusion)`;
                                iconType = 'default';
                                nowContextBar.classList.remove('break', 'lesson', 'lunch', 'arakelian', 'jenkins');
                                summaryNextText = "";
                            } else {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • <span class="now-summary-warning">Break time</span> – Years 7–8`;
                                iconType = 'break';
                                nowContextBar.classList.add('break');
                                isBreakOrLunch = true;
                            }
                        } else if (currentMinutes >= break2Start && currentMinutes < break2End) {
                            const isPeriodExcluded = nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes('3');
                            if (isPeriodExcluded) {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • Non-inclusive date (period-specific exclusion)`;
                                iconType = 'default';
                                nowContextBar.classList.remove('break', 'lesson', 'lunch', 'arakelian', 'jenkins');
                                summaryNextText = "";
                            } else {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • <span class="now-summary-warning">Break time</span> – Years 9–13`;
                                iconType = 'break';
                                nowContextBar.classList.add('break');
                                isBreakOrLunch = true;
                            }
                        } else if (currentMinutes >= lunch1Start && currentMinutes < lunch1End) {
                            const isPeriodExcluded = nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes('4a');
                            if (isPeriodExcluded) {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • Non-inclusive date (period-specific exclusion)`;
                                iconType = 'default';
                                nowContextBar.classList.remove('break', 'lesson', 'lunch', 'arakelian', 'jenkins');
                                summaryNextText = "";
                            } else {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • <span class="now-summary-warning">Lunch</span> – Years 7–8`;
                                iconType = 'lunch';
                                nowContextBar.classList.add('lunch');
                                isBreakOrLunch = true;
                            }
                        } else if (currentMinutes >= lunch2Start && currentMinutes < lunch2End) {
                            const isPeriodExcluded = nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes('4b');
                            if (isPeriodExcluded) {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • Non-inclusive date (period-specific exclusion)`;
                                iconType = 'default';
                                nowContextBar.classList.remove('break', 'lesson', 'lunch', 'arakelian', 'jenkins');
                                summaryNextText = "";
                            } else {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • <span class="now-summary-warning">Lunch</span> – Years 9–13`;
                                iconType = 'lunch';
                                nowContextBar.classList.add('lunch');
                                isBreakOrLunch = true;
                            }
                        } else {
                            if (nextLessonTime && nextLessonStartTime) {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • Next lesson in <span class="now-summary-highlight">${nextLessonTime}</span> at ${nextLessonStartTime}`;
                            } else {
                                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • No more lessons today`;
                            }
                        }
                        if (isBreakOrLunch) {
                            const todayColumnOffset = 2 + (visibleDays.indexOf(today) * 2);
                            document.querySelectorAll('#timetable tbody tr').forEach((row, i) => {
                                const period = periods[i];
                                const dateStr = now.toISOString().split('T')[0];
                                const isPeriodExcluded = nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period);
                                if (isPeriodExcluded) return;
                                const cells = row.querySelectorAll('td');
                                for (let j = todayColumnOffset; j < todayColumnOffset + 2; j++) {
                                    if (cells[j]) {
                                        cells[j].classList.add('now-break');
                                    }
                                }
                            });
                        }
                    }
                }
            } else {
                summaryText = `<div class="live-indicator"><div class="live-dot"></div><span>LIVE</span></div> • Today not visible`;
            }
            document.getElementById('now-summary-content').innerHTML = summaryText;
            document.getElementById('now-summary-next').innerHTML = summaryNextText;
            document.getElementById('now-summary-icon').innerHTML = ICONS[iconType] || ICONS.default;
            const progressBarContainer = document.getElementById('progress-bar-container');
            const progressFill = document.getElementById('progress-fill');
            const progressLabel = document.getElementById('progress-label');
            const progressOverlayText = document.getElementById('progress-overlay-text');
            if (isTodayVisible && inPeriod && currentDayData) {
                const currentPeriod = periods.find(p => {
                    const tr = currentDayData[p]?.time;
                    if (!tr) return false;
                    const [s, e] = tr.split(' - ');
                    const st = parseTime(s);
                    const en = parseTime(e);
                    if (!st || !en) return false;
                    return currentMinutes >= st.hours * 60 + st.minutes && currentMinutes < en.hours * 60 + en.minutes;
                });
                if (currentPeriod) {
                    const dateStr = now.toISOString().split('T')[0];
                    const isPeriodExcluded = nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(currentPeriod);
                    if (isPeriodExcluded) {
                        progressBarContainer.style.display = 'none';
                        return;
                    }
                    const timeRange = currentDayData[currentPeriod].time;
                    const [startStr, endStr] = timeRange.split(' - ');
                    const start = parseTime(startStr);
                    const end = parseTime(endStr);
                    if (start && end) {
                        const startMins = start.hours * 60 + start.minutes;
                        const endMins = end.hours * 60 + end.minutes;
                        const totalTime = endMins - startMins;
                        const timeLeft = endMins - currentMinutes;
                        const percent = totalTime > 0 ? 100 - (timeLeft / totalTime) * 100 : 0;
                        const minsLeft = Math.floor(timeLeft / 60);
                        const secsLeft = timeLeft % 60;
                        progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
                        progressLabel.textContent = `${minsLeft}:${secsLeft.toString().padStart(2, '0')} left`;
                        progressOverlayText.textContent = `${minsLeft}:${secsLeft.toString().padStart(2, '0')}`;
                        progressFill.classList.remove('warning', 'critical', 'blink');
                        if (timeLeft < 5 * 60) {
                            progressFill.classList.add('warning');
                        }
                        if (timeLeft < 2 * 60) {
                            progressFill.classList.add('critical');
                        }
                        if (timeLeft < 30) {
                            progressFill.classList.add('blink');
                        }
                        progressBarContainer.style.display = 'flex';
                        return;
                    }
                }
            }
            progressBarContainer.style.display = 'none';
        }
        function toggleFullScreen() {
            const btn = document.getElementById('fullscreen-btn');
            const reqBtn = document.getElementById('requests-fullscreen-btn');
            if (!document.fullscreenElement && !document.mozFullScreenElement &&
                !document.webkitFullscreenElement && !document.msFullscreenElement) {
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    elem.requestFullscreen();
                } else if (elem.msRequestFullscreen) {
                    elem.msRequestFullscreen();
                } else if (elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                } else if (elem.webkitRequestFullscreen) {
                    elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                }
                btn.classList.add('active');
                reqBtn.classList.add('active');
                btn.innerHTML = '<span>⛶</span><span>Exit Full Screen</span>';
                reqBtn.innerHTML = '<span>⛶</span><span>Exit Full Screen</span>';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                btn.classList.remove('active');
                reqBtn.classList.remove('active');
                btn.innerHTML = '<span>⛶</span><span>Full Screen</span>';
                reqBtn.innerHTML = '<span>⛶</span><span>Full Screen</span>';
            }
        }
        document.addEventListener('fullscreenchange', updateFullScreenButton);
        document.addEventListener('webkitfullscreenchange', updateFullScreenButton);
        document.addEventListener('mozfullscreenchange', updateFullScreenButton);
        document.addEventListener('MSFullscreenChange', updateFullScreenButton);
        function updateFullScreenButton() {
            const btn = document.getElementById('fullscreen-btn');
            const reqBtn = document.getElementById('requests-fullscreen-btn');
            if (document.fullscreenElement || document.mozFullScreenElement ||
                document.webkitFullscreenElement || document.msFullscreenElement) {
                btn.classList.add('active');
                reqBtn.classList.add('active');
                btn.innerHTML = '<span>⛶</span><span>Exit Full Screen</span>';
                reqBtn.innerHTML = '<span>⛶</span><span>Exit Full Screen</span>';
            } else {
                btn.classList.remove('active');
                reqBtn.classList.remove('active');
                btn.innerHTML = '<span>⛶</span><span>Full Screen</span>';
                reqBtn.innerHTML = '<span>⛶</span><span>Full Screen</span>';
            }
        }
        function updateWeekSelector() {
            document.getElementById('week-selector').value = currentMode === 'auto' ? 'auto' : currentWeek;
            document.getElementById('requests-week-selector').value = currentMode === 'auto' ? 'auto' : currentWeek;
        }
        function toggleDarkMode() {
            const body = document.body;
            const toggle = document.getElementById('dark-mode-toggle');
            const reqToggle = document.getElementById('requests-dark-mode-toggle');
            body.classList.add('theme-transition');
            if (body.hasAttribute('data-theme')) {
                body.removeAttribute('data-theme');
                toggle.classList.remove('active');
                reqToggle.classList.remove('active');
                localStorage.setItem('darkMode', 'false');
            } else {
                body.setAttribute('data-theme', 'dark');
                toggle.classList.add('active');
                reqToggle.classList.add('active');
                localStorage.setItem('darkMode', 'true');
            }
            setTimeout(() => body.classList.remove('theme-transition'), 500);
        }
        function handleDayFilter() {
            currentViewDay = document.getElementById('day-filter-select').value;
            document.getElementById('requests-day-filter-select').value = currentViewDay;
            statisticsVisible = false;
            document.getElementById('statistics-box').style.display = 'none';
            generateTimetable();
            renderLessonsCountTable();
        }
        function handleWeekSelector(e) {
            const val = e.target.value;
            if (val === 'auto') {
                currentMode = 'auto';
            } else {
                currentMode = 'manual';
                currentWeek = val;
            }
            statisticsVisible = false;
            document.getElementById('statistics-box').style.display = 'none';
            updateWeekSelector();
            generateTimetable();
            renderLessonsCountTable();
        }
        function handleLessonsFilter(e) {
            const filter = e.target.dataset.filter;
            if (!filter) return;
            lessonsFilterMode = filter;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            });
            renderLessonsCountTable();
        }
        function toggleStatistics() {
            statisticsVisible = !statisticsVisible;
            if (statisticsVisible) {
                currentViewDay = 'all';
                document.getElementById('day-filter-select').value = 'all';
                document.getElementById('requests-day-filter-select').value = 'all';
                document.getElementById('statistics-box').style.display = 'block';
                document.getElementById('stats-nav').classList.toggle('stats-active', statisticsVisible);
                document.getElementById('requests-stats-nav').classList.toggle('stats-active', statisticsVisible);
                document.getElementById('non-inclusive-dates-box').style.display = 'block';
            } else {
                document.getElementById('statistics-box').style.display = 'none';
                document.getElementById('stats-nav').classList.toggle('stats-active', statisticsVisible);
                document.getElementById('requests-stats-nav').classList.toggle('stats-active', statisticsVisible);
                document.getElementById('non-inclusive-dates-box').style.display = 'none';
            }
            generateTimetable();
            updateStatisticsValues();
        }
        // ✅ CORREZIONE CHIAVE: funzione aggiornata per evitare errori e calcolare correttamente le lezioni
        function updateStatisticsValues() {
            if (!statisticsVisible) return;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const currentWeekStart = new Date(todayStart);
            const dayOfWeek = currentWeekStart.getDay();
            currentWeekStart.setDate(todayStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekStart.getDate() + 4);
            let weekCount = 0;
            let currentDate = new Date(todayStart); // Inizia da OGGI, non da lunedì
            while (currentDate <= currentWeekEnd) {
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                if (['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].includes(dayName)) {
                    const weekType = getWeekTypeForDate(currentDate);
                    if (weekType) {
                        const weekData = timetableData[weekType === 'A' ? 'weekA' : 'weekB'];
                        const dayData = weekData[dayName];
                        for (const period in dayData) {
                            const entry = dayData[period];
                            if (!entry || !entry.teachers) continue;
                            for (const teacher of teachers) {
                                const subject = entry.teachers[teacher]?.subject;
                                if (subject && !['Lunch', 'Form Time', ''].includes(subject)) {
                                    const dateStr = currentDate.toISOString().split('T')[0];
                                    if (nonInclusivePeriods[dateStr] && nonInclusivePeriods[dateStr].includes(period)) {
                                        continue;
                                    }
                                    // ✅ Calcolo corretto per "This Week": includi solo le lezioni future o in corso
                                    let includeLesson = true;
                                    if (currentDate.toDateString() === todayStart.toDateString()) {
                                        const timeRange = entry.time;
                                        if (timeRange) {
                                            const [startStr, endStr] = timeRange.split(' - ');
                                            const endTime = parseTime(endStr);
                                            if (endTime) {
                                                const nowMins = now.getHours() * 60 + now.getMinutes();
                                                const endMins = endTime.hours * 60 + endTime.minutes;
                                                if (nowMins >= endMins) {
                                                    includeLesson = false; // Lezione già terminata oggi
                                                }
                                            }
                                        }
                                    }
                                    if (includeLesson) {
                                        weekCount++;
                                    }
                                }
                            }
                        }
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const monthCount = countLessonsUntilTerm('month').counts;
            const monthTotal = Object.values(monthCount).reduce((a, b) => a + b, 0);
            const { counts: halfTermCounts, byTeacher: __, todayLessons: ___ } = countLessonsUntilTerm('all');
            const halfTermTotal = Object.values(halfTermCounts).reduce((a, b) => a + b, 0);
            const yearEndTotal = countLessonsUntilYearEnd();
            document.getElementById('stat-week').textContent = weekCount;
            document.getElementById('stat-month').textContent = monthTotal;
            document.getElementById('stat-half-term').textContent = halfTermTotal;
            document.getElementById('stat-year-end').textContent = yearEndTotal;
            // Utilizziamo valori realistici per le barre di progresso
            const maxWeek = 41; // max settimanale
            const maxMonth = 200; // stima ragionevole
            const maxHalfTerm = 1000;
            const maxYearEnd = 2000;
            document.getElementById('progress-week').style.width = `${Math.min(100, (weekCount / maxWeek) * 100)}%`;
            document.getElementById('progress-month').style.width = `${Math.min(100, (monthTotal / maxMonth) * 100)}%`;
            document.getElementById('progress-half-term').style.width = `${Math.min(100, (halfTermTotal / maxHalfTerm) * 100)}%`;
            document.getElementById('progress-year-end').style.width = `${Math.min(100, (yearEndTotal / maxYearEnd) * 100)}%`;
        }
        function handleRefreshStats() {
            updateStatisticsValues();
        }
        function populateNonInclusiveDatesList() {
            const list = document.getElementById('non-inclusive-dates-list');
            list.innerHTML = '';
            const now = new Date();
            const dateDescriptions = {
                "2025-09-01": "Insert Day",
                "2025-09-02": "Insert Day",
                "2025-09-25": "Open Evening Y6 (Period 4b & 5)",
                "2025-10-09": "Open Evening 6 Form (Period 4b & 5)",
                "2025-11-21": "Insert Day",
                "2025-12-19": "Christmas Celebration",
                "2026-01-05": "Insert Day",
                "2026-03-19": "Option Evening (Period 4b & 5)",
                "2026-05-04": "Bank Holiday",
                "2026-06-26": "STM Day",
                "2026-07-03": "Sport Day",
                "2026-07-16": "Culture Day",
                "2026-07-17": "End Year Celebration"
            };
            nonInclusiveDates.forEach(date => {
                const li = document.createElement('li');
                const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                const desc = dateDescriptions[date.toISOString().split('T')[0]];
                li.innerHTML = `<span class="date-label">${dateStr}</span> <span class="desc-label">${desc}</span>`;
                if (date < now) {
                    li.classList.add('past');
                }
                list.appendChild(li);
            });
        }
        function handleRefreshLessons() {
             renderLessonsCountTable();
             populateTodaysLessonsBox();
        }
        document.getElementById('day-filter-select').addEventListener('change', handleDayFilter);
        document.getElementById('week-selector').addEventListener('change', handleWeekSelector);
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', handleLessonsFilter);
        });
        document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
        document.getElementById('fullscreen-btn').addEventListener('click', toggleFullScreen);
        document.getElementById('stats-nav').addEventListener('click', function(e) {
            e.preventDefault();
            toggleStatistics();
        });
        document.getElementById('refresh-stats-btn').addEventListener('click', handleRefreshStats);
        document.getElementById('refresh-lessons-btn').addEventListener('click', handleRefreshLessons);
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('week-selector').value = 'auto';
            document.getElementById('requests-week-selector').value = 'auto';
            // ✅ AGGIUNGI LISTENER PER IL NUOVO FILTRO
            document.getElementById('requests-teacher-filter').addEventListener('change', renderRequestsPage);
            // ✅ AVVIA AUTO-REFRESH SE SI È NELLA PAGINA REQUESTS
            document.getElementById('requests-nav').addEventListener('click', startAutoRefresh);
            document.getElementById('requests-nav-current').addEventListener('click', startAutoRefresh);
        });
        populateNonInclusiveDatesList();
        generateTimetable();
        renderLessonsCountTable();
        populateTodaysLessonsBox();
        let lastLessonsUpdate = Date.now();
        const lessonsUpdateInterval = 30 * 60 * 1000;
        setInterval(() => {
            updateClockPrecise();
            updateCountdownPrecise();
            updateNowContextBar();
            updateDynamicBackgroundAndShadows();
            if (statisticsVisible) updateStatisticsValues();
        }, 1000);
        setInterval(() => {
            if (statisticsVisible) {
                const now = Date.now();
                if (now - lastLessonsUpdate >= lessonsUpdateInterval) {
                    renderLessonsCountTable();
                    populateTodaysLessonsBox();
                    lastLessonsUpdate = now;
                }
            } else {
                renderLessonsCountTable();
                populateTodaysLessonsBox();
            }
        }, 1000);
        updateClockPrecise();
        updateCountdownPrecise();
        updateNowContextBar();
        updateDynamicBackgroundAndShadows();
        renderLessonsCountTable();
        document.getElementById('version-badge').textContent = `ver.31111.02`;