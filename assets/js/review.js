// review.js – Supabase review handling & star rating

// Load Supabase client from CDN (supabase-js v2)
const SUPABASE_URL = "https://ggtphjckjvdyjztzzqik.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdndHBoamNranZkeWp6dHp6cWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTA1MTAsImV4cCI6MjEwMjQ2NjUxMH0.kpL41mBRdYer8WCIJzhzhzI6IAfUcDdEdjIIA0W2XXE";

// Initialise Supabase client (global `supabase` from CDN script)
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Load existing reviews from Supabase and render them */
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

/** Submit a new review to Supabase */
async function submitReview(event) {
  event.preventDefault();
  const name = document.getElementById('review-name').value.trim();
  const rating = parseInt(document.getElementById('review-rating').value, 10);
  const comment = document.getElementById('review-comment').value.trim();

  if (!name || !rating || !comment) {
    alert('Harap isi semua bidang.');
    return;
  }

  const { error } = await supabase
    .from('reviews')
    .insert({ name, rating, comment });

  if (error) {
    console.error('Submit error:', error);
    alert('Gagal mengirim review.');
  } else {
    alert('Review berhasil dikirim!');
    // Reset form & star UI
    document.getElementById('review-form').reset();
    resetStars();
    loadReviews();
  }
}

/** Star rating UI – click to set rating */
function resetStars() {
  const stars = document.querySelectorAll('.review-form .star-rating .fa-star');
  stars.forEach(s => s.classList.remove('active'));
  document.getElementById('review-rating').value = '';
}

function initStarRating() {
  const stars = document.querySelectorAll('.review-form .star-rating .fa-star');
  const ratingInput = document.getElementById('review-rating');

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value, 10);
      ratingInput.value = val;
      // Activate selected and all lower-value stars (left‑to‑right visual)
      stars.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.value, 10) <= val);
      });
    });
  });
}

/** Initialise listeners on page load */
window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('review-form');
  if (form) form.addEventListener('submit', submitReview);

  initStarRating();
  loadReviews();
});
