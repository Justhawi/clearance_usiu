import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

// TODO: Replace the placeholder values below with your Firebase project credentials.
const firebaseConfig = {
    apiKey: "AIzaSyBoYc4Vf-F3diPU0igy34iJUUgAsJmFZ4E",
    authDomain: "clearance-526e0.firebaseapp.com",
    projectId: "clearance-526e0",
    storageBucket: "clearance-526e0.firebasestorage.app",
    messagingSenderId: "905843380195",
    appId: "1:905843380195:web:6f9f22f820094b6c591ad6"
  }

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Auth persistence configuration failed:', error);
});

const palette = {
  blue: '#1A237E',
  lightBlue: '#233F90',
  gold: '#FDB913',
  white: '#FFFFFF',
  text: '#2c3e50'
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'not_cleared', label: 'Not Cleared' }
];

const holdDepartmentOptions = [
  { value: 'finance', label: 'Finance' },
  { value: 'library', label: 'Library' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'student_affairs', label: 'Student Affairs' },
  { value: 'housing', label: 'Housing' },
  { value: 'sports', label: 'Sports & Recreation' },
  { value: 'it_services', label: 'IT Services' }
];

let currentUser = null;
let currentProfile = null;
let studentRequests = [];
let adminRequests = [];
let studentUnsubscribe = null;
let adminUnsubscribe = null;
let studentDashboardInitialized = false;
let adminDashboardInitialized = false;
let adminFilter = { term: '', status: 'all' };
let charts = { status: null, trend: null, department: null };
let currentModalHolds = [];

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  initialiseNav();
  initialiseLoginModal();

  const page = document.body.dataset.page || 'home';

  if (page === 'home') {
    initialiseHomePage();
    // Fallback: ensure buttons are set up even if there's a delay
    setTimeout(() => {
      console.log('Fallback: Setting up buttons again');
      setupHomeButtons();
      
      // Test: Try to manually trigger click to verify buttons work
      const testButtons = document.querySelectorAll('[data-action="open-login"]');
      console.log('Test: Found', testButtons.length, 'login buttons');
      testButtons.forEach((btn, idx) => {
        console.log(`Test: Button ${idx}:`, btn, 'Has handler:', btn.hasAttribute('data-handler-setup'));
      });
    }, 500);
    
    // Immediate test after a short delay
    setTimeout(() => {
      const testBtn = document.querySelector('[data-action="open-login"]');
      if (testBtn) {
        console.log('Quick test: Button found, testing direct call');
        // Don't actually call, just verify it exists
      }
    }, 100);
  }

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    currentProfile = null;

    if (user) {
      currentProfile = await fetchProfile(user.uid);
    }

    if (page === 'home') {
      updateHomeAuthUI();
      return;
    }

    if (page === 'student') {
      if (!user || !currentProfile || currentProfile.role !== 'student') {
        redirectHome();
        return;
      }
      if (!studentDashboardInitialized) {
        studentDashboardInitialized = true;
        initialiseStudentDashboard();
      }
      return;
    }

    if (page === 'admin') {
      if (!user || !currentProfile || currentProfile.role !== 'admin') {
        redirectHome();
        return;
      }
      if (!adminDashboardInitialized) {
        adminDashboardInitialized = true;
        initialiseAdminDashboard();
      }
    }
  });
});

function initialiseNav() {
  const navLinks = document.querySelectorAll('.nav-link[data-target]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.dataset.target;
      if (!targetId) return;

      const section = document.querySelector(targetId);
      if (section) {
        event.preventDefault();
        section.scrollIntoView({ behavior: 'smooth' });
        navLinks.forEach((nav) => nav.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });
}

async function initialiseHomePage() {
  await populateDepartments();
  setupHomeButtons();
}

async function populateDepartments() {
  const container = document.querySelector('#departmentList');
  if (!container) return;

  container.innerHTML =
    '<p class="section-text" style="text-align:center;">Loading departments...</p>';

  try {
    const departmentsQuery = query(collection(db, 'departments'), orderBy('name'));
    const snapshot = await getDocs(departmentsQuery);

    if (snapshot.empty) {
      container.innerHTML =
        '<p class="section-text" style="text-align:center;">No departments have been added yet.</p>';
      return;
    }

    container.innerHTML = '';

    snapshot.docs.forEach((docRef, index) => {
      const data = docRef.data();
      const card = document.createElement('article');
      card.className = 'department-card animate-delay';
      card.style.animationDelay = `${index * 120}ms`;
      card.style.animation = 'fadeIn 0.6s ease forwards';
      card.innerHTML = `
        <h3 class="department-title">${data.name || 'Department'}</h3>
        <p class="department-text">${data.description || 'Description coming soon.'}</p>
        <span class="department-contact">
          <i data-lucide="mail"></i>
          <span>${data.contact || 'contact@usiu.ac.ke'}</span>
        </span>
      `;
      container.appendChild(card);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (error) {
    console.error('Failed to load departments:', error);
    container.innerHTML =
      '<p class="section-text" style="text-align:center;">Unable to load departments right now. Please try again later.</p>';
  }
}

function setupHomeButtons() {
  const loginButtons = document.querySelectorAll('[data-action="open-login"]');
  console.log('Setting up home buttons, found:', loginButtons.length);
  
  loginButtons.forEach((button, index) => {
    if (!(button instanceof HTMLAnchorElement || button instanceof HTMLButtonElement)) {
      console.warn('Button', index, 'is not a valid anchor or button element');
      return;
    }
    
    // Store default label if not already stored
    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent?.trim() || 'Log In';
    }
    
    // Remove any existing handlers by cloning (clean slate)
    if (button.hasAttribute('data-handler-setup')) {
      console.log('Button already set up, skipping');
      return;
    }
    
    button.setAttribute('data-handler-setup', 'true');
    
    console.log('Setting up click handler for button:', button.textContent?.trim());
    
    // Simple, direct click handler
    button.onclick = function(event) {
      console.log('=== BUTTON CLICKED ===');
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Current user:', currentUser);
      console.log('Current profile:', currentProfile);
      
      if (currentUser && currentProfile) {
        console.log('User is logged in, redirecting...');
        redirectAfterLogin(currentProfile);
      } else {
        console.log('User not logged in, opening modal...');
        openLoginModal();
      }
      
      return false;
    };
    
    // Also add addEventListener as backup
    button.addEventListener('click', function(event) {
      console.log('addEventListener click fired');
      if (!currentUser || !currentProfile) {
        event.preventDefault();
        openLoginModal();
      }
    });
  });
}

function initialiseLoginModal() {
  const modal = document.querySelector('#loginModal');
  if (!modal) return;

  const closeButtons = modal.querySelectorAll('[data-close="login-modal"]');
  closeButtons.forEach((btn) => btn.addEventListener('click', closeLoginModal));

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeLoginModal();
    }
  });

  const toggleButton = modal.querySelector('#toggleLoginMode');
  const title = modal.querySelector('#loginModalTitle');
  const subtitle = modal.querySelector('#loginModalSubtitle');
  const accountFields = modal.querySelector('#accountFields');
  const roleSelect = modal.querySelector('#accountRole');
  const studentIdGroup = modal.querySelector('#studentIdGroup');
  const form = modal.querySelector('#loginForm');
  const submitButton = modal.querySelector('#loginSubmit');
  const feedback = modal.querySelector('#loginFeedback');

  const fullNameInput = modal.querySelector('#fullName');
  const studentIdInput = modal.querySelector('#studentIdInput');
  const emailInput = modal.querySelector('#loginEmail');
  const passwordInput = modal.querySelector('#loginPassword');

  let isLogin = true;

  toggleButton?.addEventListener('click', () => {
    isLogin = !isLogin;
    title.textContent = isLogin ? 'Welcome Back' : 'Create Account';
    subtitle.textContent = isLogin
      ? 'Sign in to your account'
      : 'Register for clearance system';
    toggleButton.textContent = isLogin
      ? "Don't have an account? Sign up"
      : 'Already have an account? Sign in';
    submitButton.textContent = isLogin ? 'Sign In' : 'Create Account';
    accountFields.classList.toggle('hidden', isLogin);
    feedback?.classList.add('hidden');
  });

  roleSelect?.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLSelectElement)) return;
    studentIdGroup?.classList.toggle('hidden', event.target.value !== 'student');
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!submitButton || !feedback || !(emailInput instanceof HTMLInputElement) || !(passwordInput instanceof HTMLInputElement)) {
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      feedback.className = 'status-pill rejected';
      feedback.textContent = 'Email and password are required.';
      feedback.classList.remove('hidden');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = isLogin ? 'Signing In...' : 'Creating Account...';
    feedback.className = 'status-pill pending';
    feedback.textContent = 'Processing...';
    feedback.classList.remove('hidden');

    try {
      if (isLogin) {
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        const profile = await fetchProfile(credentials.user.uid);
        if (!profile) {
          throw new Error('Profile not found. Please contact the administrator.');
        }
        feedback.className = 'status-pill approved';
        feedback.textContent = 'Welcome back! Redirecting...';
        setTimeout(() => redirectAfterLogin(profile), 600);
      } else {
        if (!(fullNameInput instanceof HTMLInputElement) || !(roleSelect instanceof HTMLSelectElement)) {
          throw new Error('Missing account details.');
        }
        const fullName = fullNameInput.value.trim();
        const role = roleSelect.value;
        const studentId = studentIdInput instanceof HTMLInputElement ? studentIdInput.value.trim() : '';

        if (!fullName) {
          throw new Error('Full name is required.');
        }
        if (role === 'student' && !studentId) {
          throw new Error('Student ID is required for student accounts.');
        }

        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credentials.user, { displayName: fullName });

        const profileRecord = {
          fullName,
          role,
          studentId: role === 'student' ? studentId : '',
          email,
          createdAt: serverTimestamp()
        };

        await setDoc(doc(db, 'profiles', credentials.user.uid), profileRecord);

        feedback.className = 'status-pill approved';
        feedback.textContent = 'Account created! Redirecting...';
        setTimeout(() => redirectAfterLogin({ ...profileRecord, id: credentials.user.uid }), 800);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      feedback.className = 'status-pill rejected';
      feedback.textContent = error instanceof Error ? error.message : 'Something went wrong. Try again.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = isLogin ? 'Sign In' : 'Create Account';
    }
  });
}

function openLoginModal() {
  console.log('=== openLoginModal called ===');
  const modal = document.querySelector('#loginModal');
  
  if (!modal) {
    console.error('ERROR: Login modal (#loginModal) not found in HTML!');
    alert('Login modal not found. Please refresh the page.');
    return;
  }
  
  console.log('Modal found, adding active class...');
  modal.classList.add('active');
  modal.style.display = 'flex';
  modal.style.zIndex = '1000';
  
  console.log('Modal should now be visible');
  
  // Refresh Lucide icons
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function closeLoginModal() {
  const modal = document.querySelector('#loginModal');
  if (!modal) return;
  modal.classList.remove('active');
  const form = modal.querySelector('#loginForm');
  const feedback = modal.querySelector('#loginFeedback');
  const studentIdGroup = modal.querySelector('#studentIdGroup');
  form?.reset();
  feedback?.classList.add('hidden');
  studentIdGroup?.classList.add('hidden');
}

function initialiseStudentDashboard() {
  renderStudentWelcome();
  setupStudentSignOut();
  setupNewRequest();
  setupCertificateFeatures();
  subscribeToStudentRequests();
}

function renderStudentWelcome() {
  const nameEl = document.querySelector('#studentName');
  const idEl = document.querySelector('#studentId');
  if (nameEl) {
    nameEl.textContent = currentProfile?.fullName || currentUser?.email || 'Student';
  }
  if (idEl) {
    idEl.textContent = currentProfile?.studentId || 'N/A';
  }
}

function subscribeToStudentRequests() {
  if (!currentUser) {
    console.error('No current user, cannot fetch requests');
    const loadingState = document.querySelector('#studentLoadingState');
    if (loadingState) {
      loadingState.classList.add('hidden');
    }
    // Show empty state
    const emptyState = document.querySelector('#studentEmptyState');
    if (emptyState) {
      emptyState.classList.remove('hidden');
    }
    return;
  }

  console.log('Subscribing to student requests for user:', currentUser.uid);

  if (studentUnsubscribe) {
    studentUnsubscribe();
  }

  // Set a timeout to hide loading state if query takes too long
  const loadingTimeout = setTimeout(() => {
    console.warn('Query taking too long, hiding loading state');
    const loadingState = document.querySelector('#studentLoadingState');
    if (loadingState && !loadingState.classList.contains('hidden')) {
      loadingState.classList.add('hidden');
      const emptyState = document.querySelector('#studentEmptyState');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = `
          <i data-lucide="clock"></i>
          <h4>Loading...</h4>
          <p>Taking longer than expected. Please check your connection.</p>
        `;
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    }
  }, 10000); // 10 second timeout

  // Query without orderBy first to avoid index requirement
  // We'll sort in JavaScript instead
  const requestsQuery = query(
    collection(db, 'clearance_requests'),
    where('studentUid', '==', currentUser.uid)
  );

  console.log('Setting up Firestore snapshot listener...');

  studentUnsubscribe = onSnapshot(
    requestsQuery,
    (snapshot) => {
      clearTimeout(loadingTimeout);
      console.log('Student requests snapshot received:', snapshot.docs.length, 'documents');
      
      // Hide loading state immediately
      const loadingState = document.querySelector('#studentLoadingState');
      if (loadingState) {
        loadingState.classList.add('hidden');
      }
      
      try {
        studentRequests = snapshot.docs.map(mapRequest);
        console.log('Mapped requests:', studentRequests.length);
        
        // Debug: Log each request's status
        studentRequests.forEach((req, idx) => {
          console.log(`Request ${idx + 1}:`, {
            id: req.id,
            overallStatus: req.overallStatus,
            feeStatus: req.feeStatus,
            libraryStatus: req.libraryStatus,
            registrarStatus: req.registrarStatus,
            hasHolds: req.holds?.length > 0
          });
        });
        
        // Sort by date descending (newest first)
        studentRequests.sort((a, b) => {
          const dateA = new Date(a.requestDate);
          const dateB = new Date(b.requestDate);
          return dateB - dateA; // Descending order
        });
        
        renderStudentRequests(studentRequests);
      } catch (error) {
        console.error('Error mapping requests:', error);
        const loadingState = document.querySelector('#studentLoadingState');
        if (loadingState) {
          loadingState.classList.add('hidden');
        }
        showToast('Error processing requests data.');
      }
    },
    (error) => {
      clearTimeout(loadingTimeout);
      console.error('Failed to load student requests:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Hide loading state on error
      const loadingState = document.querySelector('#studentLoadingState');
      if (loadingState) {
        loadingState.classList.add('hidden');
      }
      
      // Show error message
      const container = document.querySelector('#studentRequestList');
      const emptyState = document.querySelector('#studentEmptyState');
      
      if (container && emptyState) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        
        let errorMessage = 'Unable to load your requests right now.';
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check Firestore security rules.';
        } else if (error.code === 'failed-precondition') {
          errorMessage = 'A Firestore index is required. Check the console for the index link.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        emptyState.innerHTML = `
          <i data-lucide="alert-circle"></i>
          <h4>Error Loading Requests</h4>
          <p>${errorMessage}</p>
          <p style="font-size: 0.85rem; color: rgba(44, 62, 80, 0.6); margin-top: 8px;">
            Error code: ${error.code || 'unknown'}
          </p>
        `;
        
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
      
      showToast('Unable to load your requests right now.');
    }
  );
}

function renderStudentRequests(requests) {
  const container = document.querySelector('#studentRequestList');
  const emptyState = document.querySelector('#studentEmptyState');
  const loadingState = document.querySelector('#studentLoadingState');

  if (loadingState) loadingState.classList.add('hidden');

  if (!container || !emptyState) return;

  container.innerHTML = '';

  if (!requests.length) {
    emptyState.classList.remove('hidden');
    container.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.classList.remove('hidden');

  requests.forEach((request) => {
    const card = document.createElement('article');
    card.className = 'request-card';
    card.innerHTML = `
      <header class="request-header">
        <div>
          <p class="badge gold">Request ID: ${request.id}</p>
          <p>Requested on <strong>${formatDate(request.requestDate)}</strong></p>
          <p>Last updated <strong>${formatDate(request.updatedAt)}</strong></p>
        </div>
        <span class="status-pill ${mapStatusPill(request.overallStatus)}">
          <i data-lucide="${mapStatusIcon(request.overallStatus)}"></i>
          <span class="capitalize">${formatStatus(request.overallStatus)}</span>
        </span>
      </header>
      <div class="request-details">
        ${renderStudentStatus('Fee Status', request.feeStatus)}
        ${renderStudentStatus('Library Status', request.libraryStatus, true)}
        ${renderStudentStatus('Registrar Status', request.registrarStatus)}
      </div>
      ${renderHoldsSummary(request.holds, true)}
      ${request.comments ? `<div class="divider"></div><p>${request.comments}</p>` : ''}
    `;
    container.appendChild(card);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  // Update progress chart and certificate visibility (with small delay to ensure DOM is ready)
  // Always call updateStudentProgressChart, even with empty requests
  setTimeout(() => {
    updateStudentProgressChart(requests || []);
    updateCertificateVisibility(requests || []);
  }, 100);
}

function renderStudentStatus(label, status, gold = false) {
  return `
    <div class="status-card ${gold ? 'gold' : ''}">
      <h4>${label}</h4>
      <span class="status-pill ${mapStatusPill(status)}">
        <i data-lucide="${mapStatusIcon(status)}"></i>
        <span>${formatStatus(status)}</span>
      </span>
    </div>
  `;
}

function setupNewRequest() {
  const openButton = document.querySelector('#openNewRequestModal');
  const modal = document.querySelector('#newRequestModal');
  const closeButtons = modal?.querySelectorAll('[data-close="new-request"]') || [];
  const submitButton = modal?.querySelector('#submitNewRequest');

  openButton?.addEventListener('click', () => modal?.classList.add('active'));

  closeButtons.forEach((btn) =>
    btn.addEventListener('click', () => modal?.classList.remove('active'))
  );

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.classList.remove('active');
    }
  });

  submitButton?.addEventListener('click', async () => {
    if (!currentUser || !currentProfile) {
      showToast('Please sign in first.');
      return;
    }
    if (!(submitButton instanceof HTMLButtonElement)) return;

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';

    try {
      await addDoc(collection(db, 'clearance_requests'), {
        studentUid: currentUser.uid,
        studentName: currentProfile.fullName || '',
        studentNumber: currentProfile.studentId || '',
        email: currentUser.email || '',
        requestDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
        overallStatus: 'pending',
        feeStatus: 'pending',
        libraryStatus: 'pending',
        registrarStatus: 'pending',
        comments: ''
      });
      modal?.classList.remove('active');
      showToast('New clearance request submitted successfully.');
    } catch (error) {
      console.error('Error creating clearance request:', error);
      showToast('Failed to submit request. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });
}

let studentCharts = { status: null, department: null };

function setupCertificateFeatures() {
  const printBtn = document.querySelector('#printCertificateBtn');
  const downloadBtn = document.querySelector('#downloadCertificateBtn');
  const alumniBtn = document.querySelector('#registerAlumniBtn');

  printBtn?.addEventListener('click', printCertificate);
  downloadBtn?.addEventListener('click', downloadCertificate);
  alumniBtn?.addEventListener('click', () => {
    window.open('https://alumni.usiu.ac.ke/register', '_blank');
    showToast('Opening alumni registration page...');
  });
}

function updateStudentProgressChart(requests) {
  console.log('updateStudentProgressChart called with', requests?.length || 0, 'requests');
  
  // Wait for Chart.js to be available
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded, retrying in 500ms...');
    setTimeout(() => updateStudentProgressChart(requests), 500);
    return;
  }

  // Destroy existing charts
  if (studentCharts.status) {
    studentCharts.status.destroy();
    studentCharts.status = null;
  }
  if (studentCharts.department) {
    studentCharts.department.destroy();
    studentCharts.department = null;
  }

  // Get the latest request or use empty data
  const latestRequest = requests && requests.length > 0 ? requests[0] : null;
  
  // Ensure requests is an array
  if (!Array.isArray(requests)) {
    requests = [];
  }

  // Status Chart (Doughnut)
  const statusCtx = document.querySelector('#studentStatusChart');
  if (!statusCtx) {
    console.warn('Status chart canvas not found');
  } else {
    console.log('Rendering student status chart with', requests?.length || 0, 'requests');
    
    // Normalize statuses: treat "cleared" as "approved"
    const statusCounts = requests ? requests.reduce(
      (acc, request) => {
        let status = request.overallStatus;
        // Normalize cleared to approved
        if (status === 'cleared') status = 'approved';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 }
    ) : { approved: 0, pending: 0, rejected: 0 };

    console.log('Status counts:', statusCounts);

    // Calculate chart data - always show chart even with zeros
    const approvedCount = (statusCounts.approved || 0) + (statusCounts.cleared || 0);
    const pendingCount = statusCounts.pending || 0;
    const rejectedCount = (statusCounts.rejected || 0) + (statusCounts.not_cleared || 0);
    const chartData = [approvedCount, pendingCount, rejectedCount];
    
    console.log('Chart data:', { approvedCount, pendingCount, rejectedCount, chartData });
    
    // Always render chart, even with zeros
    try {
      studentCharts.status = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Approved', 'Pending', 'Rejected'],
          datasets: [
            {
              data: chartData,
              backgroundColor: ['#1f9254', palette.gold, '#c0392b'],
              borderWidth: 0,
              hoverOffset: 12
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: palette.text,
                usePointStyle: true,
                padding: 12
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          },
          cutout: '70%'
        }
      });
      
      console.log('Status chart rendered successfully');
    } catch (error) {
      console.error('Error rendering status chart:', error);
    }
  }

  // Department Progress Chart (Bar)
  const departmentCtx = document.querySelector('#studentDepartmentChart');
  if (!departmentCtx) {
    console.warn('Department chart canvas not found');
  } else {
    console.log('Rendering student department chart');
    const departmentTotals = {
      finance: { cleared: 0, pending: 0, not_cleared: 0 },
      library: { cleared: 0, pending: 0, not_cleared: 0 },
      registrar: { cleared: 0, pending: 0, not_cleared: 0 }
    };

    if (latestRequest) {
      incrementDepartmentStatus(departmentTotals.finance, latestRequest.feeStatus);
      incrementDepartmentStatus(departmentTotals.library, latestRequest.libraryStatus);
      incrementDepartmentStatus(departmentTotals.registrar, latestRequest.registrarStatus);
    }

    studentCharts.department = new Chart(departmentCtx, {
      type: 'bar',
      data: {
        labels: ['Finance', 'Library', 'Registrar'],
        datasets: [
          {
            label: 'Cleared',
            data: [
              departmentTotals.finance.cleared,
              departmentTotals.library.cleared,
              departmentTotals.registrar.cleared
            ],
            backgroundColor: 'rgba(31, 146, 84, 0.88)',
            borderRadius: 10,
            maxBarThickness: 36
          },
          {
            label: 'Pending',
            data: [
              departmentTotals.finance.pending,
              departmentTotals.library.pending,
              departmentTotals.registrar.pending
            ],
            backgroundColor: 'rgba(253, 185, 19, 0.78)',
            borderRadius: 10,
            maxBarThickness: 36
          },
          {
            label: 'Not Cleared',
            data: [
              departmentTotals.finance.not_cleared,
              departmentTotals.library.not_cleared,
              departmentTotals.registrar.not_cleared
            ],
            backgroundColor: 'rgba(192, 57, 43, 0.82)',
            borderRadius: 10,
            maxBarThickness: 36
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: palette.text, usePointStyle: true }
          }
        },
        scales: {
          x: {
            ticks: { color: palette.text },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: palette.text, precision: 0, stepSize: 1 },
            grid: { color: 'rgba(26, 35, 126, 0.08)' }
          }
        }
      }
    });
  }
}

function updateCertificateVisibility(requests) {
  console.log('updateCertificateVisibility called with', requests?.length || 0, 'requests');
  
  if (!requests || requests.length === 0) {
    console.log('No requests, hiding certificate sections');
    hideCertificateSections();
    return;
  }

  // Check if any request is approved or cleared
  // Treat both "approved" and "cleared" as the same status
  const hasApprovedRequest = requests.some(req => {
    const status = req.overallStatus?.toLowerCase();
    const isApproved = status === 'approved' || status === 'cleared';
    console.log(`Request ${req.id}: overallStatus = ${req.overallStatus}, isApproved = ${isApproved}`);
    return isApproved;
  });
  
  console.log('Has approved/cleared request:', hasApprovedRequest);
  
  const certificateSection = document.querySelector('#certificateSection');
  const alumniPrompt = document.querySelector('#alumniPrompt');

  if (hasApprovedRequest) {
    // Show certificate section and alumni prompt
    // Find first approved or cleared request
    const approvedRequest = requests.find(req => {
      const status = req.overallStatus?.toLowerCase();
      return status === 'approved' || status === 'cleared';
    });
    console.log('Showing certificate section for approved/cleared request:', approvedRequest?.id, 'with status:', approvedRequest?.overallStatus);
    
    if (certificateSection) {
      certificateSection.classList.remove('hidden');
      // Generate QR code with a small delay to ensure DOM is ready
      setTimeout(() => {
        generateQRCode(approvedRequest);
      }, 200);
    } else {
      console.warn('Certificate section element not found');
    }
    
    if (alumniPrompt) {
      alumniPrompt.classList.remove('hidden');
    }
  } else {
    console.log('No approved requests, hiding certificate sections');
    hideCertificateSections();
  }
}

function hideCertificateSections() {
  const certificateSection = document.querySelector('#certificateSection');
  const alumniPrompt = document.querySelector('#alumniPrompt');
  
  if (certificateSection) certificateSection.classList.add('hidden');
  if (alumniPrompt) alumniPrompt.classList.add('hidden');
}

function generateQRCode(approvedRequest) {
  console.log('generateQRCode called with request:', approvedRequest?.id);

  const container = document.querySelector('#qrCodeContainer');
  const studentIdEl = document.querySelector('#qrStudentId');

  if (!container) {
    console.warn('QR code container not found');
    return;
  }

  if (!approvedRequest) {
    console.warn('No approved request provided for QR code generation');
    container.innerHTML = '<p style="color: #666; padding: 20px;">No approved request found.</p>';
    return;
  }

  // Clear existing QR code
  container.innerHTML = '<p style="color: #666; padding: 20px;">Generating QR code...</p>';

  // Prepare readable QR code data for graduation verification
  const studentName = currentProfile?.fullName || approvedRequest.studentName || '';
  const studentId = currentProfile?.studentId || approvedRequest.studentNumber || '';
  const clearedDate = formatDate(approvedRequest.updatedAt || new Date());
  const qrData = `USIU-Africa Clearance Certificate
Student Name: ${studentName}
Student ID: ${studentId}
Status: Cleared for Graduation
Date: ${clearedDate}`;

  console.log('QR code data:', qrData);

  // Update student ID display
  if (studentIdEl) {
    studentIdEl.textContent = studentId || 'N/A';
  }

  // Wait for QRCode library to be available
  if (typeof QRCode === 'undefined' && typeof window.QRCode === 'undefined') {
    console.warn('QRCode library not loaded, retrying in 500ms...');
    setTimeout(() => generateQRCode(approvedRequest), 500);
    return;
  }

  // Generate QR code using qrcode library
  if (typeof QRCode !== 'undefined') {
    const canvas = document.createElement('canvas');
    container.innerHTML = ''; // Clear the loading text
    container.appendChild(canvas);

    QRCode.toCanvas(canvas, qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1A237E',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    }, (error) => {
      if (error) {
        console.error('Error generating QR code:', error);
        container.innerHTML = '<p style="color: red; padding: 20px;">QR code generation failed. Please refresh the page.</p>';
      } else {
        console.log('QR code generated successfully');
      }
    });
  } else {
    // Fallback: use qrcodejs if available
    if (typeof window.QRCode !== 'undefined') {
      try {
        container.innerHTML = ''; // Clear the loading text
        new window.QRCode(container, {
          text: qrData,
          width: 200,
          height: 200,
          colorDark: '#1A237E',
          colorLight: '#ffffff'
        });
        console.log('QR code generated successfully (using qrcodejs)');
      } catch (error) {
        console.error('Error generating QR code:', error);
        container.innerHTML = '<p style="color: red; padding: 20px;">QR code generation failed.</p>';
      }
    } else {
      container.innerHTML = '<p style="color: #666; padding: 20px;">QR code library not loaded. Please refresh the page.</p>';
    }
  }

  if (studentIdEl) {
    studentIdEl.textContent = currentProfile?.studentId || 'N/A';
  }
}

  // Clear existing QR code
  container.innerHTML = '<p style="color: #666; padding: 20px;">Generating QR code...</p>';

  // Generate unique QR code data
  const studentId = currentProfile?.studentId || currentProfile?.student_id || approvedRequest.studentNumber || '';
  const studentUid = currentUser?.uid || approvedRequest.studentUid || '';
  
  const qrData = JSON.stringify({
    studentId: studentId,
    studentUid: studentUid,
    requestId: approvedRequest.id || '',
    status: 'approved',
    clearedDate: approvedRequest.updatedAt || new Date().toISOString(),
    institution: 'USIU-Africa'
  });

  console.log('QR code data:', qrData);

  // Update student ID display
  if (studentIdEl) {
    studentIdEl.textContent = studentId || 'N/A';
  }

  // Wait for QRCode library to be available
  if (typeof QRCode === 'undefined' && typeof window.QRCode === 'undefined') {
    console.warn('QRCode library not loaded, retrying in 500ms...');
    setTimeout(() => generateQRCode(approvedRequest), 500);
    return;
  }

  // Generate QR code using qrcode library
  if (typeof QRCode !== 'undefined') {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    QRCode.toCanvas(canvas, qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1A237E',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    }, (error) => {
      if (error) {
        console.error('Error generating QR code:', error);
        container.innerHTML = '<p style="color: red; padding: 20px;">QR code generation failed. Please refresh the page.</p>';
      } else {
        console.log('QR code generated successfully');
      }
    });
  } else {
    // Fallback: use qrcodejs if available
    if (typeof window.QRCode !== 'undefined') {
      try {
        new window.QRCode(container, {
          text: qrData,
          width: 200,
          height: 200,
          colorDark: '#1A237E',
          colorLight: '#ffffff'
        });
        console.log('QR code generated successfully (using qrcodejs)');
      } catch (error) {
        console.error('Error generating QR code:', error);
        container.innerHTML = '<p style="color: red; padding: 20px;">QR code generation failed.</p>';
      }
    } else {
      container.innerHTML = '<p style="color: #666; padding: 20px;">QR code library not loaded. Please refresh the page.</p>';
    }
  }

  if (studentIdEl) {
    studentIdEl.textContent = currentProfile?.studentId || 'N/A';
  }
}

function printCertificate() {
  const approvedRequest = studentRequests.find(req => req.overallStatus === 'approved');
  if (!approvedRequest) {
    showToast('No approved clearance found.');
    return;
  }

  const printWindow = window.open('', '_blank');
  const qrDataUrl = document.querySelector('#qrCodeContainer canvas')?.toDataURL() || '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clearance Certificate - USIU-Africa</title>
      <style>
        @page { margin: 20mm; }
        body {
          font-family: 'Poppins', Arial, sans-serif;
          margin: 0;
          padding: 40px;
          color: #2c3e50;
        }
        .certificate {
          border: 4px solid #1A237E;
          padding: 40px;
          text-align: center;
          background: white;
        }
        .header {
          color: #1A237E;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
        }
        .header p {
          margin: 5px 0;
          font-size: 16px;
          color: #FDB913;
        }
        .content {
          margin: 40px 0;
        }
        .content h2 {
          color: #1A237E;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .student-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: left;
        }
        .student-info p {
          margin: 8px 0;
          font-size: 14px;
        }
        .status-badge {
          display: inline-block;
          background: #1f9254;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-weight: 600;
          margin: 20px 0;
        }
        .qr-section {
          margin: 30px 0;
        }
        .qr-section img {
          width: 150px;
          height: 150px;
        }
        .footer {
          margin-top: 40px;
          font-size: 12px;
          color: #666;
        }
        .signature {
          margin-top: 40px;
          display: flex;
          justify-content: space-around;
        }
        .signature div {
          text-align: center;
        }
        .signature-line {
          border-top: 2px solid #1A237E;
          width: 200px;
          margin: 40px auto 10px;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">
          <h1>UNITED STATES INTERNATIONAL UNIVERSITY - AFRICA</h1>
          <p>OFFICIAL CLEARANCE CERTIFICATE</p>
        </div>
        <div class="content">
          <h2>CERTIFICATE OF CLEARANCE</h2>
          <p style="font-size: 16px; margin: 20px 0;">
            This is to certify that
          </p>
          <div class="student-info">
            <p><strong>Name:</strong> ${currentProfile?.fullName || 'N/A'}</p>
            <p><strong>Student ID:</strong> ${currentProfile?.studentId || 'N/A'}</p>
            <p><strong>Email:</strong> ${currentUser?.email || 'N/A'}</p>
            <p><strong>Request ID:</strong> ${approvedRequest.id}</p>
            <p><strong>Date Cleared:</strong> ${formatDate(approvedRequest.updatedAt)}</p>
          </div>
          <div class="status-badge">
            ✓ FULLY CLEARED FOR GRADUATION
          </div>
          <p style="margin: 20px 0; font-size: 14px;">
            Has been cleared by all departments (Finance, Library, and Registrar) and is eligible to proceed with graduation.
          </p>
          ${qrDataUrl ? `
          <div class="qr-section">
            <p style="font-size: 12px; margin-bottom: 10px;">Verification QR Code:</p>
            <img src="${qrDataUrl}" alt="QR Code" />
          </div>
          ` : ''}
        </div>
        <div class="signature">
          <div>
            <div class="signature-line"></div>
            <p>Registrar's Office</p>
          </div>
          <div>
            <div class="signature-line"></div>
            <p>Date: ${formatDate(new Date())}</p>
          </div>
        </div>
        <div class="footer">
          <p>This is an official document issued by USIU-Africa</p>
          <p>For verification, scan the QR code above</p>
        </div>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

function downloadCertificate() {
  if (typeof window.jspdf === 'undefined') {
    showToast('PDF library not loaded. Using print instead.');
    printCertificate();
    return;
  }

  const { jsPDF } = window.jspdf;
  const approvedRequest = studentRequests.find(req => req.overallStatus === 'approved');
  
  if (!approvedRequest) {
    showToast('No approved clearance found.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Certificate content
  doc.setFontSize(20);
  doc.setTextColor(26, 35, 126);
  doc.text('UNITED STATES INTERNATIONAL UNIVERSITY - AFRICA', 105, 30, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(253, 185, 19);
  doc.text('OFFICIAL CLEARANCE CERTIFICATE', 105, 40, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(26, 35, 126);
  doc.text('CERTIFICATE OF CLEARANCE', 105, 55, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(44, 62, 80);
  doc.text('This is to certify that', 105, 70, { align: 'center' });

  // Student info box
  doc.setDrawColor(26, 35, 126);
  doc.setFillColor(248, 249, 250);
  doc.rect(20, 80, 170, 50, 'FD');
  
  doc.setFontSize(11);
  doc.text(`Name: ${currentProfile?.fullName || 'N/A'}`, 25, 90);
  doc.text(`Student ID: ${currentProfile?.studentId || 'N/A'}`, 25, 100);
  doc.text(`Email: ${currentUser?.email || 'N/A'}`, 25, 110);
  doc.text(`Request ID: ${approvedRequest.id}`, 25, 120);
  doc.text(`Date Cleared: ${formatDate(approvedRequest.updatedAt)}`, 25, 130);

  // Status badge
  doc.setFillColor(31, 146, 84);
  doc.rect(60, 140, 90, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('✓ FULLY CLEARED FOR GRADUATION', 105, 150, { align: 'center' });

  doc.setTextColor(44, 62, 80);
  doc.setFontSize(10);
  doc.text('Has been cleared by all departments and is eligible to proceed with graduation.', 105, 170, { align: 'center', maxWidth: 160 });

  // QR Code if available
  const qrCanvas = document.querySelector('#qrCodeContainer canvas');
  if (qrCanvas) {
    const qrDataUrl = qrCanvas.toDataURL();
    doc.addImage(qrDataUrl, 'PNG', 85, 180, 40, 40);
    doc.setFontSize(8);
    doc.text('Verification QR Code', 105, 225, { align: 'center' });
  }

  // Footer
  doc.setFontSize(8);
  doc.text('This is an official document issued by USIU-Africa', 105, 260, { align: 'center' });
  doc.text('For verification, scan the QR code above', 105, 265, { align: 'center' });

  // Save PDF
  const fileName = `Clearance_Certificate_${currentProfile?.studentId || 'certificate'}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
  showToast('Certificate downloaded successfully!');
}

function initialiseAdminDashboard() {
  renderAdminHeader();
  setupAdminSignOut();
  setupAdminFilters();
  setupAdminModal();
  subscribeToAdminRequests();
}

function renderAdminHeader() {
  const nameEl = document.querySelector('#adminName');
  if (nameEl) {
    nameEl.textContent = currentProfile?.fullName || currentUser?.email || 'Administrator';
  }
}

function subscribeToAdminRequests() {
  if (adminUnsubscribe) {
    adminUnsubscribe();
  }

  const requestsQuery = query(collection(db, 'clearance_requests'), orderBy('requestDate', 'desc'));

  adminUnsubscribe = onSnapshot(
    requestsQuery,
    (snapshot) => {
      adminRequests = snapshot.docs.map(mapRequest);
      applyAdminFilters();
    },
    (error) => {
      console.error('Failed to load clearance requests:', error);
      showToast('Unable to load clearance requests at the moment.');
    }
  );
}

function applyAdminFilters() {
  const { term, status } = adminFilter;
  const queryTerm = term.toLowerCase();

  const filtered = adminRequests.filter((request) => {
    const matchesQuery =
      request.studentName.toLowerCase().includes(queryTerm) ||
      request.studentNumber.toLowerCase().includes(queryTerm) ||
      request.email.toLowerCase().includes(queryTerm);
    const matchesStatus = status === 'all' || request.overallStatus === status;
    return matchesQuery && matchesStatus;
  });

  renderAdminStats(filtered);
  renderAdminRequests(filtered);
  renderCharts(filtered);
}

function renderAdminStats(requests) {
  const totalEl = document.querySelector('#statTotal');
  const pendingEl = document.querySelector('#statPending');
  const approvedEl = document.querySelector('#statApproved');
  const rejectedEl = document.querySelector('#statRejected');

  const totals = requests.reduce(
    (acc, request) => {
      acc.total += 1;
      acc[request.overallStatus] = (acc[request.overallStatus] || 0) + 1;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0 }
  );

  if (totalEl) totalEl.textContent = totals.total;
  if (pendingEl) pendingEl.textContent = totals.pending || 0;
  if (approvedEl) approvedEl.textContent = totals.approved || 0;
  if (rejectedEl) rejectedEl.textContent = totals.rejected || 0;
}

function renderAdminRequests(requests) {
  const container = document.querySelector('#adminRequestList');
  const emptyState = document.querySelector('#adminEmptyState');

  if (!container || !emptyState) return;

  container.innerHTML = '';

  if (!requests.length) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  requests.forEach((request) => {
    const card = document.createElement('article');
    card.className = 'request-card admin-card';
    card.dataset.requestId = request.id;
    card.innerHTML = `
      <header class="request-header">
        <div>
          <h3>${request.studentName || 'Unknown Student'}</h3>
          <p class="badge">Student ID: ${request.studentNumber || 'N/A'}</p>
          <p>${request.email || 'No email recorded'}</p>
          <p>Requested on <strong>${formatDate(request.requestDate)}</strong></p>
        </div>
        <span class="status-pill ${mapStatusPill(request.overallStatus)}">
          <i data-lucide="${mapStatusIcon(request.overallStatus)}"></i>
          <span>${formatStatus(request.overallStatus)}</span>
        </span>
      </header>
      <div class="request-details">
        ${renderStudentStatus('Finance', request.feeStatus)}
        ${renderStudentStatus('Library', request.libraryStatus, true)}
        ${renderStudentStatus('Registrar', request.registrarStatus)}
      </div>
      ${renderHoldsSummary(request.holds, true)}
      <div class="divider"></div>
      <p>${request.comments || 'No comments yet.'}</p>
    `;
    container.appendChild(card);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setupAdminFilters() {
  const searchInput = document.querySelector('#adminSearch');
  const statusSelect = document.querySelector('#adminStatusFilter');

  searchInput?.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    adminFilter.term = event.target.value;
    applyAdminFilters();
  });

  statusSelect?.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLSelectElement)) return;
    adminFilter.status = event.target.value;
    applyAdminFilters();
  });
}

function setupAdminModal() {
  const modal = document.querySelector('#adminModal');
  if (!modal) return;

  const selectIds = ['modalFeeStatus', 'modalLibraryStatus', 'modalRegistrarStatus'];
  selectIds.forEach((id) => {
    const select = modal.querySelector(`#${id}`);
    if (!(select instanceof HTMLSelectElement)) return;
    select.innerHTML = statusOptions
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join('');
  });

  const holdDepartmentSelect = modal.querySelector('#holdDepartment');
  if (holdDepartmentSelect instanceof HTMLSelectElement) {
    holdDepartmentSelect.innerHTML = holdDepartmentOptions
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join('');
  }

  resetHoldForm();

  const holdReasonInput = modal.querySelector('#holdReason');
  const holdDescriptionInput = modal.querySelector('#holdDescription');
  const addHoldButton = modal.querySelector('#addHoldButton');

  addHoldButton?.addEventListener('click', () => {
    if (!(holdDepartmentSelect instanceof HTMLSelectElement)) return;
    if (!(holdReasonInput instanceof HTMLInputElement)) return;

    const reason = holdReasonInput.value.trim();
    const description = holdDescriptionInput instanceof HTMLTextAreaElement ? holdDescriptionInput.value.trim() : '';

    if (!reason) {
      showToast('Hold reason is required.');
      return;
    }

    const newHold = normaliseHold({
      id: generateId('hold'),
      department: holdDepartmentSelect.value,
      reason,
      description,
      resolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    currentModalHolds.push(newHold);
    if (holdReasonInput instanceof HTMLInputElement) {
      holdReasonInput.value = '';
    }
    if (holdDescriptionInput instanceof HTMLTextAreaElement) {
      holdDescriptionInput.value = '';
    }
    renderHoldEditor();
  });

  const closeButtons = modal.querySelectorAll('[data-close="admin-modal"]');
  closeButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      modal.classList.remove('active');
      currentModalHolds = [];
      resetHoldForm();
    })
  );

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.classList.remove('active');
      currentModalHolds = [];
      resetHoldForm();
    }
  });

  const container = document.querySelector('#adminRequestList');
  container?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const card = target.closest('.admin-card');
    if (!card) return;
    const request = adminRequests.find((item) => item.id === card.dataset.requestId);
    if (request) {
      openAdminModal(request);
    }
  });

  const form = modal.querySelector('#adminModalForm');
  form?.addEventListener('submit', handleAdminModalSubmit);
}

function openAdminModal(request) {
  const modal = document.querySelector('#adminModal');
  if (!modal) return;

  modal.classList.add('active');
  modal.dataset.requestId = request.id;

  modal.querySelector('#modalStudentName').textContent = request.studentName || 'Unknown Student';
  modal.querySelector('#modalStudentId').textContent = request.studentNumber || 'N/A';
  modal.querySelector('#modalStudentEmail').textContent = request.email || 'No email recorded';
  modal.querySelector('#modalRequestDate').textContent = formatDate(request.requestDate);

  const financeNote = modal.querySelector('#financeNote');
  const libraryNote = modal.querySelector('#libraryNote');
  const registrarNote = modal.querySelector('#registrarNote');
  const notes = request.departmentNotes || {};

  if (financeNote) financeNote.textContent = notes.finance || '';
  if (libraryNote) libraryNote.textContent = notes.library || '';
  if (registrarNote) registrarNote.textContent = notes.registrar || '';

  const feeSelect = modal.querySelector('#modalFeeStatus');
  const librarySelect = modal.querySelector('#modalLibraryStatus');
  const registrarSelect = modal.querySelector('#modalRegistrarStatus');
  const commentInput = modal.querySelector('#modalComments');

  if (feeSelect instanceof HTMLSelectElement) feeSelect.value = request.feeStatus;
  if (librarySelect instanceof HTMLSelectElement) librarySelect.value = request.libraryStatus;
  if (registrarSelect instanceof HTMLSelectElement) registrarSelect.value = request.registrarStatus;
  if (commentInput instanceof HTMLTextAreaElement) commentInput.value = request.comments || '';

  currentModalHolds = (request.holds || []).map((hold) => ({ ...hold }));
  renderHoldEditor();
  resetHoldForm();

  const overallBadge = modal.querySelector('#modalOverallStatus');
  if (overallBadge) {
    overallBadge.className = `status-pill ${mapStatusPill(request.overallStatus)}`;
    overallBadge.innerHTML = `
      <i data-lucide="${mapStatusIcon(request.overallStatus)}"></i>
      <span>${formatStatus(request.overallStatus)}</span>
    `;
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function handleAdminModalSubmit(event) {
  event.preventDefault();
  const modal = document.querySelector('#adminModal');
  if (!modal) return;

  const requestId = modal.dataset.requestId;
  if (!requestId) return;

  const feeSelect = modal.querySelector('#modalFeeStatus');
  const librarySelect = modal.querySelector('#modalLibraryStatus');
  const registrarSelect = modal.querySelector('#modalRegistrarStatus');
  const commentInput = modal.querySelector('#modalComments');
  const submitButton = modal.querySelector('button[type="submit"]');

  if (!(submitButton instanceof HTMLButtonElement)) return;

  const feeStatus = feeSelect instanceof HTMLSelectElement ? feeSelect.value : 'pending';
  const libraryStatus = librarySelect instanceof HTMLSelectElement ? librarySelect.value : 'pending';
  const registrarStatus = registrarSelect instanceof HTMLSelectElement ? registrarSelect.value : 'pending';
  const comments = commentInput instanceof HTMLTextAreaElement ? commentInput.value.trim() : '';

  const overallStatus = computeOverallStatus(feeStatus, libraryStatus, registrarStatus);
  const holdsPayload = currentModalHolds.map(serializeHold);

  submitButton.disabled = true;
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Saving...';

  try {
    await updateDoc(doc(db, 'clearance_requests', requestId), {
      feeStatus,
      libraryStatus,
      registrarStatus,
      comments,
      overallStatus,
      holds: holdsPayload,
      updatedAt: serverTimestamp()
    });
    showToast('Request updated successfully.');
    modal.classList.remove('active');
    currentModalHolds = [];
    resetHoldForm();
  } catch (error) {
    console.error('Failed to update request:', error);
    showToast('Failed to update request. Please try again.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

function renderCharts(requests) {
  if (typeof Chart === 'undefined') return;

  const statusCtx = document.querySelector('#statusChart');
  const trendCtx = document.querySelector('#trendChart');
  const departmentCtx = document.querySelector('#departmentChart');

  if (charts.status) {
    charts.status.destroy();
    charts.status = null;
  }
  if (charts.trend) {
    charts.trend.destroy();
    charts.trend = null;
  }
  if (charts.department) {
    charts.department.destroy();
    charts.department = null;
  }

  if (statusCtx) {
    const statusCounts = requests.reduce(
      (acc, request) => {
        acc[request.overallStatus] = (acc[request.overallStatus] || 0) + 1;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 }
    );

    charts.status = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Approved', 'Pending', 'Rejected'],
        datasets: [
          {
            data: [statusCounts.approved || 0, statusCounts.pending || 0, statusCounts.rejected || 0],
            backgroundColor: ['#1f9254', palette.gold, '#c0392b'],
            borderWidth: 0,
            hoverOffset: 12
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: palette.text,
              usePointStyle: true
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  if (trendCtx) {
    const months = getLastMonths(6);
    const requestsPerMonth = new Map();
    const approvalsPerMonth = new Map();

    requests.forEach((request) => {
      const key = formatMonthKey(request.requestDate);
      requestsPerMonth.set(key, (requestsPerMonth.get(key) || 0) + 1);
      if (request.overallStatus === 'approved') {
        approvalsPerMonth.set(key, (approvalsPerMonth.get(key) || 0) + 1);
      }
    });

    const labels = months.map((month) => month.label);
    const newRequests = months.map((month) => requestsPerMonth.get(month.key) || 0);
    const approvals = months.map((month) => approvalsPerMonth.get(month.key) || 0);

    charts.trend = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'New Requests',
            data: newRequests,
            borderColor: palette.lightBlue,
            backgroundColor: 'rgba(35, 63, 144, 0.12)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: palette.lightBlue
          },
          {
            label: 'Approvals',
            data: approvals,
            borderColor: palette.gold,
            backgroundColor: 'rgba(253, 185, 19, 0.16)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: palette.gold
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: palette.text },
            grid: { color: 'rgba(26, 35, 126, 0.05)' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: palette.text, precision: 0 },
            grid: { color: 'rgba(26, 35, 126, 0.08)' }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: palette.text, usePointStyle: true }
          }
        }
      }
    });
  }

  if (departmentCtx) {
    const departmentTotals = {
      finance: { cleared: 0, pending: 0, not_cleared: 0 },
      library: { cleared: 0, pending: 0, not_cleared: 0 },
      registrar: { cleared: 0, pending: 0, not_cleared: 0 }
    };

    requests.forEach((request) => {
      incrementDepartmentStatus(departmentTotals.finance, request.feeStatus);
      incrementDepartmentStatus(departmentTotals.library, request.libraryStatus);
      incrementDepartmentStatus(departmentTotals.registrar, request.registrarStatus);
    });

    charts.department = new Chart(departmentCtx, {
      type: 'bar',
      data: {
        labels: ['Finance', 'Library', 'Registrar'],
        datasets: [
          {
            label: 'Cleared',
            data: [
              departmentTotals.finance.cleared,
              departmentTotals.library.cleared,
              departmentTotals.registrar.cleared
            ],
            backgroundColor: 'rgba(31, 146, 84, 0.88)',
            borderRadius: 10,
            maxBarThickness: 36
          },
          {
            label: 'Pending',
            data: [
              departmentTotals.finance.pending,
              departmentTotals.library.pending,
              departmentTotals.registrar.pending
            ],
            backgroundColor: 'rgba(253, 185, 19, 0.78)',
            borderRadius: 10,
            maxBarThickness: 36
          },
          {
            label: 'Not Cleared',
            data: [
              departmentTotals.finance.not_cleared,
              departmentTotals.library.not_cleared,
              departmentTotals.registrar.not_cleared
            ],
            backgroundColor: 'rgba(192, 57, 43, 0.82)',
            borderRadius: 10,
            maxBarThickness: 36
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: palette.text, usePointStyle: true }
          }
        },
        scales: {
          x: {
            ticks: { color: palette.text },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: palette.text, precision: 0 },
            grid: { color: 'rgba(26, 35, 126, 0.08)' }
          }
        }
      }
    });
  }
}

function mapRequest(docSnapshot) {
  const data = docSnapshot.data() || {};
  const feeStatus = normaliseDepartmentStatus(data.feeStatus);
  const libraryStatus = normaliseDepartmentStatus(data.libraryStatus);
  const registrarStatus = normaliseDepartmentStatus(data.registrarStatus);
  
  // Always recalculate overallStatus to ensure accuracy
  // Only use stored overallStatus if it's explicitly set by admin
  let overallStatus = computeOverallStatus(feeStatus, libraryStatus, registrarStatus);
  
  // If there are unresolved holds, the status should be 'rejected' or 'pending'
  const holds = Array.isArray(data.holds) ? data.holds.map(normaliseHold) : [];
  const hasUnresolvedHolds = holds.some(h => !h.resolved);
  
  if (hasUnresolvedHolds && (overallStatus === 'approved' || overallStatus === 'cleared')) {
    // If there are unresolved holds, cannot be approved
    overallStatus = 'rejected';
  }
  
  // Allow admin-set overallStatus to override
  // Normalize "cleared" to "approved" for consistency
  if (data.overallStatus) {
    const storedStatus = normaliseOverallStatus(data.overallStatus);
    // If admin explicitly set it, use that (but normalize cleared to approved)
    if (storedStatus === 'cleared') {
      overallStatus = 'approved';
    } else if (storedStatus !== 'pending') {
      overallStatus = storedStatus;
    }
  }

  return {
    id: docSnapshot.id,
    studentUid: data.studentUid || '',
    studentName: data.studentName || data.student_profile?.full_name || '',
    studentNumber: data.studentNumber || data.student_profile?.student_id || '',
    email: data.email || '',
    requestDate: toDate(data.requestDate),
    updatedAt: toDate(data.updatedAt, toDate(data.requestDate)),
    overallStatus,
    feeStatus,
    libraryStatus,
    registrarStatus,
    comments: data.comments || '',
    departmentNotes: data.departmentNotes || {},
    holds
  };
}

function normaliseDepartmentStatus(status) {
  if (!status || typeof status !== 'string') return 'pending';
  const normalized = status.toLowerCase().trim();
  if (normalized === 'cleared' || normalized === 'approved') return 'cleared';
  if (normalized === 'not_cleared' || normalized === 'rejected' || normalized === 'not cleared') return 'not_cleared';
  return 'pending';
}

function normaliseOverallStatus(status) {
  if (!status || typeof status !== 'string') return 'pending';
  const normalized = status.toLowerCase().trim();
  // Treat both "approved" and "cleared" as "approved" for consistency
  if (normalized === 'approved' || normalized === 'cleared') return 'approved';
  if (normalized === 'rejected' || normalized === 'not_cleared' || normalized === 'not cleared') return 'rejected';
  return 'pending';
}

const holdDepartmentLabelMap = holdDepartmentOptions.reduce((map, option) => {
  map[option.value] = option.label;
  return map;
}, {});

function normaliseHold(hold) {
  const created = toDate(hold?.createdAt, new Date());
  const updated = toDate(hold?.updatedAt, created);

  return {
    id: hold?.id || generateId('hold'),
    department: holdDepartmentLabelMap[hold?.department] ? hold.department : 'finance',
    reason: hold?.reason || 'Pending clearance issue',
    description: hold?.description || '',
    resolved: Boolean(hold?.resolved),
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString()
  };
}

function serializeHold(hold) {
  return {
    id: hold.id,
    department: hold.department,
    reason: hold.reason,
    description: hold.description,
    resolved: hold.resolved,
    createdAt: hold.createdAt,
    updatedAt: new Date().toISOString()
  };
}

function generateId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDepartmentLabel(value) {
  return holdDepartmentLabelMap[value] || value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function computeOverallStatus(feeStatus, libraryStatus, registrarStatus) {
  // Normalize all statuses first
  const normalizedFee = normaliseDepartmentStatus(feeStatus);
  const normalizedLibrary = normaliseDepartmentStatus(libraryStatus);
  const normalizedRegistrar = normaliseDepartmentStatus(registrarStatus);
  
  const statuses = [normalizedFee, normalizedLibrary, normalizedRegistrar];
  
  console.log('Computing overall status:', {
    feeStatus: feeStatus,
    libraryStatus: libraryStatus,
    registrarStatus: registrarStatus,
    normalized: statuses
  });
  
  // All departments must be cleared for approval
  if (statuses.every((status) => status === 'cleared')) {
    console.log('All departments cleared - status: approved');
    return 'approved'; // Return 'approved' (not 'cleared') for consistency
  }
  
  // If any department is not cleared, it's rejected
  if (statuses.some((status) => status === 'not_cleared')) {
    console.log('Some departments not cleared - status: rejected');
    return 'rejected';
  }
  
  // Otherwise, it's pending
  console.log('Some departments pending - status: pending');
  return 'pending';
}

function mapStatusPill(status) {
  switch (status) {
    case 'approved':
    case 'cleared':
      return 'approved';
    case 'not_cleared':
    case 'rejected':
      return 'rejected';
    case 'pending':
    default:
      return 'pending';
  }
}

function mapStatusIcon(status) {
  switch (status) {
    case 'approved':
    case 'cleared':
      return 'check-circle';
    case 'not_cleared':
    case 'rejected':
      return 'x-circle';
    case 'pending':
    default:
      return 'clock';
  }
}

function formatStatus(status) {
  return status.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDate(value, fallback = new Date()) {
  if (!value) return fallback;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return fallback;
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function formatDate(value) {
  const date = toDate(value);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getLastMonths(count) {
  const results = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    results.push({
      key: formatMonthKey(date),
      label: date.toLocaleDateString(undefined, { month: 'short' })
    });
  }
  return results;
}

function formatMonthKey(value) {
  const date = toDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function incrementDepartmentStatus(container, status) {
  const key = normaliseDepartmentStatus(status);
  container[key] = (container[key] || 0) + 1;
}

function showToast(message) {
  let toast = document.querySelector('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

async function fetchProfile(uid) {
  try {
    const snapshot = await getDoc(doc(db, 'profiles', uid));
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }
  return null;
}

function redirectAfterLogin(profile) {
  if (!profile) return;
  window.location.href = profile.role === 'admin' ? 'admin.html' : 'student.html';
}

function redirectHome() {
  window.location.href = 'index.html';
}

function updateHomeAuthUI() {
  const loginButtons = document.querySelectorAll('[data-action="open-login"]');
  loginButtons.forEach((button) => {
    if (!(button instanceof HTMLAnchorElement || button instanceof HTMLButtonElement)) return;

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent?.trim() || 'Log In';
    }

    // Ensure click handler is set up (in case setupHomeButtons() hasn't run yet)
    if (!button.hasAttribute('data-handler-setup')) {
      button.setAttribute('data-handler-setup', 'true');
      button.onclick = null; // Remove any existing onclick
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (currentUser && currentProfile) {
          redirectAfterLogin(currentProfile);
        } else {
          openLoginModal();
        }
      });
    }

    // Update button text based on auth state
    if (currentUser && currentProfile) {
      button.textContent =
        currentProfile.role === 'admin' ? 'Go to Admin Dashboard' : 'Go to Student Dashboard';
    } else {
      button.textContent = button.dataset.defaultLabel;
    }
  });
}

function setupStudentSignOut() {
  const signOutButton = document.querySelector('#studentSignOut');
  signOutButton?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      redirectHome();
    } catch (error) {
      console.error('Failed to sign out:', error);
      showToast('Failed to sign out. Please try again.');
    }
  });
}

function setupAdminSignOut() {
  const signOutButton = document.querySelector('#adminSignOut');
  signOutButton?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      redirectHome();
    } catch (error) {
      console.error('Failed to sign out:', error);
      showToast('Failed to sign out. Please try again.');
    }
  });
}

function renderHoldsSummary(holds, includeResolvedNote = false) {
  if (!Array.isArray(holds) || holds.length === 0) {
    return '';
  }

  const active = holds.filter((hold) => !hold.resolved);
  const resolved = holds.filter((hold) => hold.resolved);

  let html = '<div class="holds-summary">';
  html += '<h4 class="holds-summary-title">Holds</h4>';

  if (active.length) {
    html += '<div class="chips">';
    active.forEach((hold) => {
      html += `<span class="chip gold" title="${escapeHtml(hold.description)}">${escapeHtml(
        formatDepartmentLabel(hold.department)
      )} — ${escapeHtml(hold.reason)}</span>`;
    });
    html += '</div>';
  } else if (includeResolvedNote) {
    html += '<p class="holds-empty">No active holds.</p>';
  }

  if (includeResolvedNote && resolved.length) {
    html += `<p class="holds-resolved-note">${resolved.length} resolved hold${resolved.length === 1 ? '' : 's'} on record.</p>`;
  }

  html += '</div>';
  return html;
}

function renderHoldEditor() {
  const modal = document.querySelector('#adminModal');
  const container = modal?.querySelector('#holdsTable');
  if (!container) return;

  container.innerHTML = '';

  if (!currentModalHolds.length) {
    container.innerHTML = '<p class="holds-empty">No holds recorded for this student.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'holds-table-grid';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Department', 'Reason', 'Description', 'Status', 'Actions'].forEach((heading) => {
    const th = document.createElement('th');
    th.textContent = heading;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  [...currentModalHolds]
    .sort((a, b) => Number(a.resolved) - Number(b.resolved))
    .forEach((hold) => {
      const row = document.createElement('tr');
      row.dataset.holdId = hold.id;

      const departmentCell = document.createElement('td');
      const departmentSelect = document.createElement('select');
      holdDepartmentOptions.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        departmentSelect.appendChild(opt);
      });
      departmentSelect.value = hold.department;
      departmentSelect.addEventListener('change', () => {
        hold.department = departmentSelect.value;
        hold.updatedAt = new Date().toISOString();
      });
      departmentCell.appendChild(departmentSelect);
      row.appendChild(departmentCell);

      const reasonCell = document.createElement('td');
      const reasonInput = document.createElement('input');
      reasonInput.type = 'text';
      reasonInput.value = hold.reason;
      reasonInput.addEventListener('input', () => {
        hold.reason = reasonInput.value;
        hold.updatedAt = new Date().toISOString();
      });
      reasonCell.appendChild(reasonInput);
      row.appendChild(reasonCell);

      const descriptionCell = document.createElement('td');
      const descriptionTextarea = document.createElement('textarea');
      descriptionTextarea.value = hold.description;
      descriptionTextarea.addEventListener('input', () => {
        hold.description = descriptionTextarea.value;
        hold.updatedAt = new Date().toISOString();
      });
      descriptionCell.appendChild(descriptionTextarea);
      row.appendChild(descriptionCell);

      const statusCell = document.createElement('td');
      const statusBadge = document.createElement('span');
      statusBadge.className = `hold-status${hold.resolved ? ' resolved' : ''}`;
      statusBadge.textContent = hold.resolved ? 'Resolved' : 'Active';
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      const actionsCell = document.createElement('td');
      actionsCell.className = 'hold-actions';
      const toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.className = 'btn btn-secondary';
      toggleButton.textContent = hold.resolved ? 'Mark Active' : 'Mark Resolved';
      toggleButton.addEventListener('click', () => {
        hold.resolved = !hold.resolved;
        hold.updatedAt = new Date().toISOString();
        renderHoldEditor();
      });

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        currentModalHolds = currentModalHolds.filter((item) => item.id !== hold.id);
        renderHoldEditor();
      });

      actionsCell.append(toggleButton, removeButton);
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

  table.appendChild(tbody);
  container.appendChild(table);
}

function resetHoldForm() {
  const modal = document.querySelector('#adminModal');
  const departmentSelect = modal?.querySelector('#holdDepartment');
  const reasonInput = modal?.querySelector('#holdReason');
  const descriptionInput = modal?.querySelector('#holdDescription');

  if (departmentSelect instanceof HTMLSelectElement) {
    departmentSelect.value = departmentSelect.options[0]?.value || 'finance';
  }
  if (reasonInput instanceof HTMLInputElement) {
    reasonInput.value = '';
  }
  if (descriptionInput instanceof HTMLTextAreaElement) {
    descriptionInput.value = '';
  }
}


