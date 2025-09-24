// Simple database system for teacher requests using localStorage with enhanced structure
// This provides cross-browser compatibility and persistent storage

class TeacherRequestDatabase {
    constructor() {
        this.dbName = 'timetable_teacher_requests';
        this.version = '1.0';
        this.init();
        
        // Auto-save every 30 seconds to ensure data persistence
        setInterval(() => {
            this.syncData();
        }, 30000);
        
        // Listen for storage events to sync across tabs and browsers
        window.addEventListener('storage', (e) => {
            if (e.key === this.dbName) {
                console.log('Database updated in another tab/browser, syncing...');
                this.loadFromStorage();
            }
        });
        
        // Listen for beforeunload to save data before closing
        window.addEventListener('beforeunload', () => {
            this.syncData();
        });
    }

    init() {
        try {
            this.loadFromStorage();
        } catch (error) {
            console.warn('Error loading database, creating new one:', error);
            this.createNewDatabase();
        }
    }

    createNewDatabase() {
        const initialDb = {
            version: this.version,
            requests: {},
            metadata: {
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                totalRequests: 0
            }
        };
        
        try {
            localStorage.setItem(this.dbName, JSON.stringify(initialDb));
            // Also create backup in sessionStorage
            sessionStorage.setItem(this.dbName + '_backup', JSON.stringify(initialDb));
        } catch (error) {
            console.error('Error creating database:', error);
        }
    }

    loadFromStorage() {
        try {
            const dbString = localStorage.getItem(this.dbName);
            if (dbString) {
                const db = JSON.parse(dbString);
                // Validate database structure
                if (db.version && db.requests && db.metadata) {
                    return db;
                }
            }
            
            // Try to recover from backup
            const backupString = sessionStorage.getItem(this.dbName + '_backup');
            if (backupString) {
                const backupDb = JSON.parse(backupString);
                if (backupDb.version && backupDb.requests && backupDb.metadata) {
                    localStorage.setItem(this.dbName, backupString);
                    return backupDb;
                }
            }
            
            // If no valid database found, create new one
            this.createNewDatabase();
            return JSON.parse(localStorage.getItem(this.dbName));
            
        } catch (error) {
            console.error('Error loading from storage:', error);
            this.createNewDatabase();
            return JSON.parse(localStorage.getItem(this.dbName));
        }
    }

    syncData() {
        try {
            const db = this.getDatabase();
            db.metadata.lastModified = new Date().toISOString();
            
            // Save to localStorage
            localStorage.setItem(this.dbName, JSON.stringify(db));
            
            // Create backup in sessionStorage
            sessionStorage.setItem(this.dbName + '_backup', JSON.stringify(db));
            
            // Trigger storage event for cross-tab sync
            window.dispatchEvent(new StorageEvent('storage', {
                key: this.dbName,
                newValue: JSON.stringify(db),
                oldValue: null,
                storageArea: localStorage
            }));
            
            return true;
        } catch (error) {
            console.error('Error syncing data:', error);
            return false;
        }
    }

    // Generate unique key for each request
    generateKey(week, day, period, teacher) {
        return `${week}_${day}_${period}_${teacher.replace(/[.\s]/g, '_')}`;
    }

    // Save a teacher request
    saveRequest(requestData) {
        try {
            const db = this.getDatabase();
            const key = this.generateKey(
                requestData.week,
                requestData.day,
                requestData.period,
                requestData.teacher
            );

            const request = {
                id: requestData.id || key,
                week: requestData.week,
                day: requestData.day,
                period: requestData.period,
                time: requestData.time,
                teacher: requestData.teacher,
                subject: requestData.subject,
                room: requestData.room,
                hasRequest: requestData.hasRequest || false,
                notes: requestData.notes || '',
                communications: requestData.communications || '',
                createdAt: requestData.createdAt || new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                createdBy: requestData.createdBy || 'Unknown',
                status: requestData.status || 'active'
            };

            db.requests[key] = request;
            db.metadata.lastModified = new Date().toISOString();
            db.metadata.totalRequests = Object.keys(db.requests).length;
            
            // Use improved sync method
            const success = this.syncData();
            
            console.log('Request saved successfully:', request);
            return success;
        } catch (error) {
            console.error('Error saving request:', error);
            return false;
        }
    }

    // Get a specific request
    getRequest(week, day, period, teacher) {
        try {
            const db = this.getDatabase();
            const key = this.generateKey(week, day, period, teacher);
            return db.requests[key] || null;
        } catch (error) {
            console.error('Error getting request:', error);
            return null;
        }
    }

    // Get all requests
    getAllRequests() {
        try {
            const db = this.getDatabase();
            return Object.values(db.requests).filter(request => request.status === 'active');
        } catch (error) {
            console.error('Error getting all requests:', error);
            return [];
        }
    }

    // Get requests by teacher
    getRequestsByTeacher(teacher) {
        try {
            const db = this.getDatabase();
            return Object.values(db.requests).filter(
                request => request.teacher === teacher && request.status === 'active'
            );
        } catch (error) {
            console.error('Error getting requests by teacher:', error);
            return [];
        }
    }

    // Delete a request (only administrators can do this)
    deleteRequest(week, day, period, teacher, deletedBy) {
        try {
            const db = this.getDatabase();
            const key = this.generateKey(week, day, period, teacher);
            
            if (db.requests[key]) {
                // Mark as deleted instead of actually deleting (for audit trail)
                db.requests[key].status = 'deleted';
                db.requests[key].deletedAt = new Date().toISOString();
                db.requests[key].deletedBy = deletedBy;
                db.metadata.lastModified = new Date().toISOString();
                
                const success = this.syncData();
                return success;
            }
            return false;
        } catch (error) {
            console.error('Error deleting request:', error);
            return false;
        }
    }

    // Clear a request (remove the request flag but keep the record)
    clearRequest(week, day, period, teacher) {
        try {
            const db = this.getDatabase();
            const key = this.generateKey(week, day, period, teacher);
            
            if (db.requests[key]) {
                db.requests[key].hasRequest = false;
                db.requests[key].notes = '';
                db.requests[key].communications = '';
                db.requests[key].modifiedAt = new Date().toISOString();
                db.metadata.lastModified = new Date().toISOString();
                
                const success = this.syncData();
                return success;
            }
            return false;
        } catch (error) {
            console.error('Error clearing request:', error);
            return false;
        }
    }

    // Get database
    getDatabase() {
        try {
            const dbString = localStorage.getItem(this.dbName);
            if (!dbString) {
                this.init();
                return JSON.parse(localStorage.getItem(this.dbName));
            }
            return JSON.parse(dbString);
        } catch (error) {
            console.error('Error parsing database:', error);
            this.init();
            return JSON.parse(localStorage.getItem(this.dbName));
        }
    }

    // Export database (for backup or transfer)
    exportDatabase() {
        try {
            const db = this.getDatabase();
            return JSON.stringify(db, null, 2);
        } catch (error) {
            console.error('Error exporting database:', error);
            return null;
        }
    }

    // Import database (for restore)
    importDatabase(dbString) {
        try {
            const db = JSON.parse(dbString);
            if (db.version && db.requests && db.metadata) {
                localStorage.setItem(this.dbName, dbString);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error importing database:', error);
            return false;
        }
    }

    // Get database statistics
    getStatistics() {
        try {
            const db = this.getDatabase();
            const requests = Object.values(db.requests);
            
            return {
                totalRequests: requests.length,
                activeRequests: requests.filter(r => r.status === 'active' && r.hasRequest).length,
                deletedRequests: requests.filter(r => r.status === 'deleted').length,
                requestsByTeacher: this.getRequestCountByTeacher(),
                lastModified: db.metadata.lastModified,
                created: db.metadata.created
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return null;
        }
    }

    // Get request count by teacher
    getRequestCountByTeacher() {
        try {
            const requests = this.getAllRequests().filter(r => r.hasRequest);
            const counts = {};
            
            requests.forEach(request => {
                counts[request.teacher] = (counts[request.teacher] || 0) + 1;
            });
            
            return counts;
        } catch (error) {
            console.error('Error getting request count by teacher:', error);
            return {};
        }
    }

    // Check if user can modify request
    canModifyRequest(teacher, currentUser) {
        // Administrators can modify all requests
        if (currentUser === 'Fiore Luongo Administrator' || currentUser === 'Page for Test') {
            return true;
        }
        
        // Teachers can only modify their own requests
        if (currentUser === 'Katie Arakelian' && teacher === 'Miss K. Arakelian') {
            return true;
        }
        
        if (currentUser === 'Natalie Jenkins' && teacher === 'Ms N Jenkins') {
            return true;
        }
        
        return false;
    }

    // Check if user can delete request (only administrators)
    canDeleteRequest(currentUser) {
        return currentUser === 'Fiore Luongo Administrator' || currentUser === 'Page for Test';
    }
}

// Create global instance
window.teacherRequestDB = new TeacherRequestDatabase();

