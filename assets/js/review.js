// review.js – Supabase reviews + star rating (sync with CDN)
// Script ini mengandalkan skrip CDN: supabase-js@2 dari package supabase

const SUPABASE_URL = "https://ggtphjckjvdyjztzzqik.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdndHBoamNranZkeWp6dHp6cWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTA1MTAsImV4cCI6MjEwMjQ2NjUxMH0.kpL41mBRdYer8WCIJzhzhzI6IAfUcDdEdjIIA0W2XXE";

// Pastikan instance SupabaseClient tersedia (gunakan global dari CDN, atau buat sendiri)
if (!window.supabase) {
  window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Load existing reviews from Supabase
 */
async function loadReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  const container = document.getElementById('reviews-list');
  if (!container) return;
  container.innerHTML = '';

  if (error) {
    console.error('Error loading reviews:', error);
    container.innerHTML = '<p>Gagal memuat review.</p>';
    return;
  }

  data.forEach(r => {
    const div = document.createElement('div');
    div.className = 'review-item';
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    div.innerHTML = `<strong>${r.name}</strong> <span class="review-stars">${stars}</span><p>${r.comment}</p>`;
    container.appendChild(div);
  });
}

/**
 * Submit a new review
 */
async function submitReview(event) {
  event.preventDefault();
  const form = event.target;
  const name = form['review-name']?.value.trim();
  const ratingInput = form['review-rating'];
  const rating = ratingInput ? parseInt(ratingInput.value, 10) : null;
  const comment = form['review-comment']?.value.trim();

  if (!name || !rating || !ratingInput || !comment) {
    alert('Harap isi semua bidang');
    return;
  }

  const { error } = await supabase
    .from('reviews')
    .insert({ name, rating, comment });

  if (error) {
    console.error('Submit error:', error);
    alert('Gagal mengirim review');
  } else {
    alert('Review berhasil dikirim');
    form.reset();
    resetStars();
    loadReviews();
  }
}

/**
 * Star rating UI – click to set rating
 */
function resetStars() {
  const stars = document.querySelectorAll('.review-form .star-rating .fa-star');
  stars.forEach(s => s.classList.remove('active'));
  const ratingInput = document.getElementById('review-rating');
  if (ratingInput) ratingInput.value = '';
}

function initStarRating() {
  const stars = document.querySelectorAll('.review-form .star-rating .fa-star');
  const ratingInput = document.getElementById('review-rating');

  if (!stars.length || !ratingInput) return;

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value, 10);
      ratingInput.value = val;
      stars.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.value, 10) <= val);
      });
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('review-form');
  if (form) form.addEventListener('submit', submitReview);

  initStarRating();
  loadReviews();
});